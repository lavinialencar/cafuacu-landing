/**
 * Cafuaçu · inscrição na newsletter
 * Cloudflare Pages Function. Vira o endereço /api/inscrever no mesmo domínio
 * do site, porque o caminho do arquivo é functions/api/inscrever.js.
 *
 * POR QUE ELE EXISTE: a chave da API do beehiiv não pode ficar no HTML.
 * Qualquer pessoa abriria o código-fonte da página e copiaria. Esta função
 * roda no servidor da Cloudflare e guarda a chave lá.
 *
 * DUAS VARIÁVEIS PRECISAM SER CADASTRADAS NO PAINEL DO PAGES,
 * em Settings > Variables and Secrets, tipo "Secret":
 *   BEEHIIV_API_KEY   a chave da API, em Settings > API do beehiiv
 *   BEEHIIV_PUB_ID    o ID da publicação, começa com "pub_"
 */

export async function onRequestPost({ request, env }) {
  if (!env.BEEHIIV_API_KEY || !env.BEEHIIV_PUB_ID) {
    console.error("faltam as variáveis BEEHIIV_API_KEY ou BEEHIIV_PUB_ID");
    return responder({ erro: "servico indisponivel" }, 500);
  }

  // ---- lê e valida o e-mail ----
  let email = "";
  try {
    const corpo = await request.json();
    email = String(corpo.email || "").trim().toLowerCase();
  } catch {
    return responder({ erro: "pedido invalido" }, 400);
  }

  const pareceEmail = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email);
  if (!pareceEmail || email.length > 200) {
    return responder({ erro: "esse e-mail parece incompleto" }, 400);
  }

  // ---- cadastra no beehiiv ----
  // O double opt-in fica ligado na configuração da publicação, então a
  // pessoa ainda recebe o e-mail de confirmação antes de entrar na lista.
  try {
    const r = await fetch(
      `https://api.beehiiv.com/v2/publications/${env.BEEHIIV_PUB_ID}/subscriptions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.BEEHIIV_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          reactivate_existing: false,
          send_welcome_email: true,
          utm_source: "landing",
          utm_medium: "site",
          utm_campaign: "cafuacu-org",
        }),
      }
    );

    if (!r.ok) {
      console.error("beehiiv respondeu", r.status, await r.text());
      return responder({ erro: "nao deu pra cadastrar agora" }, 502);
    }

    return responder({ ok: true }, 200);
  } catch (e) {
    console.error("falha ao chamar o beehiiv", e);
    return responder({ erro: "nao deu pra cadastrar agora" }, 502);
  }
}

function responder(objeto, status) {
  return new Response(JSON.stringify(objeto), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
