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

## Pra colocar no ar (checklist)

1. Cloudflare Pages > o projeto > Settings > Build: comando `npm run build`, saída `dist`, variável `NODE_VERSION=22`.
2. Conferir o preview da branch antes de mesclar na `main`.
3. Domínio `cafuacu.com.br` como domínio personalizado do projeto (hoje a raiz está numa página "domínio estacionado" da Hostinger).
4. Regra de redirecionamento no Cloudflare: `assine.cafuacu.com.br/*` → `https://cafuacu.com.br/newsletter` (301).
5. Beehiiv: Settings > Emails > Opt in redirect URL → `cafuacu.com.br/confirmado`.
