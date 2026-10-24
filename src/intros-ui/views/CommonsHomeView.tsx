import { useState, type ReactNode } from "react";
import { ArrowRight, Bookmark, CheckCircle2, MessageCircle, Sparkles } from "lucide-react";
import type { FeedPost, IntroRequest, NetworkMember } from "../networkData";
import type { ActivePage } from "../components/layout/TopNavigation";
import { AvatarImage } from "@/aetheris/avatar";

export function CommonsAvatar({
  member,
  name,
}: {
  member?: NetworkMember | undefined;
  name: string;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <span className="commons-avatar" onErrorCapture={() => setFailed(true)}>
      {member?.avatarUrl && !failed ? (
        <AvatarImage source={member.avatarUrl} alt={name} />
      ) : (
        name
          .split(" ")
          .map((p) => p[0])
          .join("")
          .slice(0, 2)
      )}
    </span>
  );
}

export function CommonsHomeView({
  posts,
  children,
  social = true,
  draft,
  onDraftChange,
  members,
  requests,
  isLive,
  me,
  actionQueue,
  onNavigate,
  onWorkspace,
  onRequestIntro,
  onReview,
  onAddPost,
  onLike,
  onSave,
}: {
  posts: FeedPost[];
  children?: ReactNode;
  social?: boolean;
  draft: string;
  onDraftChange: (value: string) => void;
  members: NetworkMember[];
  requests: IntroRequest[];
  isLive: boolean;
  me: { name: string; avatarUrl?: string } | null;
  actionQueue?: ReactNode;
  onNavigate: (page: ActivePage, id?: string) => void;
  onWorkspace: (page: string) => void;
  onRequestIntro: (member: NetworkMember) => void;
  onReview: (request: IntroRequest) => void;
  onAddPost: (content: string, badge?: FeedPost["badge"]) => void;
  onLike: (id: string) => void;
  onSave: (id: string) => void;
}) {
  const [tab, setTab] = useState("Everything");
  const setDraft = onDraftChange;
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [replies, setReplies] = useState<Record<string, string[]>>({});
  const pending = requests.filter((r) => r.status === "pending");
  const ask = (prompt?: string) =>
    window.dispatchEvent(new CustomEvent("aetheris:open-assistant", { detail: prompt }));
  return (
    <div className="commons-home">
      <div className="commons-welcome">
        <div>
          <span className="commons-eyebrow">YOUR NETWORK, AT A HUMAN PACE</span>
          <h1>Today, in good company.</h1>
          <p>A little context. A useful conversation. Your next introduction.</p>
        </div>
        <span className="commons-mode">{isLive ? "Member workspace" : "Interactive demo"}</span>
      </div>
      <div className="commons-columns">
        <section className="commons-feed" aria-label="Today’s feed">
          <div className="commons-tabs" role="tablist" aria-label="Feed sections">
            {["Everything", "Intros", "Posts"].map((t) => (
              <button role="tab" aria-selected={tab === t} key={t} onClick={() => setTab(t)}>
                {t}
                {t === "Intros" && !isLive && pending.length > 0 && <span>{pending.length}</span>}
              </button>
            ))}
          </div>
          {social && tab !== "Posts" && (
            <section className="commons-intros">
              <div className="commons-section-title">
                <h2>Introductions, with intention.</h2>
                <button onClick={() => onNavigate("intros")}>
                  See all <ArrowRight size={16} />
                </button>
              </div>
              {isLive ? (
                <article className="commons-card">
                  <span className="commons-eyebrow">YOUR INTRODUCTION INBOX</span>
                  <h3>Start with shared context.</h3>
                  <p>Review your requests and find people who are open to a conversation.</p>
                  <button className="commons-primary" onClick={() => onNavigate("intros")}>
                    Open introductions <ArrowRight size={16} />
                  </button>
                </article>
              ) : pending.length ? (
                pending.slice(0, 2).map((r) => (
                  <article className="commons-card commons-intro-card" key={r.id}>
                    <div className="commons-person">
                      <CommonsAvatar
                        member={members.find((m) => m.id === r.requesterId)}
                        name={r.requesterName}
                      />
                      <div>
                        <strong>{r.requesterName}</strong>
                        <small>
                          {r.requesterTitle} · {r.requesterCompany}
                        </small>
                      </div>
                      <span className="commons-pill">Intro request</span>
                    </div>
                    <blockquote>“{r.note}”</blockquote>
                    <button className="commons-primary" onClick={() => onReview(r)}>
                      Review request <ArrowRight size={16} />
                    </button>
                    <small>
                      Review the context before deciding. Nothing is accepted automatically.
                    </small>
                  </article>
                ))
              ) : (
                <article className="commons-card">
                  <h3>You’re up to date.</h3>
                  <p>No pending demo introduction requests.</p>
                  <button onClick={() => onNavigate("people")}>
                    Explore your network <ArrowRight size={16} />
                  </button>
                </article>
              )}
            </section>
          )}
          <section className="commons-posts" aria-label="Member posts" hidden={social && tab === "Intros"}>
              {children}
              {!isLive && (
                <div className="commons-demo-posts" hidden={!social}>
                <>
                  <form
                    className="commons-card commons-composer"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (draft.trim()) {
                        onAddPost(draft.trim(), "Insight");
                        setDraft("");
                      }
                    }}
                  >
                    <label htmlFor="commons-post">What did you learn this week?</label>
                    <textarea
                      id="commons-post"
                      placeholder="Share something useful. Ask something real."
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      rows={3}
                    />
                    <div>
                      <small>Demo posts stay in this session.</small>
                      <button className="commons-primary" disabled={!draft.trim()} type="submit">
                        Share a post <ArrowRight size={16} />
                      </button>
                    </div>
                  </form>
                  {posts.map((post) => {
                    const member = members.find((m) => m.id === post.authorId);
                    return (
                      <article className="commons-card commons-post" key={post.id}>
                        <div className="commons-person">
                          <button
                            aria-label={`View ${post.authorName}`}
                            onClick={() => member && onNavigate("profile", member.id)}
                          >
                            <CommonsAvatar member={member} name={post.authorName} />
                          </button>
                          <div>
                            <button
                              className="commons-author"
                              onClick={() => member && onNavigate("profile", member.id)}
                            >
                              {post.authorName} {member?.verified && <CheckCircle2 size={15} />}
                            </button>
                            <small>
                              {post.authorTitle} · {post.timeAgo}
                            </small>
                          </div>
                          {post.badge && <span className="commons-pill">{post.badge}</span>}
                        </div>
                        <p className="commons-post-body">{post.content}</p>
                        {post.image && <img className="commons-post-photo" src={post.image.src} alt={post.image.alt} loading="lazy" />}
                        <div className="commons-post-actions">
                          <button
                            onClick={() => {
                              setReplyTo(replyTo === post.id ? null : post.id);
                              setReply("");
                            }}
                          >
                            <MessageCircle size={16} /> Reply
                          </button>
                          <button aria-pressed={!!post.isLiked} onClick={() => onLike(post.id)}>
                            {post.isLiked ? "Appreciated" : "Appreciate"} · {post.likes}
                          </button>
                          <button
                            aria-label={post.isSaved ? "Unsave post" : "Save post"}
                            aria-pressed={!!post.isSaved}
                            onClick={() => onSave(post.id)}
                          >
                            <Bookmark size={16} />
                          </button>
                          {member && (
                            <button
                              className="commons-intro-link"
                              onClick={() => onRequestIntro(member)}
                            >
                              Ask for an intro <ArrowRight size={15} />
                            </button>
                          )}
                        </div>
                        {(replies[post.id] || []).map((text, i) => (
                          <p className="commons-reply" key={i}>
                            <strong>You · demo reply</strong>
                            {text}
                          </p>
                        ))}
                        {replyTo === post.id && (
                          <form
                            className="commons-reply-form"
                            onSubmit={(e) => {
                              e.preventDefault();
                              if (!reply.trim()) return;
                              setReplies((prev) => ({
                                ...prev,
                                [post.id]: [...(prev[post.id] || []), reply.trim()],
                              }));
                              setReply("");
                              setReplyTo(null);
                            }}
                          >
                            <label className="sr-only" htmlFor={`reply-${post.id}`}>
                              Reply to {post.authorName}
                            </label>
                            <input
                              id={`reply-${post.id}`}
                              value={reply}
                              onChange={(e) => setReply(e.target.value)}
                              placeholder="Add a thoughtful reply"
                            />
                            <button className="commons-primary" disabled={!reply.trim()}>
                              Reply
                            </button>
                          </form>
                        )}
                      </article>
                    );
                  })}
                </>
                </div>
              )}
            </section>
          <section className="commons-caught-up">
            <Sparkles size={24} />
            <h2>{isLive ? "Make room for a useful conversation." : "You’re caught up."}</h2>
            <p>
              Your network is here when you need it. Take the next idea into your private workspace.
            </p>
            <div>
              <button className="commons-primary" onClick={() => onWorkspace("pocket")}>
                Open Pocket room
              </button>
              <button onClick={() => ask()}>
                Talk to Ask Intros <ArrowRight size={16} />
              </button>
            </div>
          </section>
        </section>
        <aside className="commons-rail" aria-label="Your private workspace">
          <section className="commons-butler">
            <div className="commons-person">
              <span className="commons-assistant-icon">
                <Sparkles size={22} />
              </span>
              <div>
                <h2>Ask Intros</h2>
                <small>Your butler. Private to you.</small>
              </div>
            </div>
            <p>
              What’s on your plate{me?.name ? `, ${me.name.split(" ")[0]}` : ""}? Start with a
              person, a question, or an idea.
            </p>
            {[
              "Who should I meet this week?",
              "Explain my company report",
              "Help me write a useful post",
            ].map((q) => (
              <button key={q} onClick={() => ask(q)}>
                {q}
                <ArrowRight size={15} />
              </button>
            ))}
            <button className="commons-conversation" onClick={() => ask()}>
              Open full conversation <ArrowRight size={16} />
            </button>
          </section>
          <section className="commons-card">
            <span className="commons-eyebrow">COMPANY REPORT · PRIVATE</span>
            <h2>See what needs attention.</h2>
            <p>Review your company’s findings and the evidence behind them.</p>
            <button className="commons-row" onClick={() => onWorkspace("diagnostic")}>
              Open company report <ArrowRight size={16} />
            </button>
          </section>
          <section className="commons-card">
            <h2>Your Pocket room</h2>
            <p>A private space for notes, files, blueprints and ideas.</p>
            <button className="commons-row" onClick={() => onWorkspace("pocket")}>
              Continue in your library <ArrowRight size={16} />
            </button>
            <button className="commons-row" onClick={() => onWorkspace("executivework")}>
              Open workbench <ArrowRight size={16} />
            </button>
          </section>
          <section className="commons-card">
            <span className="commons-eyebrow">PEOPLE WORTH KNOWING</span>
            <h2>Find common ground.</h2>
            {members
              .filter((m) => m.openToIntros)
              .slice(0, 3)
              .map((member) => (
                <button
                  className="commons-member-row"
                  key={member.id}
                  onClick={() => onNavigate("profile", member.id)}
                >
                  <CommonsAvatar member={member} name={member.name} />
                  <span>
                    <strong>{member.name}</strong>
                    <small>{member.title}</small>
                  </span>
                  <ArrowRight size={16} />
                </button>
              ))}
            <button className="commons-row" onClick={() => onNavigate("people")}>
              Explore people <ArrowRight size={16} />
            </button>
          </section>
          {actionQueue && <section className="commons-live-actions">{actionQueue}</section>}
        </aside>
      </div>
    </div>
  );
}
