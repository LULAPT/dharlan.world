export function carregarNavbar() {
	const headerHome = document.getElementById("header-expandida");
	const headerCompacta = document.getElementById("header-compacta");
	const headerMobile = document.getElementById("header-mobile");

	const navbarCSS = `
  /* Header general */
  header * {
    box-sizing: border-box;
  }

  header nav {
    display: flex;
    font-size: 1rem;
    gap: 1.7rem;
    text-align: left;
    text-transform: capitalize;
    transition: var(--transition-time);
    user-select: none;
  }

  header nav a {
    cursor: pointer !important;
  }

  a:not([href]) {
    cursor: default;
  }

  header a:link,
  header a:visited,
  header a:hover,
  header a:active {
    margin: 0;
    padding: 0;
  }

  /* Dropdown */
  header nav .dropdown {
    display: inline-block;
    position: relative;
  }

  header nav .dropdown::after {
    --svg: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M480-344 240-584l56-56 184 184 184-184 56 56-240 240Z"/></svg>');
    background-color: currentColor;
    content: "";
    display: inline-block;
    height: 1em;
    mask: var(--svg) no-repeat center/contain;
    padding-left: 0.5em;
    pointer-events: none;
    vertical-align: middle;
    width: 1em;
    -webkit-mask: var(--svg) no-repeat center/contain;
  }

  header nav .dropbtn {
    color: inherit;
    text-decoration: none;
  }

  header nav .dropdown-content {
    background-color: var(--clr-black-a0);
    border: var(--borda-padrao);
    border-radius: 0 var(--b-radius) var(--b-radius) var(--b-radius);
    max-width: 10rem;
    opacity: 0;
    pointer-events: none;
    position: absolute;
    top: 100%;
    transform: translateY(-5px);
    transition: opacity 0.15s, transform 0.3s, visibility 0.15s;
    visibility: hidden;
    width: max-content;
    z-index: 500;
    margin-top: -1px;
  }

  header nav .dropdown-content a {
    color: var(--clr-white);
    display: block;
    overflow-wrap: anywhere;
    padding: 0.6em 0.9em;
    text-align: left;
    text-decoration: none;
    white-space: normal;
    word-break: break-word;
  }

  header nav .dropdown-content a:hover {
    background-color: var(--clr-main-a40);
  }

  header nav .dropdown:hover .dropdown-content {
    opacity: 1;
    pointer-events: auto;
    transform: translateY(0);
    visibility: visible;
  }

  /* Header expandida */
  #header-expandida {
    align-items: center;
    display: flex;
    flex-direction: column;
    gap: 21px;
    margin: 495px 0 26px;
    min-height: 75px;
    position: relative;
    text-align: center;
    user-select: none;
    width: 100%;
  }

  #header-expandida::before {
    animation: fragmentFloat 8s infinite ease-in-out;
    content: url("/assets/img/gunnm-float-v2.png");
    filter: var(--img-main-filter, none);
    left: 50%;
    opacity: 0.7;
    pointer-events: none;
    position: absolute;
    top: -515px;
    transform: translateX(-50%);
    transform-origin: center;
    transition: opacity var(--transition-time);
    z-index: -2;
  }

  #header-expandida pre {
    margin: 0;
  }

  #ascii-art-container pre {
    animation: flickerAnim 1s normal forwards ease-in-out;
    margin-bottom: 12px;
    text-align: center;
    user-select: none;
    width: 100%;
  }

  #header-expandida pre a:hover,
  #simple-title a:hover,
  #site-title a:hover,
  #header-mobile a:hover {
    color: var(--clr-main-a40) !important;
    text-decoration: none !important;
  }

  /* Botão Doar */
  #header-expandida a.btn-doar,
  #header-compacta a.btn-doar,
  #header-mobile a.btn-doar {
    color: var(--clr-main-a30);
    text-decoration: none;
  }

  #header-expandida a.btn-doar:hover,
  #header-compacta a.btn-doar:hover,
  #header-mobile a.btn-doar:hover,
  #header-expandida a.btn-doar:focus,
  #header-compacta a.btn-doar:focus,
  #header-mobile a.btn-doar:focus {
    color: var(--clr-main-a50);
  }

  /* Header compacta */
  #header-compacta {
    align-items: center;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
  }

  #header-titulo-compacto,
  #title-mobile {
    color: var(--clr-white);
    font-family: var(--fonte-tituloheader);
    font-size: 1.43em;
  }

  #header-titulo-compacto {
    text-align: left;
  }

  header div#header-wrap {
    align-items: center;
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
    gap: 32px;
    height: 100%;
    justify-content: flex-start;
    margin: 1.7rem 3.5rem 4.5rem;
    width: 100%;
  }

  /* Header mobile */
  #title-mobile {
    align-items: center;
    display: none;
    justify-content: space-between;
    padding: 10px 20px;
  }

  #header-mobile a {
    color: var(--clr-white);
    text-decoration: none;
  }

  #menu-btn,
  #close-menu {
    background: none;
    border: none;
    padding: 15px;
    color: var(--clr-white);
    cursor: pointer;
    font-size: 2.29em;
  }

  #menu-btn:hover,
  #close-menu:hover {
    color: var(--clr-main-a40);
  }

  #menu-btn svg {
    fill: currentColor;
    height: 0.9em;
    width: 0.9em;
  }

  #close-menu {
    position: absolute;
    right: 18px;
    top: 12px;
  }

  #side-menu {
    background: var(--clr-black-a0);
    box-shadow: -2px 0 12px rgba(0, 0, 0, 0.4);
    color: var(--clr-white);
    display: flex;
    flex-direction: column;
    height: 100vh;
    max-width: 270px;
    padding: 32px 24px 24px;
    position: fixed;
    right: 0;
    scrollbar-width: thin;
    top: 0;
    transform: translateX(100%);
    transition: transform 0.75s cubic-bezier(0.4, 0, 0.2, 1);
    user-select: none;
    width: 80vw;
    z-index: 998;
  }

  #side-menu.open {
    overflow-x: hidden;
    overflow-y: auto;
    transform: translateX(0);
  }

  #side-menu-overlay {
    background: rgba(0, 0, 0, 0.4);
    display: none;
    inset: 0;
    opacity: 0;
    pointer-events: none;
    position: fixed;
    transition: opacity 0.25s;
    z-index: 998;
  }

  #side-menu.open ~ #side-menu-overlay,
  #side-menu-overlay.open {
    display: block;
    opacity: 1;
    pointer-events: auto;
  }

  #side-menu ul {
    list-style: none;
    margin: 0 20px;
    padding: 0;
  }

  #side-menu li {
    color: var(--clr-white);
    font-size: 1.14em;
    margin: 13px 0;
    transition: color 0.25s;
  }

  .floating-nav header div#header-wrap {
    justify-content: space-between;
    background-color: var(--clr-black-a10);
    box-shadow: 1px 1px 2px 0px black;
    border: var(--borda-padrao);
    padding: 1em 2em;
    border-radius: 50px;
    max-width: 650px;
  }

  .floating-nav #header-compacta {
    justify-content: center;
    position: fixed;
    z-index: 500;
    width: 100%;
  }

  .floating-nav main {
    margin-top: 8em;
  }

  @media (max-width: 1024px) {
    #ascii-art-container {
      display: none;
      font-size: 0.8em;
    }

    #title-mobile {
      display: flex;
    }

    #header-expandida,
    #header-compacta {
      display: none !important;
    }

    #simple-title,
    #site-title {
      display: block !important;
      font-family: var(--fonte-tituloheader) !important;
      font-size: 1.2em !important;
      letter-spacing: 0;
      text-align: left !important;
    }
  }
  `;

	function injectNavbarCSS() {
		if (!document.getElementById("navbar-style")) {
			const style = document.createElement("style");
			style.id = "navbar-style";
			style.textContent = navbarCSS;
			document.head.appendChild(style);
		}
	}
	injectNavbarCSS();
	const links = {
		sobre: { label: "Sobre", href: "/sobre/" },
		portfolio: {
			label: "Galeria",
			href: "/galeria/",
			children: [
        { label: "Arte", href: "/galeria/arte/" },
				{ label: "Fotografia", href: "/galeria/fotografia/" },
				{ label: "Cat.jpg(s)", href: "/galeria/cat.jpg/" },
			],
		},
		projetos: {
			label: "Save",
			href: "/save/",
			children: [
        { label: "/w/", href: "/save/w/" },
				{ label: "/pfp/", href: "/save/pfp/" },
				{ label: "/b/", href: "/save/b/" },
			],
		},
		outros: {
			label: "Outros",
			href: "/outros/",
			children: [
				{ label: "Pensamentos", href: "/pensamentos/" },
				{ label: "Anotações", href: "/anotacoes/" },
				{ label: "Inventário", href: "/inventario/" },
				{ label: "Agora", href: "/agora/" },
				{ label: "Contato", href: "/contato/" },
				{ label: "Wishlist", href: "/wishlist/" },
			],
		},
		utils: {
			label: "Utils",
			href: "/utils/",
			children: [
				{ label: "Links", href: "/links/" },
				{ label: "Kaomojis", href: "/kaomojis/" },
				{ label: "Avatar", href: "/avatar/" },
				{ label: "Picrew", href: "/picrew/" },
			],
		},
		// doar: { label: "Doar", href: "/doar/" }, // desativado - reativar removendo o comentário
	};

	function gerarNavbarLinks(obj) {
		return Object.values(obj)
			.map((item) => {
				const isDoar = item.href === "/doar/";
				const linkClass = isDoar ? "btn-doar" : "";
				if (item.children && item.children.length) {
					const childrenHTML = item.children
						.map((c) => `<a href="${c.href}">${c.label}</a>`)
						.join("");
					return `
          <div class="dropdown"><a href="${
						item.href || "#"
					}" class="${linkClass} dropbtn">${
						item.label
					}</a><div class="dropdown-content">${childrenHTML}</div></div>
        `;
				} else {
					return `<div><a href="${item.href}" class="${linkClass}">${item.label}</a></div>`;
				}
			})
			.join("");
	}

	function gerarNavbarMobile(obj) {
		return Object.values(obj)
			.map((item) => {
				const isDoar = item.href === "/doar/";
				const itemClass = isDoar ? "btn-doar" : "";
				if (item.children && item.children.length) {
					const childrenHTML = item.children
						.map((c) => `<li><a href="${c.href}">${c.label}</a></li>`)
						.join("");
					if (item.href) {
						return `<li><a href="${item.href}" class="${itemClass}">${item.label}</a></li><ul>${childrenHTML}</ul>`;
					} else {
						return `<li class="nopage">${item.label}</li><ul>${childrenHTML}</ul>`;
					}
				} else {
					return `<li><a href="${item.href}" class="${itemClass}">${item.label}</a></li>`;
				}
			})
			.join("");
	}

	if (headerHome) {
		const asciiArt = `                       
     █████ █████                          ████                            ██  
    ▒▒███ ▒▒███                          ▒▒███                           ████ 
  ███████  ▒███████    ██████   ████████  ▒███   ██████   ████████      ██▒▒██
 ███▒▒███  ▒███▒▒███  ▒▒▒▒▒███ ▒▒███▒▒███ ▒███  ▒▒▒▒▒███ ▒▒███▒▒███    ▒▒  ▒▒ 
▒███ ▒███  ▒███ ▒███   ███████  ▒███ ▒▒▒  ▒███   ███████  ▒███ ▒███           
▒███ ▒███  ▒███ ▒███  ███▒▒███  ▒███      ▒███  ███▒▒███  ▒███ ▒███           
▒▒████████ ████ █████▒▒████████ █████     █████▒▒████████ ████ █████          
 ▒▒▒▒▒▒▒▒ ▒▒▒▒ ▒▒▒▒▒  ▒▒▒▒▒▒▒▒ ▒▒▒▒▒     ▒▒▒▒▒  ▒▒▒▒▒▒▒▒ ▒▒▒▒ ▒▒▒▒▒           
                                                                              
                                                                              
                                                                              
`;

		headerHome.innerHTML = `
        <div id="ascii-art-container"><pre><a href="/">${asciiArt}</a></pre></div>
        <h1 id="simple-title"><a href="/home/">dharlan^</a></h1>
        <nav>${gerarNavbarLinks(links)}</nav>
    `;
	}

	if (headerCompacta) {
		headerCompacta.innerHTML = `
      <div id="header-wrap">
        <div id="header-titulo-compacto">
          <a href="/home/">dharlan^</a>
        </div>
        <nav>${gerarNavbarLinks(links)}</nav>
      </div>
    `;
	}

	if (headerMobile) {
		headerMobile.innerHTML = `
        <div id="title-mobile">
          <a href="/home/"><span id="site-title">dharlan^</span></a>
          <button id="menu-btn" aria-label="Abrir menu">
		  	<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M121.87-236.28v-86h716.26v86H121.87Zm0-201.22v-86h716.26v86H121.87Zm0-201.22v-86h716.26v86H121.87Z"/></svg>
		  </button>
        </div>
        <div id="side-menu-overlay"></div>
        <nav id="side-menu">
          <button id="close-menu" aria-label="Fechar menu">&times;</button>
          <ul>${gerarNavbarMobile(links)}</ul>
        </nav>
    `;
	}
}
