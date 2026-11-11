import { agentPrefs, isToken } from "@/lib/agent";
import { AgentTabs } from "@/components/agent/tabs";

/** Thème de l'application agent : variables de couleur clair / sombre / système (suit le téléphone). */
const CSS = `
.agent-app{--a-bg:#ffffff;--a-card:#f0f4fc;--a-ink:#101828;--a-mute:#667085;--a-line:#e3e8f2;--a-pri:#1e3a6e;--a-soft:#dbe6fc;--a-ok:#0f7a4d;--a-okbg:#dcf7e8;--a-bad:#b42318;--a-badbg:#fde4e1;--a-warn:#b54708;--a-warnbg:#fef0c7;--a-dock:#ffffff}
.agent-app[data-theme=dark]{--a-bg:#0a1020;--a-card:#131c30;--a-ink:#f2f5fb;--a-mute:#9aa7bf;--a-line:#233049;--a-pri:#3f73d6;--a-soft:#1d2d52;--a-ok:#4ade80;--a-okbg:#0f2a1d;--a-bad:#f97066;--a-badbg:#3a1714;--a-warn:#fdb022;--a-warnbg:#33260c;--a-dock:#131c30}
@media (prefers-color-scheme:dark){.agent-app[data-theme=system]{--a-bg:#0a1020;--a-card:#131c30;--a-ink:#f2f5fb;--a-mute:#9aa7bf;--a-line:#233049;--a-pri:#3f73d6;--a-soft:#1d2d52;--a-ok:#4ade80;--a-okbg:#0f2a1d;--a-bad:#f97066;--a-badbg:#3a1714;--a-warn:#fdb022;--a-warnbg:#33260c;--a-dock:#131c30}}
`;

export default function AgentLayout({ children, params }: { children: React.ReactNode; params: { token: string } }) {
  const { lang, theme } = agentPrefs();
  return (
    <div className="agent-app min-h-screen bg-[var(--a-bg)] text-[var(--a-ink)]" data-theme={theme} lang={lang}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="mx-auto max-w-md px-4 pb-32 pt-5">{children}</div>
      {isToken(params.token) && <AgentTabs token={params.token} lang={lang} />}
    </div>
  );
}
