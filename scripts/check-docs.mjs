import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { API_INDEX_FILE, checkApiUrl, readApiIndex } from "./api-index.mjs";
import { API_LINK_HIDDEN_TEXT } from "./remark-api-links.mjs";
import {
  EXTERNAL_LINK_CLASS,
  EXTERNAL_LINK_HIDDEN_TEXT,
  SOURCE_LINK_CLASS,
  SOURCE_LINK_HIDDEN_TEXT,
} from "./rehype-link-icons.mjs";
import {
  checkCodeReference,
  SOURCE_REPOSITORY_NAMES,
} from "./source-checkouts.mjs";

const defaultRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

function files(directory, extension) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) return files(full, extension);
    return entry.name.endsWith(extension) ? [full] : [];
  });
}

function decode(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    );
}

// The entry page of the APIs is a page of the site, not a rustdoc page.
const API_PAGE = "/api/index.html";

const types = {
  tutorials: "tutorial",
  "how-to": "how-to",
  reference: "reference",
  explanation: "explanation",
};
function resolveTarget(output, current, href) {
  const currentUrl =
    "https://docs.invalid/" +
    path
      .relative(output, current)
      .split(path.sep)
      .join("/")
      .replace(/index\.html$/, "");
  const target = new URL(decode(href), currentUrl);
  if (target.origin !== "https://docs.invalid") return null;
  let pathname = decodeURIComponent(target.pathname);
  if (pathname.endsWith("/")) pathname += "index.html";
  else if (!path.extname(pathname)) pathname += "/index.html";
  return {
    file: path.join(output, pathname),
    anchor: decodeURIComponent(target.hash.slice(1)),
    api: pathname.startsWith("/api/") && pathname !== API_PAGE,
  };
}

function readIdentifiers(html) {
  return new Set(
    [...html.matchAll(/\bid=(?:"([^"]*)"|'([^']*)')/g)].map((match) =>
      decode(match[1] ?? match[2]),
    ),
  );
}

