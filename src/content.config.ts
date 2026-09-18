import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

// Um arquivo .md por guia em src/content/guias/. `estado: rascunho` não gera página.
const guias = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/guias" }),
  schema: z.object({
    titulo: z.string(),
    resumo: z.string(),
    estado: z.enum(["rascunho", "publicado"]).default("rascunho"),
    ordem: z.number().default(99),
  }),
});

export const collections = { guias };
