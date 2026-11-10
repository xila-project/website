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
  if (pathname.startsWith("/rustdoc/")) {
    return null;
  }
  if (pathname.endsWith("/")) pathname += "index.html";
  else if (!path.extname(pathname)) pathname += "/index.html";
  return {
    file: path.join(output, pathname),
    anchor: decodeURIComponent(target.hash.slice(1)),
  };
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

  const rustdocOutput = path.join(output, "rustdoc");
  const rendered = files(output, ".html").filter(
    (file) =>
      file !== rustdocOutput && !file.startsWith(rustdocOutput + path.sep),
  );
  const documents = new Map(
    rendered.map((file) => {
      const html = fs.readFileSync(file, "utf8");
      const ids = new Set(
        [...html.matchAll(/\bid=(?:"([^"]*)"|'([^']*)')/g)].map((match) =>
          decode(match[1] ?? match[2]),
        ),
      );
      return [file, { html, ids }];
    }),
  );

  let links = 0;
  let anchors = 0;
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
    pages: pages.length,
    links,
    anchors,
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
  if (result.errors.length) {
    console.error(result.errors.join("\n"));
    process.exitCode = 1;
    return;
  }
  console.log(
    `Validated ${result.pages} source pages, ${result.links} rendered internal links, ${result.anchors} anchors, and ${result.references} source references (${Object.entries(
      result.sourceChecks,
    )
      .map(([repository, count]) => `${repository}: ${count}`)
      .join(", ")}).`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main();