export function validateDocs({
  root = defaultRoot,
  source = path.join(root, "src", "content", "docs"),
  output = path.join(root, "dist"),
  environment = process.env,
} = {}) {
  const errors = new Set();
  const pages = [...files(source, ".md"), ...files(source, ".mdx")].sort();

  for (const file of pages) {
    const relative = path.relative(source, file);
    const section = relative.split(path.sep)[0];
    if (!types[section] || /^index\.(md|mdx)$/.test(path.basename(file)))
      continue;
    const frontmatter = fs
      .readFileSync(file, "utf8")
      .match(/^---\r?\n([\s\S]*?)\r?\n---/);
    const metadata = frontmatter?.[1] ?? "";
    const type = metadata.match(/^docType:\s*(.+)$/m)?.[1]?.trim();
    if (type !== types[section])
      errors.add(`${relative}: expected docType ${types[section]}`);
    if (!/^description:\s*\S/m.test(metadata))
      errors.add(`${relative}: missing description`);
  }

  if (!fs.existsSync(output)) {
    errors.add(
      "Build the site with npm run docs:build before validating documentation.",
    );
    return { errors: [...errors], pages: pages.length };
  }

  // The rustdoc pages under /api/ are link targets only: rustdoc checks its
  // own links. The entry page /api/ is a page of the site and is checked as
  // the other pages. Links to them are checked against the API index
  // (dist/api/api-index.json), which is staged with the pages (deployment and
  // the rustdoc job) or downloaded from the site (pull requests). Without an
  // index, they are checked against the staged pages, or counted as skipped.
  const apiOutput = path.join(output, "api");
  const apiIndex = readApiIndex(path.join(apiOutput, API_INDEX_FILE));
  const apiPagesStaged = fs.existsSync(path.join(apiOutput, "host"));
  const strictApi = environment.XILA_STRICT_API_LINKS === "1";
  const apiIdentifiers = new Map();
  const warnings = new Set();
  // Until the documentation links are migrated, a broken API link is an
  // error only in strict mode.
  const apiReport = strictApi ? errors : warnings;
  const apiEntryPage = path.join(output, ...API_PAGE.split("/").slice(1));
  const rendered = files(output, ".html").filter(
    (file) =>
      file === apiEntryPage ||
      (file !== apiOutput && !file.startsWith(apiOutput + path.sep)),
  );
  const documents = new Map(
    rendered.map((file) => {
      const html = fs.readFileSync(file, "utf8");
      return [file, { html, ids: readIdentifiers(html) }];
    }),
  );

  function checkApiPage(target) {
    if (apiIndex) {
      const problem = checkApiUrl(
        apiIndex,
        "/" + path.relative(output, target.file).split(path.sep).join("/"),
        target.anchor,
      );
      // Pages outside the index (source pages, all.html) are accepted
      // when they are staged.
      if (
        !problem ||
        (problem === "unknown API page" &&
          apiPagesStaged &&
          fs.existsSync(target.file))
      )
        return null;
      return problem === "unknown API page"
        ? "missing API link"
        : `missing API anchor`;
    }
    if (!fs.existsSync(target.file)) return "missing API link";
    if (!target.anchor) return null;
    if (!apiIdentifiers.has(target.file))
      apiIdentifiers.set(
        target.file,
        readIdentifiers(fs.readFileSync(target.file, "utf8")),
      );
    return apiIdentifiers.get(target.file).has(target.anchor)
      ? null
      : "missing API anchor";
  }

  let links = 0;
  let anchors = 0;
  let apiLinks = 0;
  let skippedApiLinks = 0;
  let apiTargets = 0;
  let skippedApiTargets = 0;
  for (const [file, { html }] of documents) {
    // `rust:` links and the Api component mark the links that they could
    // not resolve, and those that a build without an index could not check.
    for (const match of html.matchAll(
      /<a\b[^>]*\bdata-api(-error|-unchecked)?=(?:"([^"]*)"|'([^']*)')/g,
    )) {
      if (match[1] === "-unchecked") {
        skippedApiTargets += 1;
        continue;
      }
      apiTargets += 1;
      if (match[1])
        apiReport.add(
          `${path.relative(output, file)}: ${decode(match[2] ?? match[3])}`,
        );
    }

    const visited = new Set();
    for (const match of html.matchAll(
      /<a\b[^>]*\bhref=(?:"([^"]*)"|'([^']*)')/g,
    )) {
      const href = match[1] ?? match[2];
      if (!href || visited.has(href)) continue;
      visited.add(href);
      const target = resolveTarget(output, file, href);
      if (!target) continue;
      if (target.api) {
        if (!apiIndex && !apiPagesStaged) {
          skippedApiLinks += 1;
          continue;
        }
        apiLinks += 1;
        const problem = checkApiPage(target);
        if (problem)
          apiReport.add(
            `${path.relative(output, file)}: ${problem} ${decode(href)}`,
          );
        continue;
      }
      links += 1;
      if (!fs.existsSync(target.file)) {
        errors.add(
          `${path.relative(output, file)}: missing link ${decode(href)}`,
        );
      } else if (target.anchor) {
        anchors += 1;
        if (!documents.get(target.file)?.ids.has(target.anchor)) {
          errors.add(
            `${path.relative(output, file)}: missing anchor ${decode(href)}`,
          );
        }
      }
    }
  }

  // The link convention of src/styles/xila.css: every generated link carries
  // its icon class and a visually hidden text, so that a CodeReference link
  // renders the GitHub icon and "(source on GitHub)", any other external link
  // the external icon and "(external site)", and an API link the kind colour
  // and "(API reference)".
  let sourceLinks = 0;
  let externalLinks = 0;
  let apiReferenceLinks = 0;
  const styleSheetPath = path.join(root, "src", "styles", "xila.css");
  if (fs.existsSync(styleSheetPath)) {
    const styleSheet = fs.readFileSync(styleSheetPath, "utf8");
    if (
      !styleSheet.includes(`${SOURCE_LINK_CLASS}::after`) ||
      !styleSheet.includes("var(--xila-icon-github)") ||
      !styleSheet.includes(`${EXTERNAL_LINK_CLASS}::after`) ||
      !styleSheet.includes("var(--xila-icon-external)")
    )
      errors.add(
        "src/styles/xila.css: the GitHub and external link icons are not drawn",
      );
  }
  for (const [file, { html }] of documents) {
    const relative = path.relative(output, file);
    for (const match of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)) {
      const attributes = match[1];
      const inner = match[2];
      const classes = (attributes.match(/class="([^"]*)"/)?.[1] ?? "")
        .split(/\s+/)
        .filter(Boolean);
      if (classes.includes(SOURCE_LINK_CLASS)) {
        sourceLinks += 1;
        if (!inner.includes(SOURCE_LINK_HIDDEN_TEXT))
          errors.add(
            `${relative}: a source link misses its hidden text "${SOURCE_LINK_HIDDEN_TEXT}"`,
          );
      } else if (classes.includes(EXTERNAL_LINK_CLASS)) {
        externalLinks += 1;
        if (!inner.includes(EXTERNAL_LINK_HIDDEN_TEXT))
          errors.add(
            `${relative}: an external link misses its hidden text "${EXTERNAL_LINK_HIDDEN_TEXT}"`,
          );
      } else if (
        classes.includes("reference-link") &&
        /\bdata-api=/.test(attributes)
      ) {
        apiReferenceLinks += 1;
        if (!inner.includes(API_LINK_HIDDEN_TEXT))
          errors.add(
            `${relative}: an API link misses its hidden text "${API_LINK_HIDDEN_TEXT}"`,
          );
      }
    }
  }

  // Local checkouts are optional by default. CI sets explicit paths and strict
  // mode, so every supported source reference must resolve or the build fails.
  let references = 0;
  const sourceChecks = Object.fromEntries(
    SOURCE_REPOSITORY_NAMES.map((repository) => [repository, 0]),
  );
  const omittedRepositories = new Set();

  for (const file of pages) {
    const text = fs.readFileSync(file, "utf8");
    for (const match of text.matchAll(/<CodeReference\b([^>]*?)\/?\s*>/g)) {
      const attributes = match[1];
      const repo = attributes.match(/\brepo="([^"]+)"/)?.[1] ?? "core";
      const sourcePath = attributes.match(/\bpath="([^"]+)"/)?.[1];
      references += 1;

      const result = checkCodeReference(repo, sourcePath, {
        websiteRoot: root,
        environment,
      });
      if (result.status === "error") {
        errors.add(`${path.relative(source, file)}: ${result.message}`);
      } else if (result.status === "skipped") {
        omittedRepositories.add(repo);
      } else {
        sourceChecks[repo] += 1;
      }
    }
  }

  return {
    errors: [...errors],
    warnings: [...warnings],
    pages: pages.length,
    links,
    anchors,
    apiLinks,
    skippedApiLinks,
    apiTargets,
    skippedApiTargets,
    apiIndex: Boolean(apiIndex),
    references,
    sourceChecks,
    omittedRepositories: [...omittedRepositories],
    sourceLinks,
    externalLinks,
    apiReferenceLinks,
  };
}

function main() {
  const result = validateDocs();
  if (result.omittedRepositories?.length) {
    console.log(
      `Source checkout checks skipped for: ${result.omittedRepositories.join(", ")}`,
    );
  }
  if (result.skippedApiLinks || result.skippedApiTargets) {
    console.log(
      `API link checks skipped for ${result.skippedApiLinks} links and ${result.skippedApiTargets} rust: and Api links: no API index and no API pages (run npm run docs:rustdoc or npm run docs:api-index).`,
    );
  }
  if (result.warnings?.length) {
    console.warn(result.warnings.map((line) => `warning: ${line}`).join("\n"));
  }
  if (result.errors.length) {
    console.error(result.errors.join("\n"));
    process.exitCode = 1;
    return;
  }
  console.log(
    `Validated ${result.pages} source pages, ${result.links} rendered internal links, ${result.anchors} anchors, ${result.apiLinks} API links (${result.apiTargets} rust: and Api links), ${result.references} source references (${Object.entries(
      result.sourceChecks,
    )
      .map(([repository, count]) => `${repository}: ${count}`)
      .join(
        ", ",
      )}), and ${result.sourceLinks} source links, ${result.externalLinks} external links and ${result.apiReferenceLinks} API reference links with their icon and hidden text.`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main();
