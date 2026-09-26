/**
 * Cafuaçu · inscrição na newsletter pelo BREVO (provedor ativo desde 21/09/2026).
 *
 * Fluxo: o site manda o e-mail pra cá; esta função chama POST /v3/contacts/doubleOptinConfirmation do Brevo, que
 * manda o e-mail de confirmação (modelo #2, nosso HTML com {{ params.DOIurl }}). Ao clicar, a pessoa entra na lista
 * "Cafuaçu News" (#3) e é levada DIRETO pra https://cafuacu.com.br/confirmado (redirectionUrl).
 *
 * Proteções, na ordem: origem do próprio site (403), Content-Type JSON (415), corpo até 2 KB (413),
 * limite por IP (429, só se houver binding), campo isca "site" (bot recebe o mesmo "ok" e nada acontece),
 * validação do e-mail (400), Turnstile (403, só se configurado). A resposta de sucesso é sempre a mesma,
 * exista ou não o e-mail na lista, pra ninguém usar o formulário pra descobrir quem assina.
 *
 * VARIÁVEIS no Cloudflare Pages (Settings > Variables and Secrets), todas criadas e coladas por ELA:
 *   BREVO_API_KEY          Secret, obrigatória.
 *   TURNSTILE_SECRET_KEY   Secret, opcional. Sem ela, o Turnstile fica desligado. Ver README.
 * BINDINGS opcionais (Settings > Bindings): RATE_LIMITER (Rate Limiting) ou RATE_LIMIT_KV (KV). Sem nenhum, vale a
 * regra de rate limit do WAF descrita no README.
 * Os números da lista (3) e do modelo de confirmação (2) ficam fixos aqui: não são segredo.
 */
const LISTA_ID = 3;
const MODELO_CONFIRMACAO_ID = 2;
const LIMITE_CORPO = 2048;
const ORIGENS = new Set(["https://cafuacu.com.br", "https://www.cafuacu.com.br"]);
// Limite do KV (o binding de Rate Limiting tem o limite configurado no próprio binding).
const KV_MAX = 5;
const KV_JANELA_S = 600;

export async function onRequestPost(contexto) {
  // Uma linha JSON por pedido, sem e-mail e sem IP.
  const log = { evento: "inscricao" };
  let resposta;
  try {
    resposta = await processar(contexto, log);
  } catch (e) {
    log.erro = String((e && e.message) || e).slice(0, 200);
    resposta = responder({ erro: "nao deu pra cadastrar agora" }, 502);
  }
  log.status = resposta.status;
  console.log(JSON.stringify(log));
  return resposta;
}

async function processar({ request, env }, log) {
  if (!origemPermitida(request.headers.get("origin"), request.url)) {
    log.origem = "recusada";
    return responder({ erro: "origem nao permitida" }, 403);
  }
  const tipo = (request.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  if (tipo !== "application/json") {
    log.validacao = "content_type";
    return responder({ erro: "pedido invalido" }, 415);
  }
  if (Number(request.headers.get("content-length") || 0) > LIMITE_CORPO) {
    log.validacao = "corpo_grande";
    return responder({ erro: "pedido grande demais" }, 413);
  }
  if (!env.BREVO_API_KEY) {
    // detalhe só no log; o cliente recebe mensagem genérica
    log.config = "falta BREVO_API_KEY";
    return responder({ erro: "servico indisponivel" }, 500);
  }
  const limite = await dentroDoLimite(request, env);
  log.rate_limit = limite;
  if (limite === "excedido") return responder({ erro: "muitas tentativas, tenta daqui a pouco" }, 429);

  const texto = await lerCorpo(request);
  if (texto === null) {
    log.validacao = "corpo_grande";
    return responder({ erro: "pedido grande demais" }, 413);
  }
  let corpo;
  try {
    corpo = JSON.parse(texto);
  } catch {
    corpo = null;
  }
  if (!corpo || typeof corpo !== "object") {
    log.validacao = "json_invalido";
    return responder({ erro: "pedido invalido" }, 400);
  }
  // Campo isca: gente não vê, bot preenche. Mesma resposta de sucesso, e nada vai pro Brevo.
  if (corpo.site) {
    log.honeypot = true;
    return pendente();
  }
  const email = String(corpo.email || "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email) || email.length > 200) {
    log.validacao = "email_invalido";
    return responder({ erro: "esse e-mail parece incompleto" }, 400);
  }
  log.validacao = "ok";

  if (env.TURNSTILE_SECRET_KEY) {
    const ok = await turnstileValido(env.TURNSTILE_SECRET_KEY, corpo.turnstile, request.headers.get("cf-connecting-ip"));
    log.turnstile = ok ? "ok" : "falhou";
    if (!ok) return responder({ erro: "verificacao falhou" }, 403);
  } else {
    log.turnstile = "desligado";
  }

  const atributos = lerUtm(corpo);
  const r = await fetch("https://api.brevo.com/v3/contacts/doubleOptinConfirmation", {
    method: "POST",
    headers: { "api-key": env.BREVO_API_KEY, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      email,
      includeListIds: [LISTA_ID],
      templateId: MODELO_CONFIRMACAO_ID,
      redirectionUrl: "https://cafuacu.com.br/confirmado",
      ...(Object.keys(atributos).length ? { attributes: atributos } : {}),
    }),
  });
  log.brevo = r.status;
  if (r.status === 201 || r.status === 204) return pendente();
  const detalhe = await r.text();
  // Já assinante: mesma resposta de quem é novo, pra não revelar quem está na lista.
  if (r.status === 400 && /contact.{0,20}already|already.{0,20}exist|duplicate_parameter/i.test(detalhe) && !/template|list/i.test(detalhe)) {
    return pendente();
  }
  // detalhe do Brevo fica só no log do servidor: mandar pro cliente vaza configuração interna
  log.brevo_detalhe = detalhe.slice(0, 300);
  return responder({ erro: "nao deu pra cadastrar agora" }, 424);
}

