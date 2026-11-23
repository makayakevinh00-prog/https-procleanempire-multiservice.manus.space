/** Ce qui est montré d'un ménage en direct (voir la fonction SQL job_live). La position et le tracé ne sont renseignés que pendant le trajet. */
export type LiveJob = {
  job: string; title: string; status: string; date: string; window_start: string; window_end: string; cleaner: string | null;
  dest: [number, number] | null; arrived_at: string | null; moving: boolean; pos: [number, number] | null; seen_at: string | null;
  eta_at: string | null; eta_minutes: number | null; eta_traffic: boolean; trail: [number, number][]; client?: string; cleaner_full?: string;
};
