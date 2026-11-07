import { defineCollection, z } from "astro:content";
import { docsLoader } from "@astrojs/starlight/loaders";
import { docsSchema } from "@astrojs/starlight/schema";
import { ExtendDocsSchema } from "starlight-theme-black/schema";

const docs = defineCollection({
  loader: docsLoader(),
  schema: docsSchema({
    extend: ExtendDocsSchema.extend({ docType: z.string().optional() }),
  }),
});

export const collections = { docs };
