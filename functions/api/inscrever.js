/**
 * Cafuaçu · inscrição na newsletter, versão EMAILOCTOPUS (para o dia da virada; ainda NÃO está ativa no site).
 * Substitui o conteúdo de functions/api/inscrever.js no repositório cafuacu-landing (mesmo endereço /api/inscrever).
 *
 * Fluxo: o site manda o e-mail para cá; esta função cadastra o contato na lista do EmailOctopus com status "pending"
 * (API v2: POST /lists/{id}/contacts). Com o opt-in duplo ligado na lista, o EmailOctopus manda o e-mail de confirmação;
 * ao clicar, a pessoa vira "subscribed" e cai na página de sucesso.
 *
 * VARIÁVEIS no painel do Cloudflare Pages (Settings > Variables and Secrets):
 *   EMAILOCTOPUS_API_KEY   tipo "Secret". A chave é criada e colada por ELA; nunca vai pro código nem pro repositório.
 *   EMAILOCTOPUS_LIST_ID   texto: 51b00f02-b52b-11f1-bc17-d3e0a308e6cd
 * Resposta 409 (contato já existe) é tratada como "já assina". A confirmar no envio de teste.
 */
export async function onRequestPost({ request, env }) {
  const faltando = ["EMAILOCTOPUS_API_KEY", "EMAILOCTOPUS_LIST_ID"].filter((n) => !env[n]);
  if (faltando.length) {
    console.error("faltam as variáveis:", faltando.join(", "));
    return responder({ erro: "servico indisponivel", faltando }, 500);
  }
  let email = "";
  try {
    const corpo = await request.json();
    email = String(corpo.email || "").trim().toLowerCase();
  } catch {
    return responder({ erro: "pedido invalido" }, 400);
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email) || email.length > 200) {
    return responder({ erro: "esse e-mail parece incompleto" }, 400);
  }
  try {
    const r = await fetch(`https://api.emailoctopus.com/lists/${env.EMAILOCTOPUS_LIST_ID}/contacts`, {
      method: "POST",
      headers: { Authorization: `Bearer ${env.EMAILOCTOPUS_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ email_address: email, status: "pending" }),
    });
    if (r.status === 201 || r.status === 200) return responder({ ok: true, status: "pending" }, 200);
    if (r.status === 409) return responder({ ok: true, status: "active" }, 200);
    console.error("emailoctopus respondeu", r.status, await r.text());
    return responder({ erro: "nao deu pra cadastrar agora" }, 502);
  } catch (e) {
    console.error("falha ao chamar o emailoctopus", e);
    return responder({ erro: "nao deu pra cadastrar agora" }, 502);
  }
}

function responder(objeto, status) {
  return new Response(JSON.stringify(objeto), { status, headers: { "Content-Type": "application/json; charset=utf-8" } });
}
