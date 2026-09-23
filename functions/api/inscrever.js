/**
 * Cafuaçu · inscrição na newsletter, versão BREVO (reserva; NÃO está ativa. O site usa o EmailOctopus até o Brevo reativar).
 * Substitui o conteúdo de functions/api/inscrever.js no repositório cafuacu-landing (mesmo endereço /api/inscrever).
 *
 * Fluxo: o site manda o e-mail pra cá; esta função chama POST /v3/contacts/doubleOptinConfirmation do Brevo, que
 * manda o e-mail de confirmação (modelo #2, nosso HTML com {{ params.DOIurl }}). Ao clicar, a pessoa entra na lista
 * "Cafuaçu News" (#3) e é levada DIRETO pra https://cafuacu.com.br/confirmado (redirectionUrl).
 *
 * VARIÁVEL no Cloudflare Pages (Settings > Variables and Secrets): só BREVO_API_KEY, tipo "Secret" (criada e colada por ELA).
 * Os números da lista (3, "Cafuaçu News") e do modelo de confirmação (2) ficam fixos aqui: não são segredo.
 */
const LISTA_ID = 3;
const MODELO_CONFIRMACAO_ID = 2;

export async function onRequestPost({ request, env }) {
  const faltando = ["BREVO_API_KEY"].filter((n) => !env[n]);
  if (faltando.length) {
    console.error("faltam as variáveis:", faltando.join(", "));
    return responder({ erro: "servico indisponivel", faltando }, 500);
  }
  let email = "";
  let atributos = {};
  try {
    const corpo = await request.json();
    email = String(corpo.email || "").trim().toLowerCase();
    atributos = lerUtm(corpo);
  } catch {
    return responder({ erro: "pedido invalido" }, 400);
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email) || email.length > 200) {
    return responder({ erro: "esse e-mail parece incompleto" }, 400);
  }
  try {
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
    if (r.status === 201 || r.status === 204) return responder({ ok: true, status: "pending" }, 200);
    const texto = await r.text();
    if (r.status === 400 && /contact.{0,20}already|already.{0,20}exist|duplicate_parameter/i.test(texto) && !/template|list/i.test(texto)) return responder({ ok: true, status: "active" }, 200);
    // detalhe do Brevo fica só no log do servidor: mandar pro cliente vaza configuração
    // interna da lista/conta (estrutura do erro, rate limit do Brevo, etc.)
    console.error("brevo respondeu", r.status, texto.slice(0, 300));
    return responder({ erro: "nao deu pra cadastrar agora" }, 424);
  } catch (e) {
    console.error("falha ao chamar o brevo", e);
    return responder({ erro: "nao deu pra cadastrar agora" }, 502);
  }
}

// UTM do anuncio (qual criativo trouxe a pessoa). Opcional: valor fora do padrao
// e simplesmente descartado, sem erro, pra nunca travar uma inscricao.
// Atributos criados no Brevo (texto, categoria normal) em 23/09/2026.
const UTM_CAMPOS = { utm_source: "UTM_SOURCE", utm_medium: "UTM_MEDIUM", utm_campaign: "UTM_CAMPAIGN", utm_content: "UTM_CONTENT" };
function lerUtm(corpo) {
  const saida = {};
  if (!corpo || typeof corpo !== "object") return saida;
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
