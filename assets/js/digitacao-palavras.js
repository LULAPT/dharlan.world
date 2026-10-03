// digitacao-palavras.js — o que se digita na /digitacao/.
//
// Palavras comuns em português e inglês, e citações. As citações são todas de
// domínio público (autores mortos há mais de 70 anos) ou provérbios, que não
// têm dono — dá pra mostrar inteiras sem problema de direito autoral.

export const PALAVRAS = {
	pt: `de a o que e do da em um para é com não uma os no se na por mais as dos como mas foi ao ele das tem seu sua ou ser quando muito há nos já está eu também só pelo pela até isso ela entre era depois sem mesmo aos ter seus quem nas me esse eles estão você tinha foram essa num nem suas meu minha numa pelos elas havia seja qual será nós tenho lhe deles essas esses pelas este fosse dele te vocês meus minhas nosso nossa nossos dela esta estes estas aquele aquela isto aquilo estou estamos estava hoje ontem amanhã sempre nunca agora ainda aqui ali lá onde porque então assim bem mal tempo vida dia casa mundo coisa homem mulher ano vez parte lugar caso forma nome cidade trabalho pessoa gente olhos mão noite água palavra terra país fim momento história amor cabeça porta rua céu mar sol lua fogo luz som cor música livro filme jogo carro amigo família escola dinheiro problema verdade ideia sonho medo coração corpo voz fazer dizer poder ir ver dar saber querer ficar chegar passar deixar pensar falar olhar sair voltar sentir viver achar conhecer começar mudar entender escrever jogar correr abrir fechar ouvir novo grande pequeno bom outro primeiro último longo melhor pior alto baixo certo possível difícil fácil rápido devagar claro escuro feliz triste cedo tarde perto longe junto sozinho branco preto vermelho azul verde rosa`.split(
		" "
	),
	en: `the be of and a to in he have it that for they with as not on she at by this we you do but from or which one would all will there say who make when can more if no man out other so what time up go about than into could state only new year some take come these know see use get like then first any work now may such give over think most even find day also after way many must look before great back through long where much should well people down own just because good each those feel seem how high too place little world very still nation hand old life tell write become here show house both between need mean call develop under last right move thing general school never same another begin while number part turn real leave might want point form off child few small since against ask late home interest large person end open public follow during present without again hold around possible head consider word program problem however lead system set order eye plan run keep face fact group play stand increase early course change help line`.split(
		" "
	),
};

// `tamanho`: "curta", "media" ou "longa".
export const CITACOES = {
	pt: [
		{ texto: "Ao vencedor, as batatas.", fonte: "Machado de Assis, Quincas Borba", tamanho: "curta" },
		{ texto: "Água mole em pedra dura, tanto bate até que fura.", fonte: "provérbio", tamanho: "curta" },
		{ texto: "Quem não tem cão caça com gato.", fonte: "provérbio", tamanho: "curta" },
		{ texto: "De grão em grão, a galinha enche o papo.", fonte: "provérbio", tamanho: "curta" },
		{ texto: "Mais vale um pássaro na mão do que dois voando.", fonte: "provérbio", tamanho: "curta" },
		{
			texto: "Não tive filhos, não transmiti a nenhuma criatura o legado da nossa miséria.",
			fonte: "Machado de Assis, Memórias Póstumas de Brás Cubas",
			tamanho: "media",
		},
		{
			texto: "Minha terra tem palmeiras, onde canta o sabiá; as aves, que aqui gorjeiam, não gorjeiam como lá.",
			fonte: "Gonçalves Dias, Canção do Exílio",
			tamanho: "media",
		},
		{
			texto: "Ora (direis) ouvir estrelas! Certo perdeste o senso!",
			fonte: "Olavo Bilac, Via Láctea",
			tamanho: "media",
		},
		{
			texto: "Ao verme que primeiro roeu as frias carnes do meu cadáver dedico como saudosa lembrança estas memórias póstumas.",
			fonte: "Machado de Assis, Memórias Póstumas de Brás Cubas",
			tamanho: "media",
		},
		{
			texto: "As armas e os barões assinalados, que da ocidental praia lusitana, por mares nunca de antes navegados, passaram ainda além da Taprobana, em perigos e guerras esforçados, mais do que prometia a força humana, e entre gente remota edificaram novo reino, que tanto sublimaram.",
			fonte: "Luís de Camões, Os Lusíadas",
			tamanho: "longa",
		},
	],
	en: [
		{ texto: "Brevity is the soul of wit.", fonte: "Shakespeare, Hamlet", tamanho: "curta" },
		{ texto: "To be, or not to be, that is the question.", fonte: "Shakespeare, Hamlet", tamanho: "curta" },
		{
			texto: "The course of true love never did run smooth.",
			fonte: "Shakespeare, A Midsummer Night's Dream",
			tamanho: "curta",
		},
		{
			texto: "All the world's a stage, and all the men and women merely players.",
			fonte: "Shakespeare, As You Like It",
			tamanho: "media",
		},
		{
			texto: "It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.",
			fonte: "Jane Austen, Pride and Prejudice",
			tamanho: "media",
		},
		{
			texto: "It was the best of times, it was the worst of times, it was the age of wisdom, it was the age of foolishness, it was the epoch of belief, it was the epoch of incredulity, it was the season of Light, it was the season of Darkness, it was the spring of hope, it was the winter of despair.",
			fonte: "Charles Dickens, A Tale of Two Cities",
			tamanho: "longa",
		},
		{
			texto: "I went to the woods because I wished to live deliberately, to front only the essential facts of life, and see if I could not learn what it had to teach, and not, when I came to die, discover that I had not lived.",
			fonte: "Henry David Thoreau, Walden",
			tamanho: "longa",
		},
	],
};
