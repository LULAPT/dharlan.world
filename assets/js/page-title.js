// Prefixa o <title> com o caminho da página atual, ex: "/home/ — dharlan"
const SEM_BREADCRUMB = {
	"/": ["index"],
	"/home/": ["home"],
	"/not_found/": ["404"],
	"/anotacoes/": ["anotacoes"],
	"/curriculo/": ["curriculo"],
	"/wishlist/": ["outros", "wishlist"],
	"/picrew/char-somehow/": ["utils", "picrew", "char-somehow"],
};

function slugify(text) {
	return text
		.trim()
		.replace(/^\/+|\/+$/g, "")
		.toLowerCase()
		.replace(/\s+/g, "-");
}

export function setPageTitle() {
	const nav = document.getElementById("nav-atual");
	let segments = null;

	if (nav) {
		segments = Array.from(nav.children)
			.filter((el) => el.getAttribute("href") !== "/home/")
			.map((el) => slugify(el.textContent))
			.filter(Boolean);
	} else if (SEM_BREADCRUMB[location.pathname]) {
		segments = SEM_BREADCRUMB[location.pathname];
	}

	if (!segments || !segments.length) return;

	document.title = `/${segments.join("/")}/ — ${document.title}`;
}
