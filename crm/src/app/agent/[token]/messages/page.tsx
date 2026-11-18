import type { Metadata } from "next";
import { agentPrefs, isToken } from "@/lib/agent";
import { dict } from "@/lib/field-ui";
import { Invalid } from "@/components/agent/invalid";
import { AgentChat } from "@/components/agent/chat";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Messages — ProClean Empire", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default function AgentMessagesPage({ params }: { params: { token: string } }) {
  const t = dict(agentPrefs().lang);
  if (!isToken(params.token)) return <Invalid t={t} text={t.invalidText} />;
  return (
    <>
      <h1 className="mb-1 text-[30px] font-extrabold tracking-tight">Messages</h1>
      <p className="mb-4 text-[15px] text-[var(--a-mute)]">Votre conversation avec la direction.</p>
      <AgentChat token={params.token} />
    </>
  );
}
