// Roda depois do astro build: calcula o sha256 de cada <script> inline do dist,
// escreve no Content-Security-Policy do dist/_headers e confere que a CSP libera
// todo <script> do site. Qualquer script não liberado faz o build falhar.
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";

const DIST = "dist";
const MARCADOR = "HASHES_DE_SCRIPT";
const html = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? html(join(d, e.name)) : e.name.endsWith(".html") ? [join(d, e.name)] : []);

const inline = new Map(); // hash -> páginas
const externos = new Map(); // src -> páginas
for (const arq of html(DIST)) {
  for (const [, attrs, corpo] of readFileSync(arq, "utf8").matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const tipo = (attrs.match(/\btype\s*=\s*["']?([^"'\s>]+)/i) || [])[1];
    if (tipo && !/^(module|text\/javascript|application\/javascript)$/i.test(tipo)) continue; // JSON-LD não executa
    const src = (attrs.match(/\bsrc\s*=\s*["']?([^"'\s>]+)/i) || [])[1];
    const [mapa, chave] = src ? [externos, src] : [inline, `'sha256-${createHash("sha256").update(corpo).digest("base64")}'`];
    mapa.set(chave, (mapa.get(chave) || []).concat(arq.slice(DIST.length + 1)));
  }
}

const caminho = join(DIST, "_headers");
const cabecalhos = readFileSync(caminho, "utf8");
if (!cabecalhos.includes(` ${MARCADOR} `)) throw new Error(`${caminho} sem o marcador ${MARCADOR}`);
const final = cabecalhos.replace(` ${MARCADOR} `, ` ${[...inline.keys()].sort().join(" ")} `);
const csp = final.split("\n").find((l) => l.trim().startsWith("Content-Security-Policy:"));
if (csp.length > 2000) throw new Error(`CSP com ${csp.length} caracteres, o Cloudflare aceita até 2000`);
const fontes = csp.match(/script-src ([^;]+)/)[1].split(/\s+/);

let falhas = 0;
for (const [h, paginas] of inline) console.log(`ok  inline ${h}  (${paginas.length} página(s))`);
for (const [src, paginas] of externos) {
  const u = new URL(src, "https://cafuacu.com.br/");
  const ok = u.origin === "https://cafuacu.com.br" ? fontes.includes("'self'") : fontes.includes(u.origin);
  if (!ok) falhas++;
  console.log(`${ok ? "ok " : "NÃO"} src    ${src}  (${paginas.join(", ")})`);
}
if (falhas) throw new Error(`${falhas} script(s) fora da CSP`);
writeFileSync(caminho, final);
console.log(`CSP: ${inline.size} hash(es), ${externos.size} script(s) externo(s), ${csp.length} caracteres`);
