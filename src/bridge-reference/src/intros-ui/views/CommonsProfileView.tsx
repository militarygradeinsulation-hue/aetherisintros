import { ArrowLeft, ArrowRight, Bookmark, CheckCircle2, MapPin } from "lucide-react";
import type { NetworkMember } from "../networkData";
import type { ActivePage } from "../components/layout/TopNavigation";
import { CommonsAvatar } from "./CommonsHomeView";

export function CommonsProfileView({
  member,
  onBack,
  onNavigate,
  onRequestIntro,
  isSaved,
  onToggleSave,
}: {
  member: NetworkMember;
  onBack: () => void;
  onNavigate: (page: ActivePage, id?: string) => void;
  onRequestIntro: (member: NetworkMember) => void;
  isSaved: boolean;
  onToggleSave: (id: string) => void;
}) {
  const link = (value: string) =>
    /^https?:\/\//i.test(value) ? value : value ? `https://${value}` : "";
  return (
    <div className="commons-profile">
      <button className="commons-back" onClick={onBack}>
        <ArrowLeft size={16} />
        Back to people
      </button>
      <section className="commons-card commons-profile-heading">
        <div className="commons-person">
          <CommonsAvatar member={member} name={member.name} />
          <div>
            <span className="commons-eyebrow">MEMBER PROFILE</span>
            <h1>
              {member.name}{" "}
              {member.verified && <CheckCircle2 size={21} aria-label="Verified member" />}
            </h1>
            <p>
              {member.title} · {member.company}
            </p>
          </div>
        </div>
        <div className="commons-profile-meta">
          <span>
            <MapPin size={15} />
            {member.location}
          </span>
          <span className="commons-pill">
            {member.openToIntros ? "Open to introductions" : "Introductions closed"}
          </span>
        </div>
        <p className="commons-profile-bio">{member.bioStatement}</p>
        <div className="commons-profile-actions">
          <button
            className="commons-primary"
            disabled={!member.openToIntros}
            onClick={() => onRequestIntro(member)}
          >
            Ask for an introduction <ArrowRight size={16} />
          </button>
          <button
            className="commons-row"
            aria-pressed={isSaved}
            onClick={() => onToggleSave(member.id)}
          >
            <Bookmark size={16} />
            {isSaved ? "Saved to your network" : "Save to your network"}
          </button>
        </div>
        <small>Share your context. Each person chooses whether to connect.</small>
      </section>
      <div className="commons-profile-grid">
        <section className="commons-card">
          <h2>About {member.firstName}</h2>
          <p>{member.fullBio}</p>
          {member.quote && <blockquote>“{member.quote}”</blockquote>}
          <div className="commons-profile-actions">
            {member.website && (
              <a href={link(member.website)} target="_blank" rel="noreferrer">
                Website ↗
              </a>
            )}
            {member.linkedin && (
              <a href={link(member.linkedin)} target="_blank" rel="noreferrer">
                LinkedIn ↗
              </a>
            )}
          </div>
        </section>
        <section className="commons-card">
          <h2>What I’m working on</h2>
          {member.currentObjectives.length ? (
            member.currentObjectives.map((o) => (
              <p className="commons-row" key={o}>
                {o}
              </p>
            ))
          ) : (
            <p>No current objectives shared.</p>
          )}
          <h3>Common ground</h3>
          <div className="commons-profile-tags">
            {member.focusAreas.map((t) => (
              <span className="commons-pill" key={t}>
                {t}
              </span>
            ))}
          </div>
        </section>
        <section className="commons-card">
          <h2>Shared connections</h2>
          {member.mutualConnections.length ? (
            member.mutualConnections.map((person) => (
              <button
                key={person.id}
                className="commons-row"
                onClick={() => onNavigate("people", person.id)}
              >
                <span>
                  <strong>{person.name}</strong>
                  <small>{person.title}</small>
                </span>
                <ArrowRight size={16} />
              </button>
            ))
          ) : (
            <p>No shared connections to show.</p>
          )}
        </section>
        <section className="commons-card">
          <h2>Recent posts</h2>
          {member.recentPosts.length ? (
            member.recentPosts.map((post) => (
              <article key={post.id}>
                <h3>{post.title}</h3>
                <p>{post.snippet}</p>
                <small>{post.timeAgo}</small>
              </article>
            ))
          ) : (
            <p>No recent posts shared.</p>
          )}
        </section>
        {member.recommendations.length > 0 && (
          <section className="commons-card">
            <h2>From their network</h2>
            {member.recommendations.map((rec) => (
              <blockquote key={rec.id}>
                <p>“{rec.text}”</p>
                <small>
                  {rec.author} · {rec.role}
                </small>
              </blockquote>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
