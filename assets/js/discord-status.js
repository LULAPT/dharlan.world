// discord-status.js
// Busca o status atual do Discord (via discorduserstatus-2-0.onrender.com) e
// atualiza a bolinha #discord-status-indicator na home. Passando o mouse na
// bolinha aparece um cartão com o avatar atual, o nome e o status.
//
// A API é a mesma do bia-bio/dharlan-bio (discordUserImage.js de lá), que já
// devolve avatarUrl e username junto com o status — uma chamada só pra tudo.
// Lá o ID era escolhido pelo domínio (dharlan-bio/dharlan.eu → meu, senão o
// da Bia); aqui o site é um só, então o ID é fixo.

(function () {
	var DISCORD_USER_ID = "682694935631233203";
	var STATUS_URL = "https://discorduserstatus-2-0.onrender.com/status/" + DISCORD_USER_ID;
	var POLL_MS = 60000; // 1 min
	// Tamanho exato em que o avatar aparece no cartão. Pedido já nesse tamanho
	// pra não ser reduzido no navegador: com o image-rendering: pixelated
	// global, um 2048 encolhido pra 64 sai todo picotado.
	var AVATAR_PX = 64;

	var STATUS_MAP = {
		online: { cls: "verde", label: "Online" },
		idle: { cls: "amarelo", label: "Ausente" },
		dnd: { cls: "vermelho", label: "Não perturbe" },
	};
	var OFFLINE = { cls: "bw", label: "Offline" };
	var CLASSES = ["verde", "amarelo", "vermelho", "bw"];

	var cartao = null;
	var cartaoAvatar = null;
	var cartaoBolinha = null;
	var cartaoNome = null;
	var cartaoStatus = null;

	// A API devolve size=2048 e um &t= que muda a cada resposta. O t quebraria
	// o cache a cada minuto e o avatar seria baixado de novo sem ter mudado —
	// quem muda quando o avatar muda é o hash no caminho, não o t.
	function urlDoAvatar(bruta) {
		try {
			var url = new URL(bruta);
			url.searchParams.delete("t");
			url.searchParams.set("size", String(AVATAR_PX));
			return url.href;
		} catch (e) {
			return null;
		}
	}

	function criarCartao(el) {
		cartao = document.createElement("div");
		cartao.id = "discord-cartao";
		cartao.setAttribute("role", "tooltip");
		cartao.innerHTML =
			'<div class="discord-cartao-foto">' +
			'<img alt="" width="' + AVATAR_PX + '" height="' + AVATAR_PX + '" hidden />' +
			'<span class="status-indicator bw"></span>' +
			"</div>" +
			'<div class="discord-cartao-texto">' +
			'<span class="discord-cartao-nome">Discord</span>' +
			// O ícone é o que diz de onde vem o status — o tooltip antigo
			// escrevia "Status do Discord:" por extenso.
			'<span class="discord-cartao-status">' +
			'<span class="icone discord" aria-hidden="true"></span>' +
			'<span class="discord-cartao-status-texto">Carregando...</span>' +
			"</span>" +
			"</div>";
		document.body.appendChild(cartao);

		cartaoAvatar = cartao.querySelector("img");
		cartaoBolinha = cartao.querySelector(".status-indicator");
		cartaoNome = cartao.querySelector(".discord-cartao-nome");
		cartaoStatus = cartao.querySelector(".discord-cartao-status-texto");

		// Se a imagem falhar (CDN fora, avatar trocado entre um poll e outro),
		// some com ela em vez de deixar o ícone de imagem quebrada.
		cartaoAvatar.addEventListener("error", function () {
			cartaoAvatar.hidden = true;
		});
		cartaoAvatar.addEventListener("load", function () {
			cartaoAvatar.hidden = false;
		});

		// position: fixed + clientX/Y: quem rola as páginas é o body, não a
		// janela, então pageX/pageY não acompanhariam a rolagem.
		function posicionar(evento) {
			var margem = 14;
			var largura = cartao.offsetWidth;
			var altura = cartao.offsetHeight;
			var x = evento.clientX + margem;
			var y = evento.clientY + margem;
			if (x + largura > window.innerWidth) x = evento.clientX - largura - margem;
			if (y + altura > window.innerHeight) y = evento.clientY - altura - margem;
			cartao.style.left = Math.max(4, x) + "px";
			cartao.style.top = Math.max(4, y) + "px";
		}

		el.addEventListener("mouseenter", function (evento) {
			cartao.classList.add("aberto");
			posicionar(evento);
			document.addEventListener("mousemove", posicionar);
		});
		el.addEventListener("mouseleave", function () {
			cartao.classList.remove("aberto");
			document.removeEventListener("mousemove", posicionar);
		});
	}

	function aplicarStatus(el, data) {
		var info = STATUS_MAP[data && data.status] || OFFLINE;

		el.classList.remove.apply(el.classList, CLASSES);
		el.classList.add(info.cls);
		el.setAttribute("aria-label", "Status do Discord: " + info.label);

		if (!cartao) return;
		cartaoBolinha.classList.remove.apply(cartaoBolinha.classList, CLASSES);
		cartaoBolinha.classList.add(info.cls);
		cartaoStatus.textContent = info.label;
		// textContent sempre: nome e URL vêm de API de terceiro.
		if (data && data.username) cartaoNome.textContent = "@" + data.username;

		var avatar = data && data.avatarUrl ? urlDoAvatar(data.avatarUrl) : null;
		if (avatar && cartaoAvatar.getAttribute("src") !== avatar) {
			cartaoAvatar.src = avatar;
		}
	}

	function atualizar() {
		var el = document.getElementById("discord-status-indicator");
		if (!el) return;
		if (!cartao) criarCartao(el);

		fetch(STATUS_URL)
			.then(function (r) {
				if (!r.ok) throw new Error("Network response was not ok");
				return r.json();
			})
			.then(function (data) {
				aplicarStatus(el, data);
			})
			.catch(function (err) {
				console.error("Falha ao buscar status do Discord:", err);
				// Sem resposta, só o status vira Offline: avatar e nome da última
				// resposta boa continuam no cartão.
				aplicarStatus(el, null);
			});
	}

	atualizar();
	setInterval(atualizar, POLL_MS);
})();
