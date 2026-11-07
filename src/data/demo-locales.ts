/*
 * Locales of the browser demonstration published by Platforms: English at
 * the site root, the others under /demonstrations/wasm/<locale>/ (see the
 * browser tutorial). Shared by the header menu, the home page and the
 * tutorial.
 */
export const DEMO_URL = "https://platforms.xila.dev/";

export interface DemoLocale {
  code: string;
  label: string;
  href: string;
}

export const DEMO_LOCALES: DemoLocale[] = [
  { code: "en", label: "English" },
  { code: "fr", label: "Français" },
  { code: "es", label: "Español" },
  { code: "de", label: "Deutsch" },
  { code: "pt-BR", label: "Português (Brasil)" },
  { code: "it", label: "Italiano" },
  { code: "pl", label: "Polski" },
].map(({ code, label }) => ({
  code,
  label,
  href: code === "en" ? DEMO_URL : `${DEMO_URL}demonstrations/wasm/${code}/`,
}));
