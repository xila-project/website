/*
 * The state of a header item for the current page. Shared by the header
 * components and by the script that marks the theme's mobile menu.
 * The site ignores trailing slashes, so the comparison uses whole path
 * segments.
 */
export type NavigationState = "page" | "true" | undefined;

const trim = (path: string) => path.replace(/\/+$/, "");

/**
 * `"page"` when `pathname` is the page of `href`, `"true"` when it is below
 * it (inside the section), otherwise `undefined`. Values are those of
 * `aria-current`.
 */
export function navigationState(
  pathname: string,
  href: string,
): NavigationState {
  const current = trim(pathname);
  const base = trim(href);
  if (current === base) return "page";
  if (current.startsWith(`${base}/`)) return "true";
  return undefined;
}