function pendente() {
  return responder({ ok: true, status: "pending" }, 200);
}

// Produção e www, mais o preview do próprio projeto no pages.dev (só quando o pedido chegou nesse mesmo host).
function origemPermitida(origem, url) {
  if (!origem) return false;
  if (ORIGENS.has(origem)) return true;
  const host = new URL(url).host;
  return host.endsWith(".pages.dev") && origem === `https://${host}`;
}

// Lê o corpo com teto de bytes, sem confiar no content-length. Passou do teto: null.
async function lerCorpo(request) {
  if (!request.body) return "";
  const leitor = request.body.getReader();
  const partes = [];
  let total = 0;
  for (;;) {
    const { done, value } = await leitor.read();
    if (done) break;
    total += value.byteLength;
    if (total > LIMITE_CORPO) {
      await leitor.cancel();
      return null;
    }
    partes.push(value);
  }
  const tudo = new Uint8Array(total);
  let pos = 0;
  for (const p of partes) {
    tudo.set(p, pos);
    pos += p.byteLength;
  }
  return new TextDecoder().decode(tudo);
}

// Limite por IP, melhor esforço. Sem binding nenhum: "sem_binding" (vale a regra do WAF, ver README).
async function dentroDoLimite(request, env) {
  const ip = request.headers.get("cf-connecting-ip");
  if (!ip) return "sem_ip";
  if (env.RATE_LIMITER && typeof env.RATE_LIMITER.limit === "function") {
    const { success } = await env.RATE_LIMITER.limit({ key: ip });
    return success ? "ok" : "excedido";
  }
  if (env.RATE_LIMIT_KV && typeof env.RATE_LIMIT_KV.get === "function") {
    // ponytail: KV é eventual, uma rajada pode passar um pouco do limite; o binding de Rate Limiting não tem isso.
    const janela = Math.floor(Date.now() / 1000 / KV_JANELA_S);
    const chave = `rl:${await sha256(ip)}:${janela}`;
    const n = Number((await env.RATE_LIMIT_KV.get(chave)) || 0);
    if (n >= KV_MAX) return "excedido";
    await env.RATE_LIMIT_KV.put(chave, String(n + 1), { expirationTtl: KV_JANELA_S });
    return "ok";
  }
  return "sem_binding";
}

async function sha256(texto) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function turnstileValido(segredo, token, ip) {
  if (typeof token !== "string" || !token || token.length > 2048) return false;
  const dados = new FormData();
  dados.append("secret", segredo);
  dados.append("response", token);
  if (ip) dados.append("remoteip", ip);
  const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: dados });
  const resultado = await r.json().catch(() => ({}));
  return resultado.success === true;
}

// UTM do anuncio (qual criativo trouxe a pessoa). Opcional: valor fora do padrao
// e simplesmente descartado, sem erro, pra nunca travar uma inscricao.
// Atributos criados no Brevo (texto, categoria normal) em 23/09/2026.
const UTM_CAMPOS = { utm_source: "UTM_SOURCE", utm_medium: "UTM_MEDIUM", utm_campaign: "UTM_CAMPAIGN", utm_content: "UTM_CONTENT" };
function lerUtm(corpo) {
  const saida = {};
  for (const [campo, atributo] of Object.entries(UTM_CAMPOS)) {
    const v = corpo[campo];
    if (typeof v !== "string") continue;
    const limpo = v.trim().toLowerCase();
    if (/^[a-z0-9_-]{1,60}$/.test(limpo)) saida[atributo] = limpo;
  }
  return saida;
}

function responder(objeto, status) {
  return new Response(JSON.stringify(objeto), { status, headers: { "Content-Type": "application/json; charset=utf-8" } });
}
