export async function initSettingsPanel() {
	let themesConfig = [];
	try {
		const response = await fetch("/assets/json/themes.json");
		themesConfig = await response.json();
	} catch (e) {
		console.error("Erro ao carregar configuração de temas:", e);
		return;
	}

	const panel = document.createElement("div");
	panel.id = "settings-panel";
	panel.innerHTML = `
    <div id="settings-gear">
      <span>
        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
          <path d="M19.14 12.936c.036-.3.06-.604.06-.936s-.024-.636-.072-.936l2.03-1.58a.503.503 0 0 0 .12-.648l-1.92-3.32a.5.5 0 0 0-.607-.22l-2.39.96a6.992 6.992 0 0 0-1.62-.936l-.36-2.52a.5.5 0 0 0-.496-.42h-3.84a.5.5 0 0 0-.496.42l-.36 2.52a6.992 6.992 0 0 0-1.62.936l-2.39-.96a.5.5 0 0 0-.607.22l-1.92 3.32c-.15.26-.12.604.12.648l2.03 1.58c-.048.3-.072.618-.072.936s.024.636.072.936l-2.03 1.58a.503.503 0 0 0-.12.648l1.92 3.32a.5.5 0 0 0 .607.22l2.39-.96c.48.372 1.02.684 1.62.936l.36 2.52a.5.5 0 0 0 .496.42h3.84a.5.5 0 0 0 .496-.42l.36-2.52a6.992 6.992 0 0 0 1.62-.936l2.39.96a.5.5 0 0 0 .607-.22l1.92-3.32a.503.503 0 0 0-.12-.648l-2.03-1.58zM12 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z"/>
        </svg>
      </span>
    </div>
    <div id="settings-box">
      <label class="switch-placeholder" id="theme-switch-container"></label>
      <label class="switch-placeholder" id="crt-switch-container"></label>
      <label class="switch-placeholder" id="festive-switch-container"></label>
      <label class="switch-placeholder" id="nsfw-blur-switch-container"></label>
    </div>
  `;
	document.body.appendChild(panel);

	const style = document.createElement("style");
	style.textContent = `
  #settings-panel { 
    position: fixed; bottom: 20px; left: 20px; z-index: 997;
  }

  #settings-gear { 
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--clr-black-a0);
    border: var(--borda-padrao);
    cursor: pointer;
    border-radius: var(--b-radius);
  }

  #settings-gear span svg {
    width: 24px;
    height: 24px;
    fill: var(--clr-main-a40);
    transition: transform 0.3s;
    transform-origin: center center;
    display: block;
  }

  #settings-gear:hover span svg {
    transform: rotate(24deg);
  }

  #settings-box {
    position: absolute;
    bottom: 50px;
    left: 0;
    background: var(--clr-black-a0);
    color: var(--clr-white);
    border: var(--borda-padrao);
    border-radius: var(--b-radius);
    padding: 10px;
    box-shadow: 0 4px 10px rgba(0,0,0,0.5);
    min-width: 120px;
    width: max-content;
    max-width: 250px;
    align-items: flex-start;
    flex-direction: column;
    gap: 4px;
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
    user-select: none;
    display: flex;
    transform: translateY(0);
    transition: opacity 0.15s, transform 0.35s, color 0.25s, background-color 0.25s, border-color 0.25s;
  }

  #settings-box.open {
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
    transform: translateY(-5px);
  }

  #settings-box label.switch-placeholder {
    display: inline-flex;
    align-items: center;
    gap: 9px;
    cursor: pointer;
    padding: 4px 8px;
    width: 100%;
    box-sizing: border-box;
  }

  #settings-box label.switch-placeholder .switch-label {
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
    text-align: left;
    font-size: 0.9rem;
    font-family: var(--fonte-corpo);
    font-weight: normal;
  }

  #settings-box label.switch-placeholder input[type="checkbox"] { display: none; }

  #settings-box label.switch-placeholder .slider {
    width: 36px;
    height: 22px;
    background: #888;
    border-radius: var(--b-radius);
    border: var(--borda-padrao);
    position: relative;
    margin-left: auto;
  }

  #settings-box label.switch-placeholder .slider::before {
    content: "";
    position: absolute;
    top: 50%;
    left: 3px;
    width: auto;
    height: 14px;
    aspect-ratio: 1/1;
    background: #fcf9ff;
    border-radius: calc(var(--b-radius) - 3px);
    transition: transform 0.2s;
    transform: translateY(-50%) translateX(0);
    box-shadow: 1px 1px 0px rgba(0,0,0,0.4);
  }

  #settings-box label.switch-placeholder input:checked + .slider {
    background: var(--clr-main-a40);
  }
  #settings-box label.switch-placeholder input:checked + .slider::before {
    transform: translateY(-50%) translateX(14px);
  }

  #settings-box select {
    flex: 1;
    padding: 6px 8px;
    background: var(--clr-black-a0);
    color: var(--clr-white);
    border: var(--borda-padrao);
    border-radius: var(--b-radius);
    font-family: var(--fonte-corpo);
    font-size: 0.9rem;
    cursor: pointer;
    transition: border-color 0.25s, background-color 0.25s;
    min-width: 120px;
  }

  #settings-box select:hover {
    border-color: var(--clr-main-a40);
  }

  #settings-box select:focus {
    outline: none;
    border-color: var(--clr-main-a40);
  }

  #settings-box select option {
    background: var(--clr-black-a0);
    color: var(--clr-white);
  }
  `;
	document.head.appendChild(style);

	// Criar switches visuais
	const crtContainer = document.getElementById("crt-switch-container");
	crtContainer.innerHTML = `<input type="checkbox" id="panel-crt-toggle"><span class="slider"></span><span class="switch-label">CRT</span>`;
	const themeContainer = document.getElementById("theme-switch-container");
	const themeOptions = themesConfig
		.map((t) => `<option value="${t.id}">${t.label}</option>`)
		.join("");
	themeContainer.innerHTML = `<select id="panel-theme-select">${themeOptions}</select>`;
	const festiveContainer = document.getElementById("festive-switch-container");
	festiveContainer.innerHTML = `<input type="checkbox" id="panel-festive-toggle"><span class="slider"></span><span class="switch-label">Visuais festivos</span>`;
	const nsfwBlurContainer = document.getElementById(
		"nsfw-blur-switch-container"
	);
	nsfwBlurContainer.innerHTML = `<input type="checkbox" id="panel-nsfw-blur-toggle"><span class="slider"></span><span class="switch-label">Desfocar imagens NSFW</span>`;

	const crtCheckbox = document.getElementById("panel-crt-toggle");
	const themeSelect = document.getElementById("panel-theme-select");
	const festiveCheckbox = document.getElementById("panel-festive-toggle");
	const nsfwBlurCheckbox = document.getElementById("panel-nsfw-blur-toggle");

	// Estado inicial
	crtCheckbox.checked = localStorage.getItem("switchCRT") !== "false";
	const currentTheme = localStorage.getItem("current-theme") || "dark";
	themeSelect.value = currentTheme;
	festiveCheckbox.checked = localStorage.getItem("festiveEffects") !== "false";
	nsfwBlurCheckbox.checked = localStorage.getItem("nsfwBlur") === "true";

	// Eventos usando as funções dos scripts
	crtCheckbox.addEventListener("change", () => {
		window.toggleCRTState(crtCheckbox.checked);
	});
	themeSelect.addEventListener("change", () => {
		const selectedTheme = themeSelect.value;
		localStorage.setItem("current-theme", selectedTheme);
		window.setTheme(selectedTheme);
	});
	festiveCheckbox.addEventListener("change", () => {
		localStorage.setItem("festiveEffects", festiveCheckbox.checked);
		// Recarregar a página para aplicar/remover efeitos festivos
		window.location.reload();
	});
	nsfwBlurCheckbox.addEventListener("change", () => {
		localStorage.setItem("nsfwBlur", nsfwBlurCheckbox.checked);
		toggleNSFWBlur(nsfwBlurCheckbox.checked);
	});

	// Função para controlar blur NSFW
	function toggleNSFWBlur(enabled) {
		if (enabled) {
			document.body.classList.remove("disable-nsfw-blur");
		} else {
			document.body.classList.add("disable-nsfw-blur");
		}
	}

	// Aplicar estado inicial do blur NSFW
	toggleNSFWBlur(nsfwBlurCheckbox.checked);

	// Mostrar/ocultar painel
	const gear = document.getElementById("settings-gear");
	const box = document.getElementById("settings-box");
	let hideTimeout;

	function showBox() {
		clearTimeout(hideTimeout);
		box.classList.add("open");
	}
	function hideBox() {
		hideTimeout = setTimeout(() => {
			box.classList.remove("open");
		}, 200);
	}

	gear.addEventListener("mouseenter", showBox);
	gear.addEventListener("mouseleave", hideBox);
	box.addEventListener("mouseenter", showBox);
	box.addEventListener("mouseleave", hideBox);
}
