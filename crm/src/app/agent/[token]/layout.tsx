import { agentPrefs, isToken } from "@/lib/agent";
import { AgentTabs } from "@/components/agent/tabs";
import { FIELD_CSS } from "@/components/agent/theme";



export default function AgentLayout({ children, params }: { children: React.ReactNode; params: { token: string } }) {
  const { lang, theme } = agentPrefs();
  return (
    <div className="agent-app min-h-screen bg-[var(--a-bg)] text-[var(--a-ink)]" data-theme={theme} lang={lang}>
      <style dangerouslySetInnerHTML={{ __html: FIELD_CSS }} />
      <div className="mx-auto max-w-md px-4 pb-32 pt-5">{children}</div>
      {isToken(params.token) && <AgentTabs token={params.token} lang={lang} />}
    </div>
  );
}
