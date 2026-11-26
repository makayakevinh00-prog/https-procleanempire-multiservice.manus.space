import type { Metadata } from "next";
import Link from "next/link";
import { Award, FileText, GraduationCap, HelpCircle, Home, Landmark, Phone, ShieldCheck, Star, UserCheck, LogOut } from "lucide-react";
import { agentClient, agentMessage, isToken, type CleanerOverview } from "@/lib/agent";
import { dict, initials } from "@/lib/field-ui";
import { MODULE_LIST, type TrainingState } from "@/lib/formation";
import { Gate } from "@/components/agent/gate";
import { Permissions } from "@/components/agent/permissions";
import { AvatarPicker } from "@/components/nettoyeur/avatar-picker";
import { Row, RowList, sectionLabel } from "@/components/nettoyeur/profile-ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Profil — ProClean Empire", robots: { index: false, follow: false }, referrer: "no-referrer" };

/** Profil : identité en haut, puis des rubriques rangées (activité, informations, autorisations, aide). Chaque modification se fait dans sa propre page. */
export default async function CleanerProfile({ params, searchParams }: { params: { token: string }; searchParams: { ok?: string; error?: string } }) {
  const token = params.token;
  if (!isToken(token)) return <Gate text="Ce lien n'est pas valide." />;
  const db = agentClient();
  const { data, error } = await db.rpc("cleaner_overview", { p_token: token });
  if (error) return <Gate text={agentMessage(error.message)} />;
  const o = data as CleanerOverview;
  const [av, trr, idr] = await Promise.all([db.rpc("cleaner_avatar", { p_token: token }), db.rpc("cleaner_training", { p_token: token }), db.rpc("cleaner_identity", { p_token: token })]);
  const photo = av.data as string | null, tr = trr.data as TrainingState | null, idn = idr.data as { status: string } | null;
  const passed = tr ? MODULE_LIST.filter((m) => tr.modules[m].passed).length : 0;
  const base = `/nettoyeur/${token}`, t = dict("fr");
  const score = o.reliability?.score;
  const place = [o.address_line, [o.postal_code, o.city].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  const idSub = !idn ? "" : idn.status === "verifie" ? "Identité vérifiée" : idn.status === "en_cours" ? "Vérification en cours" : idn.status === "echec" ? "À refaire" : "Pièce d'identité et selfie, 2 minutes";
  return (
    <>
      <section className="fx-in rounded-3xl border border-[var(--a-line)] p-6 text-center shadow-sm">
        <AvatarPicker token={token} initials={initials(o.name)} current={photo} />
        <h1 className="mt-3 text-[28px] font-extrabold tracking-tight">{o.name}</h1>
        <p className="text-[15px] text-[var(--a-mute)]">{o.email}</p>
        {tr?.certified_at && <Link href={`${base}/certificat`} className="mx-auto mt-3 inline-flex items-center gap-2 rounded-full bg-[var(--a-okbg)] px-4 py-2 text-[14px] font-extrabold text-[var(--a-ok)]"><Award className="h-5 w-5" />Certifié ProClean · {tr.score} %</Link>}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-[var(--a-card)] p-3"><b className="num block text-[34px] leading-tight text-[var(--a-pri)]">{o.done}</b><span className="text-[12px] font-extrabold uppercase tracking-[0.12em] text-[var(--a-mute)]">Ménages validés</span></div>
          <div className="rounded-2xl bg-[var(--a-card)] p-3"><b className="num block text-[34px] leading-tight text-[var(--a-ok)]">{score == null ? "—" : `${score} %`}</b><span className="text-[12px] font-extrabold uppercase tracking-[0.12em] text-[var(--a-mute)]">Fiabilité</span></div>
        </div>
      </section>
      {searchParams.error && <div role="alert" className="mt-4 rounded-2xl bg-[var(--a-badbg)] p-3 text-sm font-semibold text-[var(--a-bad)]">{searchParams.error}</div>}
      {searchParams.ok && <div role="status" className="mt-4 rounded-2xl bg-[var(--a-okbg)] p-3 text-sm font-semibold text-[var(--a-ok)]">{searchParams.ok}</div>}

      <h2 className={sectionLabel}>Mon activité</h2>
      <RowList>
        <Row href={`${base}/profil/fiabilite`} icon={Star} title="Ma fiabilité" sub={score == null ? "S'affiche à partir de 3 ménages" : `${score} % · détermine l'ordre des demandes`} />
        {tr && <Row href={tr.certified_at ? `${base}/certificat` : `${base}/formation`} icon={GraduationCap} title="Formation et certificat" sub={tr.certified_at ? `Certifié · ${tr.score} %` : `À passer · ${passed}/3 modules`} warn={!tr.certified_at} />}
        {idn && idn.status !== "non_requis" && <Row href={`${base}/identite`} icon={idn.status === "verifie" ? ShieldCheck : UserCheck} title="Vérification d'identité" sub={idSub} warn={idn.status !== "verifie"} />}
        <Row href={`${base}/gains`} icon={FileText} title="Mes factures et virements" sub="Gains, demandes de virement, factures" />
      </RowList>

      <h2 className={sectionLabel}>Mes informations</h2>
      <RowList>
        <Row href={`${base}/profil/adresse`} icon={Home} title="Adresse et secteur" sub={place ? `${place} · ${o.radius_km} km` : "À renseigner pour recevoir les ménages près de vous"} warn={!place} />
        <Row href={`${base}/profil/telephone`} icon={Phone} title="Téléphone" sub={o.phone || "À renseigner"} warn={!o.phone} />
        <Row href={`${base}/profil/iban`} icon={Landmark} title="IBAN pour mes virements" sub={o.has_iban ? o.iban_hint ?? "Enregistré" : "À renseigner pour être payé"} warn={!o.has_iban} />
      </RowList>

      <h2 className={sectionLabel}>{t.permissions}</h2>
      <Permissions t={{ camera: t.camera, location: t.location, granted: t.granted, denied: t.denied, ask: t.ask, unknown: t.unknown, cameraOk: t.cameraOk, cameraNo: t.cameraNo, cameraAsk: t.cameraAsk, locOk: t.locOk, locNo: t.locNo, locAsk: t.locAsk, openSettings: t.openSettings }} />

      <h2 className={sectionLabel}>Aide et confidentialité</h2>
      <RowList>
        <Row href={`${base}/profil/aide`} icon={HelpCircle} title="Comment ça marche" sub="Horaires, attribution des ménages, contact" />
        <Row href="/confidentialite" icon={ShieldCheck} title="Politique de confidentialité" sub="Quelles données sont traitées, et pourquoi" />
      </RowList>

      <form method="post" action="/connexion/sortir" className="mt-4">
        <input type="hidden" name="t" value={token} />
        <button className="fx-press flex h-14 w-full items-center justify-center gap-2 rounded-2xl border border-[var(--a-line)] text-[16px] font-extrabold text-[var(--a-bad)]"><LogOut className="h-5 w-5" />Se déconnecter</button>
      </form>
      <a href="/connexion?choisir=1" className="mt-3 block text-center text-[14px] font-bold text-[var(--a-mute)]">Changer d&apos;espace</a>
    </>
  );
}
