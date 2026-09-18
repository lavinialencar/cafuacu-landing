# Arquitetura do site

Decisões de 18/09/2026.

## Por que um site só, na raiz

A landing sozinha em `assine.cafuacu.com.br` não comporta hub, guias, loja e canal. Tudo passa a morar em `cafuacu.com.br`, com um template só. A landing continua sendo uma página dentro do site (`/newsletter`) e **não** vira o hub: o hub é a página inicial (`/`), com o visual das páginas Casa.

## Três molduras (layouts)

| Layout | Visual | Usada em |
|---|---|---|
| `Base` | só o `<head>`, ícones, fonte e tokens | por todas |
| `Casa` | escura, mascote no topo, conteúdo centralizado, rodapé escuro | `/`, `/confirmado`, `/guias`, 404 |
| `Leitura` | clara, texto longo | `/privacidade`, `/guias/<guia>` |

A landing `/newsletter` usa só a `Base` e tem visual próprio, de propósito.

## Endereços antigos

`public/_redirects` mantém `/obrigado` e `/privacidade.html` apontando pros novos. O beehiiv ainda tem `assine.cafuacu.com.br/obrigado` como destino pós-confirmação; trocar pra `https://cafuacu.com.br/confirmado` quando a raiz estiver no Cloudflare Pages.

## Pra colocar no ar (checklist)

1. Cloudflare Pages > o projeto > Settings > Build: comando `npm run build`, saída `dist`, variável `NODE_VERSION=22`.
2. Conferir o preview da branch antes de mesclar na `main`.
3. Domínio `cafuacu.com.br` como domínio personalizado do projeto (hoje a raiz está numa página "domínio estacionado" da Hostinger).
4. Regra de redirecionamento no Cloudflare: `assine.cafuacu.com.br/*` → `https://cafuacu.com.br/newsletter` (301).
5. Beehiiv: Settings > Emails > Opt in redirect URL → `cafuacu.com.br/confirmado`.
