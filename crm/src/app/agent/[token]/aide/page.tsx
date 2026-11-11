import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, Phone, Mail } from "lucide-react";
import { agentClient, agentMessage, agentPrefs, isToken, type AgentProfile } from "@/lib/agent";
import { dict } from "@/lib/field-ui";
import { Invalid } from "@/components/agent/invalid";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Aide — ProClean Empire", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function HelpPage({ params }: { params: { token: string } }) {
  const { lang } = agentPrefs();
  const t = dict(lang);
  if (!isToken(params.token)) return <Invalid t={t} text={t.invalidText} />;
  const { data, error } = await agentClient().rpc("agent_profile", { p_token: params.token });
  if (error) return <Invalid t={t} text={agentMessage(error.message)} />;
  const p = data as AgentProfile;
  const btn = "flex items-center gap-3 rounded-2xl bg-[var(--a-card)] p-4 text-[17px] font-extrabold text-[var(--a-pri)]";
  return (
    <>
      <Link href={`/agent/${params.token}/profil`} className="mb-2 inline-flex items-center gap-1 text-[15px] font-bold text-[var(--a-pri)]"><ChevronLeft className="h-5 w-5" />{t.back}</Link>
      <h1 className="mb-3 text-[30px] font-extrabold tracking-tight">{t.help}</h1>
      <div className="space-y-2">
        <h2 className="px-1 text-[14px] font-extrabold uppercase tracking-[0.14em] text-[var(--a-mute)]">{t.contactManager}</h2>
        {p.company_phone && <a href={`tel:${p.company_phone}`} className={btn}><Phone className="h-5 w-5" />{t.call} · {p.company_phone}</a>}
        {p.company_email && <a href={`mailto:${p.company_email}`} className={btn}><Mail className="h-5 w-5" />{t.write} · {p.company_email}</a>}
        {!p.company_phone && !p.company_email && <p className="rounded-2xl bg-[var(--a-card)] p-4 text-[var(--a-mute)]">{p.company_name ?? "ProClean Empire"}</p>}
      </div>
      <section id="lien" className="mt-6 rounded-2xl bg-[var(--a-card)] p-4">
        <h2 className="text-[18px] font-extrabold">{t.noPasswordTitle}</h2>
        <p className="mt-1 text-[15px] text-[var(--a-mute)]">{t.noPasswordText}</p>
      </section>
    </>
  );
}
