import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { API_INDEX_VERSION } from "./api-index.mjs";
import { getApiIndexPath } from "./api-links.mjs";

// Downloads the API index of the published site into public/api/, so that a
// build without rustdoc (pull requests, local writing) resolves and checks
// `rust:` and Api links against the API that is online.

export const PUBLISHED_API_INDEX_URL =
  "https://www.xila.dev/api/api-index.json";

export async function downloadApiIndex({
  destination = getApiIndexPath(),
  url = PUBLISHED_API_INDEX_URL,
  fetchFunction = fetch,
} = {}) {
  if (fs.existsSync(path.join(path.dirname(destination), "host")))
    return { status: "staged" };
  let response;
  try {
    response = await fetchFunction(url);
  } catch (error) {
    return { status: "unavailable", reason: error.message };
  }
  if (!response.ok)
    return { status: "unavailable", reason: `HTTP ${response.status}` };
  const index = await response.json();
  if (index.version !== API_INDEX_VERSION)
    return {
      status: "unavailable",
      reason: `version ${index.version}, expected ${API_INDEX_VERSION}`,
    };
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, JSON.stringify(index));
  return { status: "downloaded" };
}

async function main() {
  const result = await downloadApiIndex();
  if (result.status === "staged")
    console.log("API pages are staged: their index is kept.");
  else if (result.status === "downloaded")
    console.log(`Downloaded ${PUBLISHED_API_INDEX_URL}.`);
  else
    console.log(
      `API index not downloaded (${result.reason}): API links are not checked.`,
    );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  await main();
