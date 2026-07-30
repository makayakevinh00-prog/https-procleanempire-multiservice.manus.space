import assert from "node:assert/strict";
import test from "node:test";
import { buildCalendarContext, easterSunday, frenchHolidays } from "./planner/calendar.js";
import { checkDuplicate, overusedHashtags, similarity } from "./planner/dedupe.js";
import { nextPublicationSlot, timeInZone } from "./planner/schedule.js";
import { chooseAngle } from "./planner/angle.js";
import { chooseAudience } from "./planner/audience.js";
import { toHeadline } from "./image/index.js";
import type { HistoryEntry } from "./types.js";

test("Pâques est calculée correctement", () => {
  assert.equal(easterSunday(2024).toISOString().slice(0, 10), "2024-03-31");
  assert.equal(easterSunday(2025).toISOString().slice(0, 10), "2025-04-20");
  assert.equal(easterSunday(2026).toISOString().slice(0, 10), "2026-04-05");
});

test("les jours fériés mobiles suivent Pâques", () => {
  const holidays = frenchHolidays(2026);
  assert.equal(holidays.get("04-06"), "Lundi de Pâques");
  assert.equal(holidays.get("05-14"), "Ascension");
  assert.equal(holidays.get("07-14"), "Fête nationale");
});

test("le contexte calendaire identifie jour, saison et évènement", () => {
  const context = buildCalendarContext(new Date("2026-12-25T10:00:00Z"));
  assert.equal(context.weekday, "vendredi");
  assert.equal(context.season, "hiver");
  assert.equal(context.occasion, "Noël");
});

test("un texte identique est détecté comme doublon, un texte différent non", () => {
  const original =
    "Une vitre propre qui laisse des traces au soleil vient presque toujours de la méthode employée et non du produit choisi";

  assert.ok(similarity(original, original) > 0.99);
  assert.ok(
    similarity(
      original,
      "Le nettoyage des sièges en tissu demande une extraction en profondeur plutôt qu un simple lavage de surface",
    ) < 0.1,
  );
});

test("le contrôle anti-répétition compare à tout l'historique", () => {
  const history: HistoryEntry[] = [
    {
      id: "1",
      date: "2026-07-20",
      angle: "conseil-nettoyage",
      topic: "Traces sur les vitres",
      fingerprint:
        "une vitre propre qui laisse des traces au soleil vient presque toujours de la methode employee",
      hashtags: ["#vitrerie"],
      serviceType: "vitrerie",
    },
  ];

  const duplicate = checkDuplicate(
    "une vitre propre qui laisse des traces au soleil vient presque toujours de la methode employee",
    history,
  );
  assert.equal(duplicate.isDuplicate, true);

  const fresh = checkDuplicate(
    "preparer un logement entre deux locations demande surtout une methode constante et un ordre de passage fixe",
    history,
  );
  assert.equal(fresh.isDuplicate, false);
});

test("les hashtags trop répétés sont signalés", () => {
  const history: HistoryEntry[] = Array.from({ length: 5 }, (_, index) => ({
    id: String(index),
    date: `2026-07-${20 + index}`,
    angle: "conseil-nettoyage" as const,
    topic: "sujet",
    fingerprint: "texte",
    hashtags: ["#proprete", index % 2 === 0 ? "#vitrerie" : "#bureaux"],
    serviceType: null,
  }));

  const overused = overusedHashtags(history);
  assert.ok(overused.includes("#proprete"));
  assert.ok(!overused.includes("#bureaux"));
});

test("un angle exigeant une photo est écarté quand il n'y en a pas", () => {
  const calendar = buildCalendarContext(new Date("2026-07-30T10:00:00Z"));

  for (let day = 0; day < 20; day += 1) {
    const context = buildCalendarContext(
      new Date(Date.UTC(2026, 6, 1 + day, 10, 0, 0)),
    );
    const { angle } = chooseAngle(context, [], { hasPhoto: false });
    assert.equal(angle.requiresPhoto, false, `${context.date} → ${angle.id}`);
  }

  const withPhoto = chooseAngle(calendar, [], { hasPhoto: true });
  assert.ok(withPhoto.angle);
});

