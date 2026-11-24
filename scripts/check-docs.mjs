import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

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
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)));
}

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
    api: pathname.startsWith("/api/"),
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
  // own links. They are staged only when rustdoc was built (deployment and
  // the rustdoc job); otherwise links to them are counted as skipped.
  const apiOutput = path.join(output, "api");
  const apiStaged = fs.existsSync(apiOutput);
  const strictApi = environment.XILA_STRICT_API_LINKS === "1";
  const apiIdentifiers = new Map();
  const warnings = new Set();
  const rendered = files(output, ".html").filter(
    (file) => file !== apiOutput && !file.startsWith(apiOutput + path.sep),
  );
  const documents = new Map(
    rendered.map((file) => {
      const html = fs.readFileSync(file, "utf8");
      return [file, { html, ids: readIdentifiers(html) }];
    }),
  );

  let links = 0;
  let anchors = 0;
  let apiLinks = 0;
  let skippedApiLinks = 0;
  for (const [file, { html }] of documents) {
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
        if (!apiStaged) {
          skippedApiLinks += 1;
          continue;
        }
        apiLinks += 1;
        // Until the documentation links are migrated, a broken API link is
        // an error only in strict mode.
        const report = strictApi ? errors : warnings;
        if (!fs.existsSync(target.file)) {
          report.add(
            `${path.relative(output, file)}: missing API link ${decode(href)}`,
          );
        } else if (target.anchor) {
          if (!apiIdentifiers.has(target.file))
            apiIdentifiers.set(
              target.file,
              readIdentifiers(fs.readFileSync(target.file, "utf8")),
            );
          if (!apiIdentifiers.get(target.file).has(target.anchor))
            report.add(
              `${path.relative(output, file)}: missing API anchor ${decode(href)}`,
            );
        }
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
    references,
    sourceChecks,
    omittedRepositories: [...omittedRepositories],
  };
}

function main() {
  const result = validateDocs();
  if (result.omittedRepositories?.length) {
    console.log(
      `Source checkout checks skipped for: ${result.omittedRepositories.join(", ")}`,
    );
  }
  if (result.skippedApiLinks) {
    console.log(
      `API link checks skipped for ${result.skippedApiLinks} links: the API pages are not staged (run npm run docs:rustdoc).`,
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
    `Validated ${result.pages} source pages, ${result.links} rendered internal links, ${result.anchors} anchors, ${result.apiLinks} API links, and ${result.references} source references (${Object.entries(
      result.sourceChecks,
    )
      .map(([repository, count]) => `${repository}: ${count}`)
      .join(", ")}).`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main();
