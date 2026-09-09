export function fadeIn() {
  // Configurações
  const USAR_FADE_IN = true; // habilita fade-in
  const USAR_FADE_OUT = true; // habilita fade-out
  const FADE_SECONDS = 0.5; // tempo das animações em segundos
  const FADE_MS = FADE_SECONDS * 1000;

  if (USAR_FADE_IN || USAR_FADE_OUT) {
    const style = document.createElement("style");
    style.innerHTML = `
      body.fade-enabled { opacity: 0; }
      body.fade-enabled.show { /* animação aplicada via JS */ }
      body.fade-out { /* animação aplicada via JS */ }

      @keyframes fadeInAnim { 0% { opacity: 0; } 100% { opacity: 1; } }
      @keyframes fadeOutAnim { 0% { opacity: 1; } 100% { opacity: 0; } }
    `;
    document.head.appendChild(style);

    if (USAR_FADE_IN) {
      document.body.style.opacity = "0";

      // Rede de segurança. A opacidade só é devolvida lá embaixo, dentro do
      // animationend do fadeInAnim — se essa animação não rodar (aba em
      // segundo plano, prefers-reduced-motion, qualquer engasgo do
      // navegador), o body fica invisível PARA SEMPRE e a página inteira
      // some. Aqui a visibilidade volta de qualquer jeito.
      setTimeout(function () {
        if (document.body.style.opacity === "0") {
          document.body.style.opacity = "";
        }
      }, FADE_MS + 2000);
    }

    // fadeIn() é chamado de dentro de um handler de DOMContentLoaded (ver
    // main.js). Registrar aqui outro listener do MESMO evento é uma corrida:
    // se ele já tiver passado pela fase de bolha até o window, o listener
    // nunca dispara — e aí o opacity: 0 acima nunca é desfeito. Se o DOM já
    // está pronto, executa direto.
    const aoPronto = (fn) => {
      if (document.readyState === "loading") {
        window.addEventListener("DOMContentLoaded", fn);
      } else {
        fn();
      }
    };

    aoPronto(() => {
      const body = document.body;

      if (USAR_FADE_IN) {
        body.classList.add("fade-enabled");
        void body.offsetWidth; // força reflow

        requestAnimationFrame(() => {
          body.classList.add("show");

          const atual = getComputedStyle(body).animation || "";
          const fadeAnim = `fadeInAnim ${FADE_SECONDS}s forwards`;

          const novo = atual
            .split(",")
            .map((a) => a.trim())
            .filter((a) => a.startsWith("fadeInAnim") || a === "none")
            .join(", ");

          body.style.animation = novo ? novo + ", " + fadeAnim : fadeAnim;

          const onFadeInEnd = (e) => {
            if (e.target !== body || e.animationName !== "fadeInAnim") return;
            const current = body.style.animation || "";
            const cleaned = current
              .split(",")
              .map((a) => a.trim())
              .filter((a) => !a.startsWith("fadeInAnim"))
              .join(", ");
            body.style.animation = cleaned;
            body.style.opacity = "";
            body.removeEventListener("animationend", onFadeInEnd);
          };
          body.addEventListener("animationend", onFadeInEnd);
        });
      }

      if (USAR_FADE_OUT) {
        document.addEventListener("click", (e) => {
          const el = e.target.closest("a[href]");
          if (!el) return;
          const href = el.getAttribute("href");
          if (!href || href.startsWith("#") || href.startsWith("http") || href.startsWith("javascript")) return;

          // Não interceptar links com target="_blank"
          if (el.getAttribute("target") === "_blank") return;

          e.preventDefault();

          const bodyAnim = body.style.animation?.trim() || "";
          const fadeOutAnim = `fadeOutAnim ${FADE_SECONDS}s forwards`;

          body.style.animation = bodyAnim.includes("fadeOutAnim")
            ? bodyAnim
            : bodyAnim && bodyAnim !== "none"
            ? bodyAnim + ", " + fadeOutAnim
            : fadeOutAnim;

          body.classList.add("fade-out");

          const onFadeOutEnd = (ev) => {
            if (ev.target !== body || ev.animationName !== "fadeOutAnim") return;
            body.removeEventListener("animationend", onFadeOutEnd);
            window.location.href = href;
          };
          body.addEventListener("animationend", onFadeOutEnd);
        });
      }
    });

    // Corrige tela preta ao voltar com seta do navegador
    // substitua o handler atual por este
    window.addEventListener("pageshow", (event) => {
      const body = document.body;
      if (event.persisted) {
        // remove classes de fade e restaura opacidade
        body.classList.remove("fade-out", "fade-enabled", "show");
        body.style.opacity = "1";

        // remove apenas animações relativas ao fade, sem tocar nas outras
        const cur = (body.style.animation || "").trim();
        if (cur && cur !== "none") {
          const novo = cur
            .split(",")
            .map((a) => a.trim())
            .filter((a) => !/\bfadeInAnim\b/.test(a) && !/\bfadeOutAnim\b/.test(a))
            .join(", ");
          body.style.animation = novo || "";
        }
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
