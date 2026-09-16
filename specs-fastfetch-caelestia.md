# Página web: fastfetch estilo caelestia shell

## Objetivo

Criar uma página estática que reproduza visualmente a saída do `fastfetch` como ele
aparece no **caelestia-dots** rodando em CachyOS, mas preenchida com as specs reais da
máquina Windows descritas abaixo.

Não é para ler o hardware via JavaScript — os dados são estáticos, vindos de um
`fastfetch` já executado. Ver a seção "Restrições" no fim.

---

## 1. Dados reais da máquina (fonte da verdade)

Saída do `fastfetch` no Windows, já normalizada:

```json
{
  "user": "Administrator",
  "hostname": "WIN-SPUV9JUQ99V",
  "os": "Windows 10 Pro (22H2) x86_64",
  "kernel": "WIN32_NT 10.0.19045.6456",
  "uptime": "8 hours, 21 mins",
  "shell": "CMD 10.0.19041.4355",
  "wm": "Desktop Window Manager 10.0.19041.4355",
  "wmTheme": "Custom - #D7D7D7 (System: Dark, Apps: Dark)",
  "theme": "Fluent",
  "icons": "Recycle Bin",
  "font": "Segoe UI (12pt) [Caption / Menu / Message / Status]",
  "cursor": "mini.cur (32px)",
  "terminal": "Windows Console 10.0.19041.5198",
  "terminalFont": "Consolas (16pt)",
  "cpu": {
    "model": "Intel(R) Core(TM) i3-8350K",
    "cores": 4,
    "freq": "4.00 GHz"
  },
  "gpu": {
    "model": "NVIDIA GeForce RTX 2060 SUPER",
    "freq": "2.16 GHz",
    "vram": "7.82 GiB",
    "type": "Discrete"
  },
  "memory": { "used": "7.77 GiB", "total": "15.92 GiB", "percent": 49 },
  "swap": { "used": "70.97 MiB", "total": "3.50 GiB", "percent": 2 },
  "displays": [
    { "name": "24G2W1G4", "resolution": "1920x1080", "size": "24\"", "refresh": "144 Hz", "type": "External", "primary": true },
    { "name": "K222HQL",  "resolution": "1920x1080", "size": "22\"", "refresh": "60 Hz",  "type": "External", "primary": false }
  ],
  "disks": [
    { "mount": "C:\\", "used": "133.81 GiB", "total": "447.11 GiB", "percent": 30, "fs": "NTFS", "external": false },
    { "mount": "D:\\", "used": "4.68 GiB",   "total": "7.01 GiB",   "percent": 67, "fs": "FAT32", "external": true }
  ],
  "localIp": "192.168.1.105/24",
  "locale": "pt_BR.CP850"
}
```

Manter esse objeto em um arquivo separado (`data/specs.json` ou `src/specs.ts`) para
que atualizar as specs não exija mexer no layout.

---

## 2. O layout do caelestia (o que copiar)

Referência: `fastfetch/config.jsonc` no repositório `caelestia-dots/caelestia`
(GPL-3.0). Características do layout, para reproduzir:

- **Sem logo ASCII.** `"logo": null`. Nada de arte da distro à esquerda — o fetch é
  só uma caixa.
- **Moldura em box-drawing** desenhada com módulos `custom`: linha superior
  `╭───...───╮`, linha inferior `╰───...───╯`, e cada linha de dado começa e termina
  com `│`. A largura interna é fixa.
- **Uma linha por módulo**, com ícone Nerd Font + label em minúsculas à esquerda, e
  o valor **alinhado à direita** com largura fixa de 22 caracteres (`{>22}` no
  fastfetch). É esse alinhamento à direita que dá o visual de coluna limpa.
- **Separador é um espaço simples** (`"separator": " "`), não os dois-pontos do
  fastfetch padrão.
- **`break`** (linha em branco) antes e depois da caixa.

Ordem exata das linhas:

| # | label    | ícone (Nerd Font) | fonte no fastfetch |
|---|----------|-------------------|--------------------|
| 1 | `kernel` | Linux/Tux         | módulo `kernel`, campo release |
| 2 | `uptime` | relógio           | `uptime -p` |
| 3 | `shell`  | terminal          | módulo `shell`, pretty-name |
| 4 | `mem`    | chip/RAM          | `free -m` formatado em GiB |
| 5 | `pkgs`   | caixa/pacote      | módulo `packages`, total |
| 6 | `user`   | pessoa            | `$USER` |
| 7 | `hname`  | monitor/host      | `hostnamectl hostname` |
| 8 | `distro` | `󰻀` (logo distro) | módulo `os`, pretty-name |

### Cores

