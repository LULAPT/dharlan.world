# Diagnóstico: elementos somem no Safari / iOS

> Arquivo de handoff de uma sessão anterior do Claude Code.
> Descartável — apague depois de resolvido.

---

## ⚠️ HIPÓTESE ORIGINAL REFUTADA (2026-09-09)

Teste feito em aparelho real, **iPhone 13 / iOS 18.7 / Safari 26.6.1**, com a
página `/teste-safari/`. Resultado: **20 de 20 verificações passaram, zero
problemas críticos.**

- `lch()` com sintaxe relativa → **suportado**
- `color-mix()` → **suportado**
- `:has()`, optional chaining, WebGL2 → **todos suportados**
- As variáveis derivadas resolvem certo (`--clr-gray-a20` etc.)

**As seções 1, 2 e 4 abaixo estão descartadas para este aparelho.** Não gere os
fallbacks de `lch()`/`color-mix()`: seriam ~100 substituições sem efeito no
problema real. (Ainda teriam valor para iOS < 16.4, mas isso é outra
discussão — não é a causa do que foi relatado.)

### Nova suspeita: `100vh` no iOS

O relatório trouxe um dado revelador: a tela mediu **390x699**, mas um
iPhone 13 tem 390x844 em pixels CSS. No iOS, `100vh` vale a tela **inteira**
(844), ignorando a barra do navegador — os 145px de diferença.

A `/index/` depende de `100vh` em dois pontos:

| Onde | Valor |
|---|---|
| `index.html` (inline no `.container`) | `height: 100vh` |
| `assets/css/index.css` — `.centralizar-start` | `min-height: 100vh` + `justify-content: center` |

Com `justify-content: center` num espaço de 844px enquanto só 699px são
visíveis, o conteúdo nasce ~73px abaixo do centro real e o que estiver na
faixa de baixo sai da tela. Bate com "os itens somem".

**Correção provável:** trocar `100vh` por `100dvh` (dynamic viewport height,
que acompanha a barra) com `100vh` como piso para navegadores antigos:

```css
min-height: 100vh;   /* piso */
min-height: 100dvh;  /* quem entende, sobrescreve */
```

A página `/teste-safari/` já mede isso e reporta a diferença exata.

---

## Sintoma relatado
Em iPhone (Safari/iOS), os elementos "simplesmente somem". Em alguns casos
a página nem chega a abrir (fica presa na tela preta do boot terminal).

## Causa raiz provável (alta confiança)

### 1. Relative Color Syntax sem fallback — `assets/css/variaveis.css`
78 declarações no formato:

```css
--clr-black-a10: lch(from var(--clr-black-a0) calc(l + 5) c h);
--clr-gray-a20:  lch(from var(--clr-black-a0) calc(l + 20) c calc(h + 10));
```

Relative Color Syntax (CSS Color 5) exige **Safari 16.4+**. Não há nenhum
`@supports` nem valor de reserva no arquivo (verificado: zero ocorrências).

**Por que faz sumir:** custom property com valor inválido não é descartada no
parse — ela falha em *computed-value time*, no momento do `var()`:

| Propriedade | Resultado do valor inválido |
|---|---|
| `color: var(--clr-texto)` | herda do pai → escuro no escuro |
| `background-color: var(--clr-fundoMain)` | vira `transparent` |
| `border: var(--borda-padrao)` | shorthand inteira morre |

Como `--clr-gray-*`, `--clr-main-*`, `--clr-borda` e `--clr-fundoMain` derivam
todos daí, o site se apaga por partes.

### 2. `color-mix()` — `assets/css/boot-terminal.css`
28 usos. Exige **Safari 16.2+**. A caixa `#human-verify` é desenhada quase
inteira com `color-mix`. Se ela ficar invisível, ninguém acha o checkbox →
`runVerification()` nunca resolve → `bootSequence()` nunca roda → o overlay
preto NUNCA é removido. É a explicação do "não abre".

### 3. `assets/js/fade-in.js`
Faz `document.body.style.opacity = "0"` imediatamente e só devolve a opacidade
dentro de um `requestAnimationFrame` no `DOMContentLoaded`. Qualquer falha
nesse caminho deixa o `<body>` invisível para sempre. Também usa optional
chaining (`body.style.animation?.trim()`), que exige Safari 13.1+.

### 4. Menor: `:has()` em `assets/css/style.css`
13 seletores. Exige Safari 15.4+. Seletor inválido só descarta a regra.

## Observação importante sobre "iPhone XR pra cima"
Não é o modelo, é a **versão do iOS**. O XR roda de iOS 12 a iOS 18. Pela
teoria acima, aparelhos com iOS < 16.4 quebram e os mais novos funcionam —
direção inversa da relatada. Confirmar a versão de iOS de quem reportou.

## Como confirmar
LambdaTest / BrowserStack, mesmo site em dois aparelhos:
- iOS 15.x  → previsão: paleta destruída, elementos sumindo
- iOS 17/18 → previsão: site normal

## Correção proposta
Piso estático + versão moderna sob `@supports`:

```css
:root {
  --clr-gray-a20: #3a2f34; /* pré-calculado */
}
@supports (color: lch(from red l c h)) {
  :root {
    --clr-gray-a20: lch(from var(--clr-black-a0) calc(l + 20) c calc(h + 10));
  }
}
```

Mesma ideia para `color-mix()` com `rgba()` literal de reserva.
São 78 + 28 substituições — mecânico, dá para gerar por script.

Terceira frente: blindar `fade-in.js` e o overlay do boot para que uma falha
de JS nunca deixe a tela travada ou invisível.

## Tarefas
- [ ] Gerar os 78 fallbacks de `lch()` em `variaveis.css`
- [ ] Gerar os 28 fallbacks de `color-mix()` em `boot-terminal.css`
- [ ] Blindar `fade-in.js` (timeout de segurança para restaurar opacidade)
- [ ] Blindar o boot terminal (remover overlay mesmo se o JS falhar)
- [ ] Validar em Safari iOS 15 e iOS 17
