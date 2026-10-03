// teclas-som.js — sons de teclado mecânico, sintetizados na hora.
//
// Nenhum arquivo de áudio: cada som é montado no Web Audio com um estouro de
// ruído filtrado (o "clique" ou o "toque" do plástico) somado a um tom curto
// que cai de frequência (o "corpo", a caixa do teclado ressoando). Três motivos:
//
//   - pacotes de som de switch gravados quase sempre têm licença nebulosa;
//   - nada pra baixar antes da primeira tecla;
//   - tecla nenhuma soa igual à anterior, porque o tom e o filtro variam um
//     pouco a cada toque — gravação repetida é o que denuncia som falso.
//
// Usado pela /digitacao/ e pela /teclado/.

export const PERFIS = [
	{ id: "creamy", nome: "creamy — linear lubrificado, grave" },
	{ id: "red", nome: "red — linear, macio" },
	{ id: "brown", nome: "brown — tátil, com degrau" },
	{ id: "blue", nome: "blue — clicky, estalado" },
	{ id: "maquina", nome: "máquina de escrever" },
	{ id: "8bit", nome: "8-bit" },
	{ id: "nenhum", nome: "sem som" },
];

let ctx = null;
let ruido = null;

// O AudioContext só pode nascer depois de um gesto do usuário — criado antes,
// ele fica suspenso e mudo. Então nasce no primeiro som pedido, que sempre vem
// de uma tecla apertada.
function contexto() {
	if (!ctx) {
		const Classe = window.AudioContext || window.webkitAudioContext;
		if (!Classe) return null;
		ctx = new Classe();
		ruido = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
		const dados = ruido.getChannelData(0);
		for (let i = 0; i < dados.length; i++) dados[i] = Math.random() * 2 - 1;
	}
	if (ctx.state === "suspended") ctx.resume();
	return ctx;
}

// Estouro de ruído filtrado: o clique, o toque do plástico, o barulho do ar.
// Começa num ponto sorteado do buffer pra dois estouros nunca serem idênticos.
function estalo(destino, t, { tipo, freq, q = 1, dur, ganho }) {
	const fonte = ctx.createBufferSource();
	fonte.buffer = ruido;
	const filtro = ctx.createBiquadFilter();
	filtro.type = tipo;
	filtro.frequency.value = freq;
	filtro.Q.value = q;
	const env = ctx.createGain();
	env.gain.setValueAtTime(ganho, t);
	env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
	fonte.connect(filtro).connect(env).connect(destino);
	fonte.start(t, Math.random() * 0.4);
	fonte.stop(t + dur + 0.02);
}

// Tom que cai de frequência: é o "corpo" do som, a caixa ressoando.
function corpo(destino, t, { onda = "sine", freq, freqFim, dur, ganho }) {
	const osc = ctx.createOscillator();
	osc.type = onda;
	osc.frequency.setValueAtTime(freq, t);
	osc.frequency.exponentialRampToValueAtTime(freqFim ?? freq, t + dur);
	const env = ctx.createGain();
	// Ataque de 2ms em vez de zero: começar o tom no meio da onda dá um estalo
	// digital que não é o som de tecla nenhuma.
	env.gain.setValueAtTime(0.0001, t);
	env.gain.exponentialRampToValueAtTime(ganho, t + 0.002);
	env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
	osc.connect(env).connect(destino);
	osc.start(t);
	osc.stop(t + dur + 0.02);
}

