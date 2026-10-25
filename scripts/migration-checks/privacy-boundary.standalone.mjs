// Disposable regression against the observed legacy permissive policy shapes.
// No production data, credentials, network calls or migration ledgers are used.
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
const db = new PGlite()
const A='00000000-0000-0000-0000-000000000001', B='00000000-0000-0000-0000-000000000002'
let passed=0
function ok(value,label) { if(!value) throw Error(label); passed++; console.log('PASS',label) }
const as=async(uid,sql)=>{
  await db.exec('BEGIN')
  try {
    await db.query(`select set_config('request.jwt.claim.sub',$1,true)`,[uid??''])
    await db.exec(`SET LOCAL ROLE ${uid?'authenticated':'anon'}`)
    return {rows:(await db.query(sql)).rows}
  } catch(error) { return {error} } finally {await db.exec('ROLLBACK')}
}
try {
  await db.exec(`
    CREATE ROLE authenticated; CREATE ROLE anon;
    CREATE SCHEMA auth; CREATE SCHEMA storage;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    GRANT USAGE ON SCHEMA public,auth,storage TO authenticated,anon;
    CREATE FUNCTION public.is_live_member() RETURNS boolean LANGUAGE sql STABLE AS $$SELECT auth.uid() IS NOT NULL$$;
    CREATE TABLE public.posts(id text primary key,author_id uuid,visibility text,media jsonb default '[]');
    CREATE TABLE public.post_comments(id text primary key,post_id text,author_id uuid,text text);
    CREATE TABLE public.post_reactions(id text primary key,post_id text,user_id uuid);
    CREATE TABLE storage.objects(id text primary key,bucket_id text,name text);
    ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
    GRANT SELECT,INSERT,UPDATE,DELETE ON public.posts,public.post_comments,public.post_reactions,storage.objects TO authenticated;
    CREATE POLICY legacy_posts_read ON public.posts FOR SELECT TO authenticated USING(public.is_live_member());
    CREATE POLICY owner_posts ON public.posts FOR ALL TO authenticated USING(author_id=auth.uid()) WITH CHECK(author_id=auth.uid());
    CREATE POLICY legacy_comments ON public.post_comments FOR SELECT TO authenticated USING(public.is_live_member());
    CREATE POLICY own_comments ON public.post_comments FOR ALL TO authenticated USING(author_id=auth.uid()) WITH CHECK(author_id=auth.uid());
    CREATE POLICY legacy_reactions ON public.post_reactions FOR SELECT TO authenticated USING(public.is_live_member());
    CREATE POLICY own_reactions ON public.post_reactions FOR ALL TO authenticated USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());
    CREATE POLICY legacy_journal_read ON storage.objects FOR SELECT TO authenticated USING(bucket_id='journal' AND public.is_live_member());
    CREATE POLICY other_bucket_read ON storage.objects FOR SELECT TO authenticated USING(bucket_id='other');
    INSERT INTO public.posts VALUES
      ('private','${A}','private','[{"path":"${A}/private.pdf"}]'),
      ('network','${A}','network','[{"path":"${A}/shared.pdf"}]'),
      ('forged','${B}','network','[{"path":"${A}/private.pdf"}]');
    INSERT INTO public.post_comments VALUES('private-comment','private','${A}','private'),('shared-comment','network','${A}','shared');
    INSERT INTO public.post_reactions VALUES('private-reaction','private','${A}'),('shared-reaction','network','${A}');
    INSERT INTO storage.objects VALUES('private-file','journal','${A}/private.pdf'),('shared-file','journal','${A}/shared.pdf'),('draft-file','journal','${A}/draft.pdf'),('other-file','other','other');
  `)
  ok((await as(B,`select id from posts where id='private'`)).rows.length===1,'legacy policy reproduction exposes the private fixture before the guard')
  const migration = readFileSync(new URL('../../supabase/migrations/20261025150218_privacy_boundary_guards.sql',import.meta.url),'utf8')
  await db.exec(migration)
  await db.exec(migration) // A later deployment can reconcile this exact forward repair safely.
  ok((await as(B,`select id from posts where id='private'`)).rows.length===0,'another member cannot read private posts')
  ok((await as(A,`select id from posts where id='private'`)).rows.length===1,'the author retains private posts')
  ok((await as(B,`select id from posts where id='network'`)).rows.length===1,'network posts remain shared')
  ok(!!(await as(null,'select id from posts')).error,'anonymous reads remain denied')
  ok((await as(B,`select id from post_comments where post_id='private'`)).rows.length===0,'private comments stay hidden')
  ok((await as(B,`select id from post_reactions where post_id='private'`)).rows.length===0,'private reactions stay hidden')
  ok((await as(B,`select id from post_comments where post_id='network'`)).rows.length===1,'network comments remain visible')
  ok(!!(await as(B,`insert into post_comments values('attack','private','${B}','injected')`)).error,'comments cannot target another member private post')
  ok(!!(await as(B,`insert into post_reactions values('attack','private','${B}')`)).error,'reactions cannot target another member private post')
  ok(!(await as(B,`insert into post_comments values('allowed','network','${B}','shared')`)).error,'network commenting remains permitted')
  ok((await as(B,`select id from storage.objects where id='private-file'`)).rows.length===0,'a forged attachment reference does not expose an owner private file')
  ok((await as(B,`select id from storage.objects where id='draft-file'`)).rows.length===0,'unpublished files stay private')
  ok((await as(A,`select id from storage.objects where id='draft-file'`)).rows.length===1,'owners can read their unposted uploads')
  ok((await as(B,`select id from storage.objects where id='shared-file'`)).rows.length===1,'the owner network post shares its attachment')
  ok((await as(B,`select id from storage.objects where id='other-file'`)).rows.length===1,'other bucket permissions are unchanged')
  console.log(`${passed} privacy boundary assertions passed`)
} finally {await db.close()}
