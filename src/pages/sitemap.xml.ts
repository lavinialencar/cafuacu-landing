// Sitemap gerado a cada build: páginas do site mais as edições publicadas em public/edicoes.
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const base = "https://cafuacu.com.br";
const paginas = ["/", "/newsletter", "/guias", "/guias/cafe", "/guias/equipamento", "/edicoes"];

export function GET() {
  const dir = join(process.cwd(), "public", "edicoes");
  let edicoes: string[] = [];
  try {
    edicoes = readdirSync(dir).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d) && statSync(join(dir, d)).isDirectory());
  } catch {}
  const hoje = new Date().toISOString().slice(0, 10);
  const urls = [
    ...paginas.map((p) => ({ loc: base + (p === "/" ? "/" : p), mod: hoje })),
    ...edicoes.map((d) => ({ loc: `${base}/edicoes/${d}/`, mod: d })),
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `  <url><loc>${u.loc}</loc><lastmod>${u.mod}</lastmod></url>`)
    .join("\n")}\n</urlset>\n`;
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
}
