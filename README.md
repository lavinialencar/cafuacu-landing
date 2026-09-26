# cafuacu-site

O site da Cafuaçu (`cafuacu.com.br`). Feito com [Astro](https://astro.build), servido pelo Cloudflare Pages.
A leitura é do macro pro micro: **páginas → layouts → componentes → estilos e dados**.

## Mapa do site (macro)

| Endereço | O que é | Arquivo |
|---|---|---|
| `/` | hub: porta de entrada, com os cartões de tudo | `src/pages/index.astro` |
| `/newsletter` | a landing de assinatura (visual próprio) | `src/pages/newsletter/index.astro` |
| `/confirmado` | depois do clique de confirmação do Brevo | `src/pages/confirmado.astro` |
| `/guias` e `/guias/<guia>` | os guias | `src/pages/guias/`, conteúdo em `src/content/guias/` |
| `/privacidade` | política de privacidade | `src/pages/privacidade.astro` |
| `/api/inscrever` | inscrição no Brevo (função no servidor) | `functions/api/inscrever.js` |

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
    layouts/                as duas "molduras": Base (head) e Pagina (visual da landing)
    components/             peças reutilizáveis: Mascote, Logo, Rodape, Filtros
    styles/                 tokens.css (marca), pagina.css (visual das páginas), paginas/ (CSS da landing)
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

Cada push na `main` publica no Cloudflare Pages. Configuração do projeto lá: build command `npm run build`, diretório de saída `dist`. A variável `BREVO_API_KEY` (Secret) fica em Settings > Variables and Secrets. Detalhes e histórico das decisões em `docs/arquitetura.md`.

## Segurança

- **Cabeçalhos**: `public/_headers` (CSP, HSTS, X-Frame-Options e companhia). O `npm run build` roda `scripts/csp.mjs`, que troca o marcador do `script-src` pelos sha256 de cada `<script>` inline do `dist` e falha o build se algum script ficar fora da CSP. Script externo novo (analytics, widget) precisa entrar no `script-src` do `_headers`.
- **Inscrição** (`functions/api/inscrever.js`): aceita só a origem do site, só JSON, até 2 KB; tem campo isca contra robô; responde igual pra e-mail novo e pra quem já assina; loga uma linha JSON por pedido, sem e-mail e sem IP. `npm test` confere tudo isso sem rede.

### Passo a passo no Cloudflare (feito por ela)

**1. Turnstile (anti-robô do formulário).** Fica desligado até as duas chaves existirem.

1. No painel da Cloudflare: **Turnstile > Add widget**. Nome: `cafuacu newsletter`. Hostnames: `cafuacu.com.br`, `www.cafuacu.com.br` e o domínio `.pages.dev` do projeto (pra funcionar nos previews). Widget mode: **Managed**. Criar.
2. Copiar a **Site Key** e a **Secret Key**.
3. **Workers & Pages > projeto do site > Settings > Variables and Secrets**, em Production (e em Preview, se quiser testar lá):
   - `PUBLIC_TURNSTILE_SITE_KEY` = Site Key, tipo **Text** (é pública e entra no HTML na hora do build).
   - `TURNSTILE_SECRET_KEY` = Secret Key, tipo **Secret**.
4. Publicar de novo (**Deployments > Retry deployment** no último, ou o próximo push), porque a Site Key só entra no site num build novo.

Criar as duas juntas. Só o Secret sem a Site Key faz toda inscrição falhar (o formulário não manda token).

**2. Limite de tentativas por IP.** Escolher um:

- **KV (recomendado, grátis, 5 tentativas a cada 10 minutos por IP):** **Storage & Databases > KV > Create namespace** (`cafuacu-rate-limit`). Depois, no projeto do Pages, **Settings > Bindings > Add > KV namespace**, nome da variável `RATE_LIMIT_KV`, apontando pro namespace criado. Publicar de novo. O IP é guardado só como hash e some sozinho em 10 minutos.
- **Regra no WAF:** no domínio `cafuacu.com.br`, **Security > WAF > Rate limiting rules > Create rule**. Expressão: `(http.request.uri.path eq "/api/inscrever" and http.request.method eq "POST")`. Contar por **IP**. Ideal: 5 pedidos em 10 minutos, ação **Block** por 10 minutos. No plano Free a janela e o bloqueio só vão até 10 segundos; aí usar 3 pedidos em 10 segundos, bloqueio de 10 segundos, e preferir o KV acima pro limite longo.

Se um dia existir um binding de Rate Limiting chamado `RATE_LIMITER`, a função usa ele no lugar do KV.
