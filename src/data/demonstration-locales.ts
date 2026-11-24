/*
 * Locales of the browser demonstration published by Platforms, each under
 * /demonstrations/wasm/<locale>/ (see the browser tutorial). Shared by the
 * demonstration page, the home page and the tutorial.
 *
 * The root of the Platforms site only redirects to the English locale, so
 * every locale has its own address here and the page does not wait for the
 * redirect.
 */
export const DEMONSTRATION_URL = "https://platforms.xila.dev/";

/** The page of this site that shows the demonstration in a frame. */
export const DEMONSTRATION_PAGE = "/demonstration/";

export const DEFAULT_LOCALE = "en";

export interface DemonstrationLocale {
  code: string;
  label: string;
  /** The demonstration in this locale, on the Platforms site. */
  href: string;
}

export const DEMONSTRATION_LOCALES: DemonstrationLocale[] = [
  { code: "en", label: "English" },
  { code: "fr", label: "Français" },
  { code: "es", label: "Español" },
  { code: "de", label: "Deutsch" },
  { code: "pt-BR", label: "Português (Brasil)" },
  { code: "it", label: "Italiano" },
  { code: "pl", label: "Polski" },
  { code: "ja", label: "日本語" },
  { code: "zh-CN", label: "简体中文" },
].map(({ code, label }) => ({
  code,
  label,
  href: `${DEMONSTRATION_URL}demonstrations/wasm/${code}/`,
}));
