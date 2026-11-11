import { isToken } from "@/lib/agent";
import { FIELD_CSS } from "@/components/agent/theme";
import { CleanerTabs } from "@/components/agent/cleaner-tabs";

export default function CleanerLayout({ children, params }: { children: React.ReactNode; params: { token: string } }) {
  return (
    <div className="agent-app min-h-screen bg-[var(--a-bg)] text-[var(--a-ink)]" data-theme="system" lang="fr">
      <style dangerouslySetInnerHTML={{ __html: FIELD_CSS }} />
      <div className="mx-auto max-w-md px-4 pb-32 pt-5">{children}</div>
      {isToken(params.token) && <CleanerTabs token={params.token} />}
    </div>
  );
}
