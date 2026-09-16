revoke all on function public.add_verification_evidence(text,text,text,text) from anon;
revoke all on function public.is_verified_member() from anon;
revoke all on function public.my_verification() from anon;
revoke all on function public.purge_verification_proof() from anon;
revoke all on function public.review_member_verification(uuid,text,text,text,text,text) from anon;
revoke all on function public.submit_member_verification(text,text,text,text,text,text,text,text,text,text,text) from anon;