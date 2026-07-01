// ─────────────────────────────────────────────────────────────
// Deepo · Amendment 13 (תיקון 13) exposure calculator — core logic
// Every figure below is traced to an official PPA penalty slide.
// Roy-gated: keep behind SHOW_EXPOSURE_CALC until legal sign-off.
//
// MODELING ASSUMPTIONS Roy should eyeball (only judgment calls here):
//  1. "headline" = near-certain audit penalties (fixed + per-subject processing).
//     Per-person escalators (sec 11, direct-mail) are shown as "up to" lines,
//     NOT summed into the headline, to keep the number credible.
//  2. Bucket size buckets use the TOP of each range as the modeling N.
//  3. reg='full' / sec='full' zero out the matching buckets (residual risk = 0
//     for display purposes). Not a legal claim of immunity; a display model.
// ─────────────────────────────────────────────────────────────

export type SizeKey = 'tiny' | 'small' | 'mid' | 'large' | 'xlarge';
export type Tri = 'none' | 'partial' | 'full';

export interface CalcInput {
  size: SizeKey;      // Q1 number of data subjects
  sensitive: boolean; // Q2 sensitive data?
  reg: Tri;           // Q3 registration + documentation status
  sec: Tri;           // Q4 information-security status
}

export interface Bucket {
  id: string;
  label: string;      // Hebrew, shown in breakdown
  ref: string;        // statute ref for the tooltip / Roy audit
  amount: number;     // NIS at current answers
  open: boolean;      // currently exposed?
}

export interface CalcResult {
  n: number;
  doubled: boolean;
  headline: number;       // sum of OPEN core buckets — the big number
  ceiling: number;        // full statutory ceiling incl. escalators
  core: Bucket[];         // headline components
  escalators: Bucket[];   // per-person "up to" lines
  civilPerPerson: number; // Image 2: up to 10k/plaintiff, no proof of damage
  criminal: boolean;      // personal criminal exposure applies
}

const N_MAP: Record<SizeKey, number> = {
  tiny: 1_000, small: 10_000, mid: 100_000, large: 500_000, xlarge: 1_000_000,
};

export function calcExposure(inp: CalcInput): CalcResult {
  const { size, sensitive, reg, sec } = inp;
  const n = N_MAP[size];
  const dbl = n >= 1_000_000 ? 2 : 1; // >1M subjects doubles penalties (Images 5,8,10)

  const core: Bucket[] = [];

  // A · Registration & notice group — flat 150k, ×2 if >1M (Image 5)
  core.push({
    id: 'reg', label: 'רישום והודעה על מאגר', ref: 'עיצום 150,000 ₪',
    amount: 150_000 * dbl, open: reg === 'none',
  });

  // C · Unlawful / unauthorized processing — 4/8 per subject, floor 200k, ×2 (Images 6,7)
  core.push({
    id: 'process', label: 'עיבוד מידע שלא כדין או ללא הרשאה', ref: 'סעיף 8(ג) · רצפה 200,000 ₪',
    amount: Math.max(n * (sensitive ? 8 : 4), 200_000) * dbl, open: reg !== 'full',
  });

  // E · Privacy breaches not tied to DB size — flat 15k (Image 3)
  core.push({
    id: 'rights', label: 'זכויות עיון, תיקון ומחיקה', ref: 'עיצום 15,000 ₪',
    amount: 15_000, open: reg !== 'full',
  });

  // F · Data-security regulations — tier × security level, ×2 (Image 8)
  {
    const lvl = sensitive ? 'high' : 'medium';
    const TIER = {
      severe: { medium: 80_000, high: 320_000 },
      most:   { medium: 40_000, high: 160_000 },
      light:  { medium: 20_000, high: 80_000 },
    } as const;
    const tier = sec === 'none' ? 'severe' : sec === 'partial' ? 'most' : 'light';
    core.push({
      id: 'security', label: 'הפרת תקנות אבטחת מידע', ref: 'תקנות אבטחת מידע',
      amount: TIER[tier][lvl] * dbl, open: sec !== 'full',
    });
  }

  // Escalators (per-person) — shown as "up to", never summed into headline
  const escalators: Bucket[] = [
    {
      id: 'notice', label: 'הפרת חובת יידוע (סעיף 11)', ref: '50–100 ₪ לכל אדם',
      amount: Math.max(n * (sensitive ? 100 : 50), 30_000), open: reg !== 'full',
    },
    {
      id: 'directmail', label: 'ניהול מאגר דיוור ישיר ללא רישום', ref: '2–4 ₪ לכל נושא מידע',
      amount: Math.max(n * (sensitive ? 4 : 2), sensitive ? 40_000 : 20_000) * dbl, open: false,
    },
  ];

  const headline = core.filter(b => b.open).reduce((s, b) => s + b.amount, 0);
  const ceiling =
    core.reduce((s, b) => s + b.amount, 0) +
    escalators.reduce((s, b) => s + b.amount, 0);

  return {
    n, doubled: dbl === 2, headline, ceiling, core, escalators,
    civilPerPerson: 10_000,
    criminal: reg !== 'full', // personal criminal exposure (Image 11) when core duties unmet
  };
}

export const fmtNis = (x: number) => '₪' + x.toLocaleString('en-US');
