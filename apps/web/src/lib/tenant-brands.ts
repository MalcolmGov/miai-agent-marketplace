/**
 * White-label brands for the personal assistant.
 *
 * The assistant is sold B2B2C: a brand/carrier (Vodacom, MTN, Airtel) offers it to their customers,
 * and MyInstantAI-direct consumers get the default. Each brand is a tenant (the id doubles as the
 * memory tenant id from PR #49), so switching brand switches the whole context — theme AND the
 * isolated memory bucket. In a real carrier deployment the brand is fixed by the tenant; the
 * on-screen switcher is a demo/preview affordance for showing prospects their own skin.
 *
 * Colours are each brand's own palette, used as accent tokens the UI already themes from. `ink` is
 * the text colour that sits ON the accent (white on the reds, near-black on MTN's yellow), so
 * buttons and the user's chat bubbles stay readable per brand.
 */

export type Brand = {
  /** Tenant id — also the workspaceId sent to the backend so memory scopes to this brand. */
  id: string;
  /** Display name / wordmark. */
  name: string;
  /** One-line positioning shown under the assistant title. */
  tagline: string;
  accent: string;
  accentBright: string;
  accentDim: string;
  /** Text colour on top of the accent (buttons, user bubbles). */
  accentInk: string;
};

export const BRANDS: Brand[] = [
  {
    id: "myinstantai",
    name: "MyInstantAI",
    tagline: "Your personal AI — email, calendar, reminders and more.",
    accent: "#3dd6c6",
    accentBright: "#6aefe0",
    accentDim: "#1f9e92",
    accentInk: "#041614",
  },
  {
    id: "vodacom",
    name: "Vodacom",
    tagline: "Your Vodacom assistant — sorted, everyday.",
    accent: "#e60000",
    accentBright: "#ff3b3b",
    accentDim: "#b30000",
    accentInk: "#ffffff",
  },
  {
    id: "mtn",
    name: "MTN",
    tagline: "Your MTN assistant — everywhere you go.",
    accent: "#ffcb05",
    accentBright: "#ffd93b",
    accentDim: "#d9ab00",
    accentInk: "#1a1a1a",
  },
  {
    id: "airtel",
    name: "Airtel",
    tagline: "Your Airtel assistant — always with you.",
    accent: "#ed1c24",
    accentBright: "#ff4d54",
    accentDim: "#c00f16",
    accentInk: "#ffffff",
  },
];

export const DEFAULT_BRAND_ID = "myinstantai";

const BY_ID: Record<string, Brand> = Object.fromEntries(BRANDS.map((b) => [b.id, b]));

/** Resolve a brand by id, falling back to the MyInstantAI default. */
export function getBrand(id: string | null | undefined): Brand {
  return (id && BY_ID[id]) || BY_ID[DEFAULT_BRAND_ID];
}

/** The CSS custom properties that re-skin the accent tokens for a brand. */
export function brandThemeVars(brand: Brand): Record<string, string> {
  return {
    "--accent": brand.accent,
    "--accent-bright": brand.accentBright,
    "--accent-dim": brand.accentDim,
    "--accent-ink": brand.accentInk,
  };
}