// O que cada perfil toca ao descer e ao subir a tecla. `p` é o fator de tom
// (espaço e enter são mais graves) e `d` o de duração.
const RECEITAS = {
	creamy: {
		desce(o, t, p, d) {
			corpo(o, t, { freq: 175 * p, freqFim: 85 * p, dur: 0.075 * d, ganho: 0.55 });
			estalo(o, t, { tipo: "lowpass", freq: 900 * p, q: 0.7, dur: 0.035 * d, ganho: 0.4 });
		},
		sobe(o, t, p) {
			estalo(o, t, { tipo: "lowpass", freq: 1100 * p, q: 0.7, dur: 0.02, ganho: 0.12 });
		},
	},
	red: {
		desce(o, t, p, d) {
			corpo(o, t, { freq: 210 * p, freqFim: 120 * p, dur: 0.05 * d, ganho: 0.32 });
			estalo(o, t, { tipo: "lowpass", freq: 1500 * p, q: 0.8, dur: 0.025 * d, ganho: 0.22 });
		},
		sobe(o, t, p) {
			estalo(o, t, { tipo: "lowpass", freq: 1300 * p, q: 0.8, dur: 0.015, ganho: 0.08 });
		},
	},
	brown: {
		desce(o, t, p, d) {
			// O degrau tátil: um toque médio, mais seco que o do linear.
			estalo(o, t, { tipo: "bandpass", freq: 1700 * p, q: 1.6, dur: 0.025 * d, ganho: 0.5 });
			corpo(o, t + 0.004, { freq: 240 * p, freqFim: 140 * p, dur: 0.05 * d, ganho: 0.3 });
		},
		sobe(o, t, p) {
			estalo(o, t, { tipo: "bandpass", freq: 1500 * p, q: 1.6, dur: 0.015, ganho: 0.13 });
		},
	},
	blue: {
		desce(o, t, p, d) {
			// O clique é agudo e curtíssimo, e vem antes do fundo da tecla.
			estalo(o, t, { tipo: "bandpass", freq: 3900 * p, q: 4, dur: 0.012, ganho: 0.95 });
			estalo(o, t + 0.006, { tipo: "highpass", freq: 2000 * p, q: 0.7, dur: 0.03 * d, ganho: 0.22 });
			corpo(o, t + 0.008, { onda: "triangle", freq: 320 * p, freqFim: 200 * p, dur: 0.035 * d, ganho: 0.12 });
		},
		// O blue clica de novo na subida: é a marca dele.
		sobe(o, t, p) {
			estalo(o, t, { tipo: "bandpass", freq: 3300 * p, q: 4, dur: 0.01, ganho: 0.55 });
		},
	},
	maquina: {
		desce(o, t, p, d) {
			estalo(o, t, { tipo: "highpass", freq: 1500 * p, q: 0.5, dur: 0.03, ganho: 0.85 });
			corpo(o, t, { onda: "square", freq: 950 * p, freqFim: 500 * p, dur: 0.04, ganho: 0.05 });
			estalo(o, t + 0.01, { tipo: "bandpass", freq: 600 * p, q: 1, dur: 0.06 * d, ganho: 0.32 });
		},
		sobe() {},
	},
	"8bit": {
		desce(o, t, p) {
			// Notas da pentatônica: aleatório, mas sempre afinado entre si.
			const notas = [523.25, 587.33, 659.25, 783.99, 880];
			const nota = notas[Math.floor(Math.random() * notas.length)];
			corpo(o, t, { onda: "square", freq: nota * p, freqFim: nota * p, dur: 0.05, ganho: 0.1 });
		},
		sobe() {},
	},
};

// `tipo`: "letra", "espaco", "enter" ou "apagar". Espaço e enter têm
// estabilizador na tecla de verdade — som mais grave e um pouco mais longo.
export function tocarTecla(perfil, volume, tipo = "letra", fase = "desce") {
	const receita = RECEITAS[perfil];
	if (!receita || volume <= 0) return;
	if (!contexto()) return;

	let p = 0.94 + Math.random() * 0.12;
	let d = 1;
	if (tipo === "espaco") {
		p *= 0.72;
		d = 1.35;
	} else if (tipo === "enter" || tipo === "apagar") {
		p *= 0.86;
		d = 1.15;
	}

	const saida = ctx.createGain();
	saida.gain.value = volume;
	saida.connect(ctx.destination);
	const t = ctx.currentTime;
	receita[fase === "sobe" ? "sobe" : "desce"](saida, t, p, d);

	// O chocalho do estabilizador do espaço: um segundo toque grave, atrasado.
	if (tipo === "espaco" && fase === "desce" && perfil !== "8bit") {
		estalo(saida, t + 0.012, { tipo: "lowpass", freq: 500, q: 0.9, dur: 0.04, ganho: 0.18 });
	}
}

// Zumbido curto e grave pro erro de digitação.
export function tocarErro(volume) {
	if (volume <= 0 || !contexto()) return;
	const saida = ctx.createGain();
	saida.gain.value = volume * 0.6;
	saida.connect(ctx.destination);
	corpo(saida, ctx.currentTime, { onda: "square", freq: 120, freqFim: 95, dur: 0.09, ganho: 0.25 });
}

// Qual "tipo" de tecla é, pelo `code` do evento — o mesmo pros dois apps.
export function tipoDaTecla(code) {
	if (code === "Space") return "espaco";
	if (code === "Enter" || code === "NumpadEnter") return "enter";
	if (code === "Backspace" || code === "Delete") return "apagar";
	return "letra";
}
