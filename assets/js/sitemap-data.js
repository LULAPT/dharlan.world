// Sitemap data structure used to build the sitemap HTML
export const sitemap = [
  { href: "/", label: "/index" },
  {
    group: true,
    items: [
      { href: "/home/", label: "/home" },
      { href: "/sobre/", label: "/sobre" },
      {
        href: "/galeria/",
        label: "/galeria",
        children: [
          {
            href: "/galeria/arte/",
            label: "/arte",
            children: [
              // Os sketchbooks continuam no repositório, só delistados.
              { href: "/galeria/arte/2kki/", label: "/2kki" },
              { href: "/galeria/arte/black-souls/", label: "/black-souls" },
            ],
          },
          { href: "/galeria/fotografia/", label: "/fotografia" },
          { href: "/galeria/cat.jpg/", label: "/cat.jpg" },
        ],
      },
      {
        href: "/save/",
        label: "/save",
        children: [
          {
            href: "/save/w/",
            label: "/w",
            children: [
              { href: "/save/w-lewd/", label: "/w-lewd" },
              { href: "/save/w-ultrawide/", label: "/w-ultrawide" },
              { href: "/save/w-vertical/", label: "/w-vertical" },
            ],
          },
          { href: "/save/pfp/", label: "/pfp" },
          { href: "/save/b/", label: "/b" },
        ],
      },
      {
        // A /2kki/ saiu daqui: virou filha da /galeria/arte/.
        items: [{ href: "/mplace/", label: "/mplace" }],
      },
      {
        href: "/outros/",
        label: "/outros",
        children: [
          { href: "/pensamentos/", label: "/pensamentos" },
          { href: "/anotacoes/", label: "/anotacoes" },
          { href: "/inventario/", label: "/inventario" },
          { href: "/agora/", label: "/agora" },
          { href: "/contato/", label: "/contato" },
          { href: "/wishlist/", label: "/wishlist" },
        ],
      },
      {
        href: "/utils/",
        label: "/utils",
        children: [
          { href: "/links/", label: "/links" },
          { href: "/kaomojis/", label: "/kaomojis" },
          { href: "/avatar/", label: "/avatar" },
          {
            href: "/picrew/",
            label: "/picrew",
            children: [
              { href: "/picrew/mega-anime-avatar-creator/", label: "/mega-anime-avatar-creator" },
              { href: "/picrew/char-somehow/", label: "/char-somehow" },
            ],
          },
        ],
      },
      // { href: "/doar/", label: "/doar" }, // desativado - reativar removendo o comentário
      { href: "/changelog/", label: "/changelog" },
      { href: "/not_found/", label: "/404" },
    ],
  },
  { href: "https://www.dharlan.world/", label: "/neocities", external: true },
];

export default sitemap;