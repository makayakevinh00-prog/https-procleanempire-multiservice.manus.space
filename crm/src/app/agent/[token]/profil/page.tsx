import type { Metadata } from "next";
import Link from "next/link";
import { Sun, Moon, Smartphone, Languages, KeyRound, HelpCircle, ShieldCheck, Trash2, ChevronRight } from "lucide-react";
import { agentClient, agentMessage, agentPrefs, isToken, type AgentProfile } from "@/lib/agent";
import { agentPrefAction } from "@/app/actions/agent";
import { dict, initials } from "@/lib/field-ui";
import { Permissions } from "@/components/agent/permissions";
import { Invalid } from "@/components/agent/invalid";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Profil — ProClean Empire", robots: { index: false, follow: false }, referrer: "no-referrer" };

const label = "px-1 pb-2 pt-6 text-[14px] font-extrabold uppercase tracking-[0.14em] text-[var(--a-mute)]";

function Segment({ items }: { items: { key: string; text: string; icon?: React.ElementType; on: boolean; action: () => Promise<void> }[] }) {
  return (
    <div className="flex gap-1 rounded-2xl bg-[var(--a-bg)] p-1">
      {items.map(({ key, text, icon: Icon, on, action }) => (
        <form key={key} action={action} className="flex-1">
          <button aria-pressed={on} className={`flex h-12 w-full items-center justify-center gap-2 rounded-xl text-[15px] font-extrabold ${on ? "bg-[var(--a-pri)] text-white" : "text-[var(--a-mute)]"}`}>{Icon && <Icon className="h-4 w-4" />}{text}</button>
        </form>
      ))}
    </div>
  );
}
function Row({ href, icon: Icon, title, sub, danger = false }: { href: string; icon: React.ElementType; title: string; sub?: string; danger?: boolean }) {
  return (
    <Link href={href} className="flex items-center gap-3 p-4">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--a-bg)] text-[var(--a-pri)]"><Icon className="h-6 w-6" /></span>
      <span className="min-w-0 flex-1"><b className="block text-[18px]">{title}</b>{sub && <span className="block text-[14px] text-[var(--a-mute)]">{sub}</span>}</span>
      <ChevronRight className={`h-5 w-5 ${danger ? "text-[var(--a-bad)]" : "text-[var(--a-mute)]"}`} />
    </Link>
  );
}

/** Profil de l'agent : identité, préférences (thème, langue), autorisations du téléphone, aide, confidentialité, effacement des données. */
export default async function ProfilePage({ params }: { params: { token: string } }) {
  const { lang, theme } = agentPrefs();
  const t = dict(lang);
  const token = params.token;
  if (!isToken(token)) return <Invalid t={t} text={t.invalidText} />;
  const { data, error } = await agentClient().rpc("agent_profile", { p_token: token });
  if (error) return <Invalid t={t} text={agentMessage(error.message)} />;
  const p = data as AgentProfile;
  const base = `/agent/${token}`;
  const th = (v: "light" | "dark" | "system") => agentPrefAction.bind(null, token, "theme", v);
  const lg = (v: "fr" | "en") => agentPrefAction.bind(null, token, "lang", v);

  return (
    <>
      <section className="rounded-3xl border border-[var(--a-line)] p-6 text-center shadow-sm">
        <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full border-4 border-[var(--a-soft)] bg-[var(--a-card)] text-[40px] font-extrabold text-[var(--a-pri)]">{initials(p.name)}</div>
        <h1 className="mt-4 text-[30px] font-extrabold tracking-tight">{p.name}</h1>
        {(p.email || p.phone) && <p className="text-[17px] text-[var(--a-mute)]">{p.email ?? p.phone}</p>}
        <div className="mt-5 text-[13px] font-extrabold uppercase tracking-[0.16em] text-[var(--a-mute)]">{t.missionsDone}</div>
        <b className="num text-[52px] leading-tight text-[var(--a-pri)]">{p.missions_done}</b>
      </section>

      <h2 className={label}>{t.preferences}</h2>
      <section className="space-y-4 rounded-3xl bg-[var(--a-card)] p-4">
        <div>
          <div className="mb-3 flex items-center gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--a-bg)] text-[var(--a-pri)]"><Sun className="h-6 w-6" /></span><span><b className="block text-[18px]">{t.appearance}</b><span className="text-[14px] text-[var(--a-mute)]">{t.appearanceSub}</span></span></div>
          <Segment items={[{ key: "light", text: t.light, icon: Sun, on: theme === "light", action: th("light") }, { key: "dark", text: t.dark, icon: Moon, on: theme === "dark", action: th("dark") }, { key: "system", text: t.system, icon: Smartphone, on: theme === "system", action: th("system") }]} />
        </div>
        <div>
          <div className="mb-3 flex items-center gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--a-bg)] text-[var(--a-pri)]"><Languages className="h-6 w-6" /></span><span><b className="block text-[18px]">{t.language}</b><span className="text-[14px] text-[var(--a-mute)]">{t.languageSub}</span></span></div>
          <Segment items={[{ key: "fr", text: "Français", on: lang === "fr", action: lg("fr") }, { key: "en", text: "English", on: lang === "en", action: lg("en") }]} />
        </div>
      </section>

      <h2 className={label}>{t.permissions}</h2>
      <Permissions t={{ camera: t.camera, location: t.location, granted: t.granted, denied: t.denied, ask: t.ask, unknown: t.unknown, cameraOk: t.cameraOk, cameraNo: t.cameraNo, cameraAsk: t.cameraAsk, locOk: t.locOk, locNo: t.locNo, locAsk: t.locAsk, openSettings: t.openSettings }} />

      <h2 className={label}>{t.securityHelp}</h2>
      <section className="divide-y divide-[var(--a-line)] rounded-3xl bg-[var(--a-card)]">
        <Row href={`${base}/aide#lien`} icon={KeyRound} title={t.personalLink} sub={t.personalLinkSub} />
        <Row href={`${base}/aide`} icon={HelpCircle} title={t.help} sub={t.helpSub} />
        <Row href={`${base}/confidentialite`} icon={ShieldCheck} title={t.privacy} sub={t.privacySub} />
        <Row href={`${base}/donnees`} icon={Trash2} title={t.deleteData} sub={t.deleteSub} danger />
      </section>
    </>
  );
}
