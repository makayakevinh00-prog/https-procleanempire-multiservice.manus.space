import { brand } from "../../config/brand.js";

/**
 * Gabarit du visuel de marque : bleu marine, doré, blanc — haut de gamme,
 * minimaliste, moderne.
 *
 * Rendu en HTML puis photographié par un navigateur sans interface : c'est ce
 * qui donne une typographie correcte et un contrôle total sur la mise en page,
 * là où un générateur d'images IA produit un rendu différent à chaque appel et
 * écrit mal le français.
 */

export type BrandCardContent = {
  /** Surtitre court, en capitales (l'angle éditorial du jour). */
  kicker: string;
  /** Phrase principale, 60 à 110 caractères idéalement. */
  headline: string;
  /** Ligne de pied, facultative. */
  footnote?: string;
};

export const CARD_WIDTH = 1080;
/** Format 4:5 : le plus grand format toléré par Instagram dans le fil. */
export const CARD_HEIGHT = 1350;

const escape = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export const renderCardHtml = (content: BrandCardContent): string => {
  const { colors } = brand;
  // Une phrase longue passe en corps plus petit pour ne jamais déborder.
  const headlineSize = content.headline.length > 95 ? 74 : content.headline.length > 60 ? 86 : 100;

  /** Le cadre est encastré de 46px sur chaque bord ; ses angles sont coupés. */
  const FRAME_INSET = 46;
  const frameWidth = CARD_WIDTH - FRAME_INSET * 2;
  const frameHeight = CARD_HEIGHT - FRAME_INSET * 2;
  const chamfer = 36;

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    width: ${CARD_WIDTH}px;
    height: ${CARD_HEIGHT}px;
    background:
      radial-gradient(ellipse at 22% 18%, #16233f 0%, transparent 58%),
      radial-gradient(ellipse at 85% 88%, rgba(201,162,39,0.16) 0%, transparent 55%),
      ${colors.navyDeep};
    font-family: Georgia, "Liberation Serif", "DejaVu Serif", serif;
    color: ${colors.white};
    position: relative;
    overflow: hidden;
  }

  /* Filet doré à coins chanfreinés : la signature graphique de la marque.
     Tracé en SVG et non avec clip-path, qui couperait la bordure aux angles
     au lieu d'y dessiner les diagonales. */
  .frame { position: absolute; inset: 46px; opacity: 0.85; }
  .frame svg { display: block; width: 100%; height: 100%; }

  .content {
    position: absolute;
    inset: 46px;
    padding: 96px 88px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .kicker {
    font-family: "Helvetica Neue", "Liberation Sans", "DejaVu Sans", Arial, sans-serif;
    font-size: 26px;
    letter-spacing: 9px;
    text-transform: uppercase;
    color: ${colors.gold};
    font-weight: 600;
  }

  .headline {
    font-size: ${headlineSize}px;
    line-height: 1.16;
    font-weight: 700;
    letter-spacing: -0.5px;
  }

  .rule {
    display: flex;
    align-items: center;
    gap: 16px;
    margin: 40px 0 34px;
  }
  .rule .bar { height: 3px; width: 150px; background: ${colors.gold}; }
  .rule .lozenge {
    width: 13px; height: 13px; background: ${colors.gold}; transform: rotate(45deg);
  }

  .footnote {
    font-family: "Helvetica Neue", "Liberation Sans", "DejaVu Sans", Arial, sans-serif;
    font-size: 30px;
    line-height: 1.5;
    color: #d7deeb;
  }

  .footer {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    font-family: "Helvetica Neue", "Liberation Sans", "DejaVu Sans", Arial, sans-serif;
  }
  .brand {
    font-family: Georgia, "Liberation Serif", "DejaVu Serif", serif;
    font-size: 40px;
    font-weight: 700;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: ${colors.goldLight};
  }
  .meta { font-size: 25px; letter-spacing: 3px; color: #9fb0cd; text-align: right; line-height: 1.6; }
</style>
</head>
<body>
  <div class="frame">
    <svg viewBox="0 0 ${frameWidth} ${frameHeight}" preserveAspectRatio="none">
      <polygon
        points="${chamfer},0 ${frameWidth - chamfer},0 ${frameWidth},${chamfer} ${frameWidth},${frameHeight - chamfer} ${frameWidth - chamfer},${frameHeight} ${chamfer},${frameHeight} 0,${frameHeight - chamfer} 0,${chamfer}"
        fill="none" stroke="${colors.gold}" stroke-width="2" />
    </svg>
  </div>
  <div class="content">
    <div class="kicker">${escape(content.kicker)}</div>

    <div>
      <div class="headline">${escape(content.headline)}</div>
      <div class="rule"><span class="bar"></span><span class="lozenge"></span></div>
      ${content.footnote ? `<div class="footnote">${escape(content.footnote)}</div>` : ""}
    </div>

    <div class="footer">
      <div class="brand">${escape(brand.name)}</div>
      <div class="meta">${escape(brand.website)}<br>${escape(brand.zone)}</div>
    </div>
  </div>
</body>
</html>`;
};
