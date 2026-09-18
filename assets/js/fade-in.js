export function fadeIn() {
  // Configurações
  const USAR_FADE_IN = true; // habilita fade-in
  const USAR_FADE_OUT = true; // habilita fade-out
  const FADE_SECONDS = 0.5; // tempo das animações em segundos
  const FADE_MS = FADE_SECONDS * 1000;

  if (USAR_FADE_IN || USAR_FADE_OUT) {
    // As animações moram no CSS, aplicadas por classe. A versão antiga escrevia
    // `body.style.animation` e depois lia essa string de volta pra desfazer o
    // fade, filtrando as partes que "começassem com fadeInAnim". Só que cada
    // motor serializa o shorthand `animation` numa ordem: Blink/Gecko põem o
    // nome por último ("0.5s ease 0s 1 normal forwards running fadeInAnim"),
    // WebKit põe na frente. No Chrome o filtro não casava com nada e a animação
    // sobrevivia, segurando opacity: 1 pelo `forwards` — funcionava por
    // acidente. No Safari/iOS o filtro casava, a animação era apagada, o
    // opacity inline era limpo junto e sobrava só o `opacity: 0` da classe:
    // o site inteiro fazia o fade-in e sumia no fim dele, em toda página.
    // Por isso aqui não se lê nem se escreve o shorthand em lugar nenhum.
    const style = document.createElement("style");
    style.innerHTML = `
      body.fade-enabled { opacity: 0; }
      body.fade-enabled.show { animation: fadeInAnim ${FADE_SECONDS}s forwards; }
      body.fade-out, body.fade-enabled.show.fade-out { animation: fadeOutAnim ${FADE_SECONDS}s forwards; }

      @keyframes fadeInAnim { 0% { opacity: 0; } 100% { opacity: 1; } }
      @keyframes fadeOutAnim { 0% { opacity: 1; } 100% { opacity: 0; } }
    `;
    document.head.appendChild(style);

    const body = document.body;

    // Devolve o body ao estado natural: sem classe de fade e sem opacity
    // inline. Como o fade-in acaba em `forwards`, tirar as duas coisas ao mesmo
    // tempo é o que evita a piscada — e evita depender do `forwards` pra manter
    // a página visível, que era justamente o que quebrava no Safari.
    // Nada de opacity inline: quem esconde é só a classe. Estilo inline ganha do
    // CSS e não some junto com as classes, então era mais um jeito de a página
    // ficar presa em branco se algum passo falhasse.
    let fadeEncerrado = false;
    // Fora do handler de clique de propósito: o pageshow precisa alcançar as
    // duas pra destravar a página que voltou do bfcache. Ver o comentário lá
    // embaixo.
    let navegando = false;
    let travaSaida = null;
    const encerrarFadeIn = () => {
      fadeEncerrado = true;
      body.classList.remove("fade-enabled", "show");
      body.style.opacity = "";
    };

    if (USAR_FADE_IN) {
      body.classList.add("fade-enabled");
      void body.offsetWidth; // força reflow

      // A trava é armada fora do requestAnimationFrame de propósito: o iOS
      // congela o rAF quando a aba não está visível (ou durante o boot da
      // index), e aí o `show` nunca entraria e a página ficaria invisível.
      // setTimeout roda mesmo assim, só atrasado.
      const trava = setTimeout(encerrarFadeIn, FADE_MS + 500);

      const onFadeInEnd = (e) => {
        if (e.target !== body || e.animationName !== "fadeInAnim") return;
        body.removeEventListener("animationend", onFadeInEnd);
        clearTimeout(trava);
        encerrarFadeIn();
      };
      body.addEventListener("animationend", onFadeInEnd);

      // Se a trava já correu (rAF congelado), não reanima: a página já está
      // visível e o fade só faria ela piscar de novo quando a aba voltar.
      requestAnimationFrame(() => {
        if (!fadeEncerrado) body.classList.add("show");
      });
    }

    if (USAR_FADE_OUT) {
      document.addEventListener("click", (e) => {
        // Se alguém já cancelou o clique, o link não era pra navegar — o
        // handler dele quis outra coisa. Sem esta linha o fade-out navega
        // mesmo assim, porque ele usa window.location e não o comportamento
        // padrão do navegador, que é o que o preventDefault segura.
        if (e.defaultPrevented) return;

        const el = e.target.closest("a[href]");
        if (!el) return;
        const href = el.getAttribute("href");
        if (!href || href.startsWith("#") || href.startsWith("http") || href.startsWith("javascript")) return;

        // Não interceptar links com target="_blank"
        if (el.getAttribute("target") === "_blank") return;

        // O `navegando` é checado antes do preventDefault: se por algum motivo
        // ele ficar preso ligado, o pior caso é o link navegar sem o fade —
        // e não um link morto, que é o que dá quando se cancela o clique e
        // depois se desiste de navegar.
        if (navegando) return;

        e.preventDefault();
        navegando = true;

        // Sai do fade-in antes de entrar no fade-out: se o fade-in ainda
        // estivesse rodando, as duas regras brigariam pelo mesmo body.
        body.classList.remove("fade-enabled", "show");
        body.style.opacity = "";
        body.classList.add("fade-out");

        const ir = () => {
          body.removeEventListener("animationend", onFadeOutEnd);
          clearTimeout(travaSaida);
          travaSaida = null;
          window.location.href = href;
        };

        // Mesma história da trava do fade-in, e aqui é pior: sem ela, um
        // animationend que não dispara deixa o clique sem navegar nenhuma.
        travaSaida = setTimeout(ir, FADE_MS + 400);

        const onFadeOutEnd = (ev) => {
          if (ev.target !== body || ev.animationName !== "fadeOutAnim") return;
          ir();
        };
        body.addEventListener("animationend", onFadeOutEnd);
      });
    }

    // Corrige tela preta ao voltar com seta do navegador. Roda sempre, não só
    // no `event.persisted`: o bfcache do iOS devolve a página com o fade-out
    // ainda aplicado e nem sempre marca a volta como persistida.
    window.addEventListener("pageshow", () => {
      body.classList.remove("fade-out", "fade-enabled", "show");
      body.style.opacity = "";

      // O bfcache devolve a página inteira viva: o JS não recarrega e as
      // variáveis voltam com o valor de quando se saiu. Como se saiu clicando
      // num link, `navegando` voltava ligado e recusava todo clique seguinte —
      // a página voltava com os links todos mortos. O timer pendente do fade-out
      // volta junto e navegaria pra frente sozinho, então morre aqui também.
      navegando = false;
      if (travaSaida) {
        clearTimeout(travaSaida);
        travaSaida = null;
      }
    });
  }

  // ----------------------------
  // Preload com Loader (opcional)
  // ----------------------------
  const usarPreloadGlobal = false;

  if (usarPreloadGlobal) {
    const style = document.createElement("style");
    style.id = "preload-style";
    style.innerHTML = `
      body.preload { overflow: hidden; }

      #loader {
        position: fixed; inset: 0; display: flex;
        align-items: center; justify-content: center;
        background: var(--clr-black-a0); z-index: 9999;
        opacity: 1; visibility: visible;
        transition: opacity 0.4s ease, visibility 0.4s ease;
      }

      #loader.fade-out { opacity: 0; visibility: hidden; pointer-events: none; }

      .loading-wheel::before { content: "∴"; }
      .loading-wheel { display: inline-block; vertical-align: middle; font-size: 2em; animation: rotate 1s linear infinite; }

      @keyframes rotate { 0% { transform: rotate(0); } 100% { transform: rotate(360deg); } }

      body.preload #conteudo *:not(#loader):not(#loader *) { animation: none !important; transition: none !important; opacity: 0; }

      #conteudo.fade-in { animation: fadeIn 0.75s ease forwards; }

      @keyframes fadeIn { 0% { opacity: 0; } 100% { opacity: 1; } }
    `;
    document.head.appendChild(style);

    const loader = document.createElement("div");
    loader.id = "loader";
    loader.innerHTML = `<div class="loading-wheel"></div>`;
    document.body.appendChild(loader);

    document.body.classList.add("preload");
  }

  window.addEventListener("DOMContentLoaded", () => {
    if (!usarPreloadGlobal) return;
    const conteudo = document.getElementById("conteudo");
    if (conteudo) {
      const paginasExcluidas = ["/home/", "/"];
      conteudo.style.opacity = paginasExcluidas.includes(window.location.pathname) ? "1" : "0";
    }
  });

  window.addEventListener("load", () => {
    if (!usarPreloadGlobal) return;
    const loader = document.getElementById("loader");
    const conteudo = document.getElementById("conteudo");

    if (loader) {
      loader.classList.add("fade-out");
      loader.addEventListener(
        "transitionend",
        () => {
          loader.remove();
          if (conteudo) conteudo.classList.add("fade-in");
          document.body.classList.remove("preload");
          const st = document.getElementById("preload-style");
          if (st) st.remove();
        },
        { once: true }
      );
    } else if (conteudo) {
      conteudo.classList.add("fade-in");
    }
  });
}