test("un angle en période de repos n'est pas repris", () => {
  const calendar = buildCalendarContext(new Date("2026-07-30T10:00:00Z"));

  // Tous les angles sans photo ont été utilisés hier : seul le repli reste.
  const history: HistoryEntry[] = [
    {
      id: "1",
      date: "2026-07-29",
      angle: "coulisses",
      topic: "sujet",
      fingerprint: "texte",
      hashtags: [],
      serviceType: null,
    },
  ];

  const { angle } = chooseAngle(calendar, history, { hasPhoto: false });
  assert.notEqual(angle.id, "coulisses");
});

test("le même jour produit toujours le même angle", () => {
  const calendar = buildCalendarContext(new Date("2026-07-30T10:00:00Z"));
  const first = chooseAngle(calendar, [], { hasPhoto: true });
  const second = chooseAngle(calendar, [], { hasPhoto: true });
  assert.equal(first.angle.id, second.angle.id);
});

test("la cible est imposée par la photo lorsqu'il y en a une", () => {
  const calendar = buildCalendarContext(new Date("2026-07-30T10:00:00Z"));

  const { audience } = chooseAudience(calendar, [], {
    serviceType: "automobile",
    subject: "siège avant d'un véhicule",
    notableElements: ["cuir"],
    isBeforeAfter: false,
    quality: "publiable",
  });

  assert.equal(audience.id, "automobile");
});

test("une photo d'hôtellerie cible les conciergeries Airbnb", () => {
  const calendar = buildCalendarContext(new Date("2026-07-30T10:00:00Z"));

  const { audience } = chooseAudience(calendar, [], {
    serviceType: "hôtellerie",
    subject: "entrée d'un logement préparé pour des voyageurs",
    notableElements: ["table d'accueil"],
    isBeforeAfter: false,
    quality: "publiable",
  });

  assert.equal(audience.id, "conciergerie-airbnb");
});

test("les cibles tournent sur une quinzaine de jours", () => {
  const seen = new Set<string>();
  const history: HistoryEntry[] = [];

  for (let day = 1; day <= 14; day += 1) {
    const calendar = buildCalendarContext(
      new Date(Date.UTC(2026, 8, day, 10, 0, 0)),
    );
    const { audience } = chooseAudience(calendar, history, null);
    seen.add(audience.id);

    history.unshift({
      id: String(day),
      date: calendar.date,
      angle: "conseil-nettoyage",
      audience: audience.id,
      topic: `sujet ${day}`,
      fingerprint: `texte ${day}`,
      hashtags: [],
      serviceType: null,
    });
  }

  // Au moins six cibles distinctes : aucune ne monopolise le calendrier.
  assert.ok(seen.size >= 6, `seulement ${seen.size} cible(s) distincte(s)`);
  assert.ok(seen.has("conciergerie-airbnb"));
});

test("une cible en période de repos n'est pas reprise le lendemain", () => {
  const history: HistoryEntry[] = [
    {
      id: "1",
      date: "2026-09-04",
      angle: "conseil-nettoyage",
      audience: "conciergerie-airbnb",
      topic: "sujet",
      fingerprint: "texte",
      hashtags: [],
      serviceType: null,
    },
  ];

  const calendar = buildCalendarContext(new Date("2026-09-05T10:00:00Z"));
  const { audience } = chooseAudience(calendar, history, null);
  assert.notEqual(audience.id, "conciergerie-airbnb");
});

test("l'heure de publication tient compte du fuseau et de l'heure d'été", () => {
  // Le 15 janvier, Paris est à UTC+1 : 08h00 locales = 07h00 UTC.
  const winter = timeInZone(new Date("2026-01-15T00:00:00Z"), "08:00", "Europe/Paris");
  assert.equal(winter.toISOString(), "2026-01-15T07:00:00.000Z");

  // Le 15 juillet, Paris est à UTC+2 : 08h00 locales = 06h00 UTC.
  const summer = timeInZone(new Date("2026-07-15T00:00:00Z"), "08:00", "Europe/Paris");
  assert.equal(summer.toISOString(), "2026-07-15T06:00:00.000Z");
});

test("un créneau déjà passé est repoussé dans le futur", () => {
  const now = new Date("2026-07-15T14:00:00Z");
  const slot = nextPublicationSlot("08:00", "Europe/Paris", now);
  assert.ok(slot.getTime() > now.getTime());
});

test("un sujet trop long est raccourci pour le visuel", () => {
  const long = "a".repeat(200);
  const headline = toHeadline(long);
  assert.ok(headline.length <= 110);
  assert.ok(headline.endsWith("…"));

  assert.equal(toHeadline("traces sur les vitres."), "Traces sur les vitres");
});