O caelestia define uma paleta de 4 constantes: branco base + três slots de cor 256
(`38;5;16`, `17`, `18`). Esses slots **não** são cores fixas — o caelestia sobrescreve
a paleta ANSI do terminal em tempo real a partir do wallpaper (Material You), injetando
sequências de `~/.local/state/caelestia/sequences.txt`. Distribuição:

- moldura, ícones neutros e labels: branco/base
- `kernel`, `shell`, `user`: cor de destaque 1
- `mem`: cor de destaque 2
- `distro`: cor de destaque 3

Na web, expor isso como CSS custom properties (`--ff-base`, `--ff-accent-1/2/3`) e
deixar um seletor de tema trocando os valores. Sugestão de default escuro estilo
Material You:

```css
--ff-bg:        #12131a;
--ff-base:      #d4d6e0;
--ff-accent-1:  #a8c7fa;
--ff-accent-2:  #c3b1f5;
--ff-accent-3:  #f5b8c8;
```

### Terminal ao redor

O caelestia roda `fastfetch` como `fish_greeting` dentro do **foot**:

- fonte **JetBrains Mono Nerd Font**, tamanho 12
- cursor em barra (beam)
- fundo com **alpha 0.78 + blur**

Traduzir para: card com `background: color-mix(...)` semitransparente,
`backdrop-filter: blur(...)`, cantos arredondados generosos, e prompt do starship
fake acima do fetch (ex.: `~ ❯ fastfetch`) para dar contexto.

**Atenção aos ícones:** os glifos são Nerd Font. Ou embutir uma webfont Nerd Font
(subset só com os glifos usados, senão o download é enorme), ou substituir por SVGs
inline com o mesmo peso visual. Escolher uma abordagem e ser consistente.

---

## 3. Adaptação Windows → layout caelestia

O layout do caelestia é minimalista e não mostra CPU, GPU, discos nem monitores.
As specs interessantes desta máquina ficariam de fora. Proposta:

**Bloco A — a caixa caelestia fiel** (hero da página), com o mapeamento:

| linha caelestia | valor Windows |
|-----------------|---------------|
| kernel | `10.0.19045.6456` |
| uptime | `8 hours, 21 mins` |
| shell  | `CMD 10.0.19041.4355` |
| mem    | `7.77 GiB / 15.92 GiB` |
| pkgs   | **não existe no Windows** — trocar por `gpu` ou omitir a linha |
| user   | `Administrator` |
| hname  | `WIN-SPUV9JUQ99V` |
| distro | `Windows 10 Pro (22H2)` |

O ícone de distro `󰻀` deve virar o logo do Windows.

**Bloco B — caixas extras no mesmo estilo**, abaixo, para o resto: hardware
(CPU/GPU), displays, discos com barra de uso, rede/locale. Mesma moldura, mesmas
cores, mesma regra de alinhamento à direita. Assim mantém a identidade visual sem
mentir sobre o que o caelestia realmente mostra.

Para as barras de porcentagem (mem 49%, swap 2%, C: 30%, D: 67%), usar blocos
Unicode (`█` / `░`) em vez de `<div>`, para não quebrar o clima de terminal.

---

## 4. Restrições técnicas (importante)

O navegador **não** consegue ler as specs reais do PC. O máximo disponível é:

- `navigator.hardwareConcurrency` → nº de threads, sem modelo
- `navigator.deviceMemory` → RAM arredondada para potência de 2, só em Chromium
- `WEBGL_debug_renderer_info` → string da GPU, cada vez mais mascarada
- User-Agent / UA-CH → OS genérico

Modelo de CPU, VRAM, uptime, discos, monitores: **impossível**. Por isso os dados são
estáticos. Se quiser um toque "ao vivo", o único item honestamente dinâmico é o
**uptime da sessão da página** (contador desde o load) — deixar claro que é isso, ou
não fazer.

---

## 5. Entregável

- Página estática única, sem framework obrigatório (HTML + CSS + um JS pequeno para
  renderizar a partir do JSON já basta).
- Responsiva: em telas estreitas a moldura de largura fixa quebra. Ter um fallback
  que remove as bordas `│` e vira lista simples abaixo de ~600px.
- Sem `localStorage` se for rodar dentro de artifact do Claude.
- Dados em arquivo separado do layout.

### Licenças

- `neofetch` (arquivado desde abr/2024) e `fastfetch`: MIT — logos ASCII e formatos
  reutilizáveis com atribuição.
- `caelestia-dots/caelestia`: GPL-3.0 — se copiar código/config de lá, respeitar a
  licença. Reimplementar o layout do zero a partir da descrição acima evita o
  problema.
