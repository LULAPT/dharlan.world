# dharlan.world

Site pessoal / blog do dharlan (`@isatekk`). Estética old web / neocities:
HTML escrito à mão, CSS puro, JS vanilla em módulos ES. **Sem build step, sem
framework, sem `package.json`.** O que está no repositório é exatamente o que
vai pro ar.

Base original: [mozartsempiano/old-neocities-mozartsempiano](https://github.com/mozartsempiano/old-neocities-mozartsempiano)
(arquivado). Este repositório é a reescrita/rebrand — ainda existem resquícios
do site antigo (ver "Sobras do site original" no fim).

## Deploy e URLs

- Hospedado na **Vercel** (`vercel.json`), repo `LULAPT/dharlan.world`, branch `main`.
- `cleanUrls: true` + `trailingSlash: true` → **`sobre.html` é servido como `/sobre/`**.
  Por isso todo link interno usa a forma com barra (`/sobre/`, `/galeria/arte/`),
  nunca `.html`. `serve.json` replica isso pro `npx serve` local.
- Analytics da Vercel é injetado por JS ([analytics.js](assets/js/analytics.js)),
  não por tag no HTML.
- O rodapé ainda diz "Hospedado em Neocities" — texto legado, não é verdade.

## Rodar localmente

Precisa de servidor HTTP (todos os caminhos são absolutos, `/assets/...`, e há
`fetch()` de JSON). Abrir o arquivo direto no navegador não funciona.

```
npx serve
```

## Arquitetura das páginas

Cada `.html` é uma página completa e independente. O `<head>` segue sempre o
mesmo bloco:

```html
<script src="/assets/js/theme-init.js"></script>   <!-- antes de tudo: evita flash de tema -->
<script src="/assets/js/no-inspect.js"></script>
<link rel="stylesheet" href="/assets/css/style.css" />
<link rel="stylesheet" href="/assets/css/<pagina>.css" />
```

E no fim do `<body>`: `<script type="module" src="/assets/js/main.js"></script>`.

**Header e footer não existem no HTML** — são injetados por JS. A página só
declara os contêineres vazios:

| Contêiner | Onde |
|---|---|
| `<header id="header-expandida">` | só a [home.html](home.html) (ASCII art gigante + nav centralizada) |
| `<header id="header-compacta">` | todas as páginas internas |
| `<header id="header-mobile">` | sempre junto com um dos dois acima |
| `<footer>` | rodapé completo |
| `<footer id="footer-index">` | rodapé mínimo, só na [index.html](index.html) |

Sem header nenhum: [index.html](index.html), [2kki.html](2kki.html),
[anotacoes.html](anotacoes.html), [not_found.html](not_found.html),
[mplace/index.html](mplace/index.html) (essa usa a classe `floating-nav`).

Três páginas fogem do padrão do `<head>` acima e são praticamente autônomas —
não carregam `style.css` e trazem o próprio visual inteiro:
[anotacoes.html](anotacoes.html) (só `anotacoes.css`, favicon próprio, filtro SVG
de dither embutido), [2kki.html](2kki.html) (importa `variaveis/fonts/animations`
soltos) e [mplace/index.html](mplace/index.html) (nem `main.js` carrega).

Breadcrumb é HTML manual em cada página:

```html
<div id="nav-atual"><a href="/home/">home</a> > <span class="animate-flicker">sobre</span></div>
```

[page-title.js](assets/js/page-title.js) lê esse `#nav-atual` pra montar o
`<title>` final (`/sobre/ — dharlan`). Páginas sem breadcrumb precisam entrar no
mapa `SEM_BREADCRUMB` daquele arquivo.

### O menu fica em um lugar só

O objeto `links` em [navbar.js](assets/js/navbar.js) é a **única** fonte da
navegação (desktop, dropdowns e menu mobile saem todos dele). Adicionar página
ao menu = editar esse objeto. O CSS da navbar também mora dentro desse arquivo,
como string injetada — não em `assets/css/`. Mesma coisa pro footer em
[footer.js](assets/js/footer.js).

Se a página entrar no menu, atualize também
[sitemap-data.js](assets/js/sitemap-data.js) (a `/sitemap/` é gerada a partir
dele por [sitemap-build.js](assets/js/sitemap-build.js)).

### main.js

[main.js](assets/js/main.js) é o orquestrador: importa e chama tudo no
`DOMContentLoaded` (navbar, footer, título, favicon animado, CRT, fade-in,
tooltips, menu mobile, temas, painel de configurações, dither...).

Também controla os **efeitos sazonais**, todos condicionados a
`localStorage.festiveEffects !== "false"`:

- Dezembro inteiro → neve + paleta verde
- 25–31 de outubro → efeito de Halloween + paleta laranja
- 26 de maio → confete, uma vez por sessão

## Temas e CSS

- [variaveis.css](assets/css/variaveis.css) define tudo em custom properties.
  Cores derivadas usam `lch(from ...)` — mexer no `--clr-<cor>-a30` recalcula as
  variações a0…a50 sozinho.
- Tema = atributo `data-theme` no `<html>`. `dark` é o padrão e **não** seta
  atributo nenhum. Temas registrados em [themes.json](assets/json/themes.json):
  `dark`, `light`, `steam-green`. Existe um `amarelado` só no CSS, fora do JSON
  (não aparece no seletor).
- Adicionar tema = bloco `:root[data-theme="x"]` em `variaveis.css` **+** entrada
  no `themes.json`.
- [style.css](assets/css/style.css) importa `variaveis.css`, `fonts.css`,
  `animations.css` e `icones.css`. Os outros CSS são por página e entram só na
  página correspondente.
- Fontes locais em `assets/fontes/`, declaradas em [fonts.css](assets/css/fonts.css)
  (Redaction, Voxel, DotGothic, ANK/DOS-V, Kraut, gabriele-d). `image-rendering:
  pixelated` e `-webkit-font-smoothing: none` são globais — o visual serrilhado é
  intencional.

## Dados em JSON

Conteúdo dinâmico vem de `assets/json/` via `fetch`, não de HTML hardcoded:

| Arquivo | Usado por |
|---|---|
| [pensamentosposts.json](assets/json/pensamentosposts.json) | índice da `/pensamentos/` e o card "Última postagem" da home. **Precisa estar ordenado do mais novo pro mais antigo** — `last-post.js` só pega `posts[0]` |
| [updates.json](assets/json/updates.json) | changelog (home mostra só a entrada mais recente; `/changelog/` mostra tudo). Data em `YYYY-MM-DD`, itens aceitam HTML |
| [themes.json](assets/json/themes.json) | seletor de temas |
| [kaomojis.json](assets/json/kaomojis.json) / [kaomoji-parts.json](assets/json/kaomoji-parts.json) | `/kaomojis/` |

Publicar um "pensamento" = criar o HTML em `pensamentos/<ano>/<slug>.html` **e**
adicionar a entrada no topo do `pensamentosposts.json` (formato de data:
`"mai 22, 2023"`, mês pt-BR abreviado). Existe também
[pensamentos.xml](pensamentos/pensamentos.xml) (RSS) que é mantido à mão.

Entradas do changelog com menos de 14 dias ganham um ícone "novo" automático.

## Serviços externos

Tudo client-side, sem chaves de API, e **tudo pode falhar sem quebrar a página**
— mantenha os `try/catch` e os fallbacks:

- **Last.fm** — usuário `xw4`, via `lastfm-last-played.biancarosa.com.br`
  ([lastfm-status.js](assets/js/lastfm-status.js))
- **Discord** — user id `682694935631233203`, via `discorduserstatus-2-0.onrender.com`,
  poll de 1 min ([discord-status.js](assets/js/discord-status.js))
- **nikki.top** — perfil 376, ocupando o lugar do status.cafe (que está quebrado).
  Sem CORS, então passa por proxy: Render próprio primeiro, `allorigins.win` de
  reserva ([statuscafe-custom.js](assets/js/statuscafe-custom.js))
- jQuery 3.7.1 vem de CDN (`ajax.googleapis.com`) e é usado pelos tooltips
  ([jquery.style-my-tooltips.js](assets/js/jquery.style-my-tooltips.js))

## Chaves de localStorage / sessionStorage

`current-theme`, `switchCRT`, `festiveEffects`, `nsfwBlur`, `mplace-chunks`
(localStorage) · `bootTerminalSeen`, `confettiDone` (sessionStorage).

## Detalhes que costumam pegar

- **Boot terminal da index**: [boot-terminal.js](assets/js/boot-terminal.js) roda
  um fake "verify you are human" + boot BIOS com áudio antes de liberar a
  `/index/`. Roda **uma vez por sessão** (`bootTerminalSeen`) — pra testar de
  novo, limpe o sessionStorage ou abra aba anônima. A ASCII art do `dharlan` está
  duplicada em [index.html](index.html) e em [navbar.js](assets/js/navbar.js);
  mudar uma exige mudar a outra.
- **Áudio precisa de gesto do usuário.** O boot usa Web Audio (`GainNode`) pra
  passar de volume 1. Safari/iOS já quebrou aqui antes (ver commits
  `debug safari`, `removendo telas quebradas apenas no iOS`) — teste mudanças da
  index no Safari.
- **Favicon animado**: navegadores só mostram o primeiro frame de um `.gif` em
  `<link rel="icon">`. [animated-favicon.js](assets/js/animated-favicon.js)
  contorna isso desenhando frames num canvas.
- **[no-inspect.js](assets/js/no-inspect.js)** bloqueia menu de contexto, F12 e
  Ctrl+U. É decorativo, não segurança — o próprio arquivo diz isso. Também
  atrapalha depuração: se algo estranho acontecer com o clique direito, é ele.
- `<meta name="darkreader-lock" />` em todas as páginas impede o Dark Reader de
  estragar os temas.
- **Tooltips**: use o atributo `title`; o script move o texto pra
  `data-smt-title` e remove o `title`. Setar `el.title` depois faz o tooltip
  nativo voltar por cima do customizado — atualize `dataset.smtTitle`.
- Imagens com classe `dither` são processadas por
  [dither.js](assets/js/dither.js) / [bayer-dither.js](assets/js/bayer-dither.js).
- `assets/css/sonhos.css` existe sem página correspondente (não há `sonhos.html`).
- **`/curriculo/` está linkado mas não existe** — aparece na home, no
  `sitemap-data.js` e no changelog, e retorna 404. O PDF está em
  `assets/pdf/curriculo_mozart_mattar.pdf`.

## Sobras do site original

Ainda referenciam o dono anterior; corrija junto quando encostar nos arquivos:

- `<meta name="author" content="Mozart Mattar" />` em praticamente todo `.html`
- [meta-tags](assets/json/meta-tags) (template de SEO, não usado por nenhuma página)
- [.github/FUNDING.yml](.github/FUNDING.yml) → `mozartsempiano`
- `assets/img/mozartmt-logo-white.png` (logo da index) e
  `assets/img/mozartsempiano-btn-01.jpg` (botão 88x31 da home)
- `assets/pdf/curriculo_mozart_mattar.pdf`
- `temp/` — pasta de imagens soltas, sem uso no site

## Estilo do código

- Tabs pra indentar, HTML e CSS formatados no padrão do Prettier.
- **Comentários e nomes em português.** Variáveis, ids, classes e arquivos:
  `carregarNavbar`, `#col-centro`, `.caixinha`, `assets/fontes/`.
- Propriedades CSS em ordem alfabética dentro do bloco (padrão dominante).
- Comentários explicam o *porquê*, principalmente quando é gambiarra de
  navegador — mantenha esse tom.
- Idioma do site: pt-BR (`<html lang="pt-br">`).

## Contatos e identidade

E-mail `dharlan20203@outlook.com` · GitHub `LULAPT` · Instagram `xanaxirl` ·
Twitter/X `isatekk` · Last.fm `xw4` · nikki.top id 376 ·
Discord `682694935631233203`.

## Não faça

- Não introduza framework, bundler ou dependência npm — o projeto é
  deliberadamente handcoded (tem até o banner "handcoded" na home).
- Não troque links internos pra `.html`; quebra o padrão de URL do deploy.
- Não "limpe" a estética: pixelado, CRT, ASCII, GIFs, blinkies e banners 88x31
  são o ponto do site, não sujeira.
- Não mova CSS de navbar/footer pra `assets/css/` sem falar antes — hoje ele é
  injetado por JS de propósito, já que header e footer não existem no HTML.
