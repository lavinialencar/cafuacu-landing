// Checagem rápida da função de inscrição, sem rede: `npm test`.
import assert from "node:assert/strict";
import { onRequestPost } from "../functions/api/inscrever.js";

const logs = [];
console.log = (l) => logs.push(l);
let brevo = [];
let respostaBrevo = { status: 201, texto: "" };
let turnstileOk = true;
globalThis.fetch = async (url, init) => {
  if (String(url).includes("turnstile")) return new Response(JSON.stringify({ success: turnstileOk }));
  brevo.push(JSON.parse(init.body));
  return new Response(respostaBrevo.texto || null, { status: respostaBrevo.status });
};

const env = { BREVO_API_KEY: "chave-de-teste" };
function pedido(corpo, { origem = "https://cafuacu.com.br", tipo = "application/json", url = "https://cafuacu.com.br/api/inscrever", cabecalhos = {} } = {}) {
  const h = { "content-type": tipo, "cf-connecting-ip": "203.0.113.9", ...cabecalhos };
  if (origem) h.origin = origem;
  return new Request(url, { method: "POST", headers: h, body: typeof corpo === "string" ? corpo : JSON.stringify(corpo) });
}
const chamar = async (req, e = env) => { const r = await onRequestPost({ request: req, env: e }); return { status: r.status, corpo: await r.json() }; };
const ok = { email: "Alguem@Exemplo.com", utm_source: "instagram" };

assert.equal((await chamar(pedido(ok, { origem: "https://mal.example" }))).status, 403);
assert.equal((await chamar(pedido(ok, { origem: null }))).status, 403);
assert.equal((await chamar(pedido(ok, { tipo: "text/plain" }))).status, 415);
assert.equal((await chamar(pedido(ok, { cabecalhos: { "content-length": "5000" } }))).status, 413);
assert.equal((await chamar(pedido({ email: "a@b.co", x: "y".repeat(3000) }))).status, 413);
assert.equal((await chamar(pedido("{nao json"))).status, 400);
assert.equal((await chamar(pedido({ email: "sem-arroba" }))).status, 400);

const semChave = await chamar(pedido(ok), {});
assert.equal(semChave.status, 500);
assert.ok(!JSON.stringify(semChave.corpo).includes("BREVO"), "500 não pode citar a variável");

brevo = [];
const isca = await chamar(pedido({ ...ok, site: "http://spam" }));
assert.deepEqual(isca, { status: 200, corpo: { ok: true, status: "pending" } });
assert.equal(brevo.length, 0, "isca não chama o Brevo");

const novo = await chamar(pedido(ok));
assert.deepEqual(novo.corpo, { ok: true, status: "pending" });
assert.equal(brevo[0].email, "alguem@exemplo.com");
assert.deepEqual(brevo[0].attributes, { UTM_SOURCE: "instagram" });

respostaBrevo = { status: 400, texto: '{"code":"duplicate_parameter","message":"Contact already exist"}' };
assert.deepEqual((await chamar(pedido(ok))).corpo, novo.corpo, "já assinante recebe a mesma resposta");
respostaBrevo = { status: 201, texto: "" };

const preview = "https://abc123.cafuacu-site.pages.dev";
assert.equal((await chamar(pedido(ok, { origem: preview, url: preview + "/api/inscrever" }))).status, 200);
assert.equal((await chamar(pedido(ok, { origem: "https://outro.pages.dev", url: preview + "/api/inscrever" }))).status, 403);

const comTurnstile = { ...env, TURNSTILE_SECRET_KEY: "segredo" };
assert.equal((await chamar(pedido(ok), comTurnstile)).status, 403, "sem token");
assert.equal((await chamar(pedido({ ...ok, turnstile: "tok" }), comTurnstile)).status, 200);
turnstileOk = false;
assert.equal((await chamar(pedido({ ...ok, turnstile: "tok" }), comTurnstile)).status, 403);

const kv = new Map();
const comKv = { ...env, RATE_LIMIT_KV: { get: async (k) => kv.get(k) ?? null, put: async (k, v) => kv.set(k, v) } };
const status = [];
for (let i = 0; i < 6; i++) status.push((await chamar(pedido(ok), comKv)).status);
assert.deepEqual(status, [200, 200, 200, 200, 200, 429]);
assert.equal((await chamar(pedido(ok), { ...env, RATE_LIMITER: { limit: async () => ({ success: false }) } })).status, 429);

for (const l of logs) {
  const j = JSON.parse(l);
  assert.equal(j.evento, "inscricao");
  assert.ok(!/exemplo\.com|203\.0\.113/.test(l), "log sem e-mail e sem IP");
}
process.stdout.write(`ok, ${logs.length} pedidos testados\n`);
