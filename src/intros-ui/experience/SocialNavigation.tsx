import { useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";
import {
  WORKSPACE_DESTINATIONS,
  destinationFor,
  type NavigationTarget,
} from "../components/layout/workspace-navigation";
import type { ActivePage } from "../components/layout/TopNavigation";

/** The same canonical destinations used by the Business sidebar and command search. */
export function SocialNavigation({
  activePage,
  activeTool,
  onSelect,
}: {
  activePage: ActivePage;
  activeTool?: string | undefined;
  onSelect: (target: NavigationTarget) => void;
}) {
  const more = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (more.current) more.current.open = false;
  }, [activePage, activeTool]);
  const active = destinationFor(activePage, activeTool)?.id;
  const primary = new Set(["dashboard", "network", "introductions", "messages", "meetings"]);
  const render = (item: (typeof WORKSPACE_DESTINATIONS)[number]) => (
    <button
      key={item.id}
      type="button"
      aria-current={active === item.id ? "page" : undefined}
      onClick={() => {
        if (more.current) more.current.open = false;
        onSelect(item);
      }}
    >
      <item.icon size={17} aria-hidden="true" />
      {item.label}
    </button>
  );
  return (
    <nav className="social-primary-nav" aria-label="Social workspace navigation">
      {WORKSPACE_DESTINATIONS.filter((item) => primary.has(item.id)).map(render)}
      <details
        ref={more}
        onKeyDown={(event) => {
          if (event.key === "Escape" && more.current) {
            more.current.open = false;
            more.current.querySelector("summary")?.focus();
          }
        }}
      >
        <summary>
          More <ChevronDown size={16} />
        </summary>
        <div className="social-more-menu">
          {WORKSPACE_DESTINATIONS.filter((item) => !primary.has(item.id)).map(render)}
        </div>
      </details>
    </nav>
  );
}
