/** Thème des applications de terrain (agents et nettoyeurs) : variables de couleur clair / sombre / système. */
export const FIELD_CSS = `
.agent-app{--a-bg:#ffffff;--a-card:#f0f4fc;--a-ink:#101828;--a-mute:#667085;--a-line:#e3e8f2;--a-pri:#1e3a6e;--a-soft:#dbe6fc;--a-ok:#0f7a4d;--a-okbg:#dcf7e8;--a-bad:#b42318;--a-badbg:#fde4e1;--a-warn:#b54708;--a-warnbg:#fef0c7;--a-dock:#ffffff}
.agent-app[data-theme=dark]{--a-bg:#0a1020;--a-card:#131c30;--a-ink:#f2f5fb;--a-mute:#9aa7bf;--a-line:#233049;--a-pri:#3f73d6;--a-soft:#1d2d52;--a-ok:#4ade80;--a-okbg:#0f2a1d;--a-bad:#f97066;--a-badbg:#3a1714;--a-warn:#fdb022;--a-warnbg:#33260c;--a-dock:#131c30}
@media (prefers-color-scheme:dark){.agent-app[data-theme=system]{--a-bg:#0a1020;--a-card:#131c30;--a-ink:#f2f5fb;--a-mute:#9aa7bf;--a-line:#233049;--a-pri:#3f73d6;--a-soft:#1d2d52;--a-ok:#4ade80;--a-okbg:#0f2a1d;--a-bad:#f97066;--a-badbg:#3a1714;--a-warn:#fdb022;--a-warnbg:#33260c;--a-dock:#131c30}}
.agent-app .fx-hero{background:linear-gradient(135deg,#1e3a6e 0%,#1d6fe0 100%);background-size:170% 170%;animation:fx-grad 14s ease-in-out infinite alternate}
@keyframes fx-grad{to{background-position:100% 100%}}
.agent-app .fx-radar{position:absolute;inset:0;border-radius:9999px;border:2px solid rgba(255,255,255,.6);opacity:0;animation:fx-radar 3.3s cubic-bezier(.2,.6,.3,1) infinite}
@keyframes fx-radar{0%{transform:scale(.3);opacity:.75}100%{transform:scale(1.15);opacity:0}}
.agent-app .fx-glow{animation:fx-glow 2.4s ease-in-out infinite}
@keyframes fx-glow{0%,100%{box-shadow:0 0 0 0 rgba(255,255,255,.55),0 16px 32px -10px rgba(10,20,50,.45)}50%{box-shadow:0 0 0 24px rgba(255,255,255,0),0 16px 32px -10px rgba(10,20,50,.45)}}
.agent-app .fx-float{animation:fx-float 7s ease-in-out infinite}
@keyframes fx-float{50%{transform:translateY(-10px) translateX(6px)}}
.agent-app .fx-in{animation:fx-in .6s cubic-bezier(.16,1,.3,1) both}
@keyframes fx-in{from{opacity:0;transform:translateY(16px) scale(.98)}to{opacity:1;transform:none}}
.agent-app .fx-pop{animation:fx-pop .4s cubic-bezier(.34,1.56,.64,1) both}
@keyframes fx-pop{from{transform:scale(.5);opacity:0}to{transform:none;opacity:1}}
.agent-app .fx-shine{position:relative;overflow:hidden}
.agent-app .fx-shine::after{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(110deg,transparent 35%,rgba(255,255,255,.2) 50%,transparent 65%);transform:translateX(-100%);animation:fx-shine 6s ease-in-out infinite}
@keyframes fx-shine{55%,100%{transform:translateX(100%)}}
.agent-app .fx-glass{background:color-mix(in srgb,var(--a-dock) 78%,transparent);-webkit-backdrop-filter:saturate(1.8) blur(20px);backdrop-filter:saturate(1.8) blur(20px)}
.agent-app .fx-press{transition:transform .15s ease}.agent-app .fx-press:active{transform:scale(.96)}
@media (prefers-reduced-motion:reduce){.agent-app .fx-hero,.agent-app .fx-radar,.agent-app .fx-glow,.agent-app .fx-float,.agent-app .fx-in,.agent-app .fx-pop,.agent-app .fx-shine::after{animation:none!important}.agent-app .fx-radar{opacity:.25;transform:scale(.8)}}
`;
