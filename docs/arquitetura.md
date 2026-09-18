# Arquitetura do site

Decisões de 18/09/2026.

## Por que um site só, na raiz

A landing sozinha em `assine.cafuacu.com.br` não comporta hub, guias, loja e canal. Tudo passa a morar em `cafuacu.com.br`, com um template só. A landing continua sendo uma página dentro do site (`/newsletter`) e **não** vira o hub: o hub é a página inicial (`/`), com o visual da landing.

## Duas molduras (layouts)

| Layout | O que é | Usada em |
|---|---|---|
| `Base` | só o `<head>`, ícones, fonte e tokens | por todas |
| `Pagina` | o visual da landing: topo escuro com mascote, faixa âmbar opcional, corpo claro, fecho escuro opcional, rodapé claro | `/`, `/confirmado`, `/guias`, `/guias/<guia>`, `/privacidade`, 404 |

Decisão dela (18/09, noite): todo o site usa o visual da landing, que começa escuro e vira claro. A landing `/newsletter` tem CSS próprio (`src/styles/paginas/newsletter.css`) porque tem seções e o formulário que as outras não têm, mas parte dos mesmos tokens e do mesmo topo.

## Endereços antigos

`public/_redirects` mantém `/obrigado` e `/privacidade.html` apontando pros novos. O beehiiv ainda tem `assine.cafuacu.com.br/obrigado` como destino pós-confirmação; trocar pra `https://cafuacu.com.br/confirmado` quando a raiz estiver no Cloudflare Pages.

## No ar desde 18/09/2026

Feito nessa data, na ordem:

1. Cloudflare Pages (`cafuacu-landing`) > Settings > Build: comando `npm run build`, saída `dist`. O Node vem do `.node-version`.
2. Branch `site-raiz` mesclada na `main` (commit cfc711f). O site antigo ficou no ar até o novo compilar.
3. Domínio `cafuacu.com.br` ligado ao projeto (o Cloudflare trocou o registro A `2.57.91.91`, da página estacionada da Hostinger, por um CNAME pro projeto).
4. Duas regras em Cloudflare > `cafuacu.com.br` > Rules > Redirect Rules:
   - `www.*` vai pra a raiz (301, mantém os parâmetros da URL).
   - Só a raiz de `assine.cafuacu.com.br` vai pra `https://cafuacu.com.br/newsletter` (301, mantém os parâmetros). Os outros caminhos de `assine.` seguem funcionando, como `/obrigado`.
5. Beehiiv > Settings > Emails > Opt in redirect URL: `cafuacu.com.br/confirmado`.

Endereços de sempre: `cafuacu.com.br` (hub), `/newsletter`, `/confirmado`, `/guias`, `/privacidade`. Preview de branch: `https://<branch>.cafuacu-landing.pages.dev`, sem as chaves do beehiiv (a inscrição responde erro 500 ali de propósito).

## Revisão do site (decisão dela, 18/09/2026)

Quando a 1ª edição sair, e depois todo mês, revisar o site inteiro:

- **Textos que dependem de fase**: tudo que diz "em breve" ou "enquanto a 1ª edição não chega" (`src/data/hub.json`, `src/pages/confirmado.astro`, `src/pages/guias/index.astro`, selo de `/newsletter`). Quando o canal ou um guia sair, o cartão vira link de verdade.
- **Links**: afiliados, beehiiv, Instagram, Telegram. Conferir se algum caiu ou se o produto saiu de estoque.
- **Páginas**: abrir todas no celular e no desktop, e testar a inscrição de ponta a ponta.
