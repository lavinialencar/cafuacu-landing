# cafuacu-site

O site da Cafuaçu (`cafuacu.com.br`). Feito com [Astro](https://astro.build), servido pelo Cloudflare Pages.
A leitura é do macro pro micro: **páginas → layouts → componentes → estilos e dados**.

## Mapa do site (macro)

| Endereço | O que é | Arquivo |
|---|---|---|
| `/` | hub: porta de entrada, com os cartões de tudo | `src/pages/index.astro` |
| `/newsletter` | a landing de assinatura (visual próprio) | `src/pages/newsletter/index.astro` |
| `/confirmado` | depois do clique de confirmação do beehiiv | `src/pages/confirmado.astro` |
| `/guias` e `/guias/<guia>` | os guias | `src/pages/guias/`, conteúdo em `src/content/guias/` |
| `/privacidade` | política de privacidade | `src/pages/privacidade.astro` |
| `/api/inscrever` | inscrição no beehiiv (função no servidor) | `functions/api/inscrever.js` |

## Estrutura de pastas (micro)

```
cafuacu-site/
  README.md                 este mapa
  docs/                     decisões e como publicar (ver docs/arquitetura.md)
  astro.config.mjs          configuração do Astro
  package.json
  .node-version             versão do Node no Cloudflare
  functions/                função de servidor (Cloudflare exige que fique na raiz)
    api/inscrever.js
  public/                   arquivos servidos como estão: ícones, og.png, logo, _redirects
  src/
    pages/                  uma página por endereço (o nome do arquivo é o endereço)
    layouts/                as três "molduras": Base, Casa (escura), Leitura (clara)
    components/             peças reutilizáveis: Mascote, Logo, Rodape, Filtros
    styles/                 tokens.css (marca), casa.css, leitura.css, paginas/ (CSS de página)
    scripts/                JavaScript de página (hoje só newsletter.js)
    content/guias/          um .md por guia
    data/hub.json           os cartões do hub
```

## Rotinas comuns

- **Publicar um guia:** `src/content/guias/<nome>.md`, trocar `estado: rascunho` por `estado: publicado`. A página `/guias/<nome>` nasce sozinha.
- **Mudar um cartão do hub:** editar `src/data/hub.json` (`estado` "no ar" ou "em breve").
- **Mudar cor ou fonte da marca:** só em `src/styles/tokens.css`.
- **Rodar local:** `npm install`, depois `npm run dev`. Pra conferir o que vai ao ar: `npm run build && npm run preview`.

## Publicação

Cada push na `main` publica no Cloudflare Pages. Configuração do projeto lá: build command `npm run build`, diretório de saída `dist`. As chaves `BEEHIIV_API_KEY` e `BEEHIIV_PUB_ID` ficam em Settings > Variables and Secrets. Detalhes e histórico das decisões em `docs/arquitetura.md`.
