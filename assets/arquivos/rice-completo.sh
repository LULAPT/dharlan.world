#!/usr/bin/env bash
# rice-completo.sh - Rice completo do Debian Xfce, tudo em um arquivo.
#
# O que faz, em ordem:
#   1. Tema macOS (WhiteSur): GTK, janelas, icones, cursor, fonte Inter, painel fino, terminal translucido
#   2. Area de trabalho so com a Lixeira (sem Home e Sistema de arquivos)
#   3. Folga (padding) antes do Start e depois do relogio
#   4. Abas no meio e informacoes fixas na direita (espacador expansivo)
#   5. Espaco entre as abas da taskbar
#   6. Icones normais nos atalhos do painel (navegador, arquivos, terminal...)
#   7. Botao Start com estrela amarela
#   8. Taskbar preta e opaca quando ha janela maximizada/tela cheia (autostart)
#   9. Script de CPU/RAM em ~/.local/bin/sysinfo.sh (o plugin voce adiciona na hora, veja no fim)
#
# Uso:  bash rice-completo.sh                       -> tema escuro
#       bash rice-completo.sh --light               -> tema claro
#       bash rice-completo.sh ~/Pictures/img.jpg    -> com wallpaper
#       (pode combinar:  bash rice-completo.sh --light ~/img.jpg)
# Rode dentro da sessao Xfce, como usuario normal. Precisa de internet. Demora alguns minutos.
# Se aparecer aviso de plugin do painel: clique em Remove, NUNCA em Quit nem no X.
set -u

WORK="$(mktemp -d "${TMPDIR:-/tmp}/rice-completo.XXXXXX")"
trap 'rm -rf "$WORK"' EXIT

cat > "$WORK/rice-macos.sh" <<'__EMBED_rice-macos__'
#!/usr/bin/env bash
# rice-macos.sh - Xfce estilo macOS (WhiteSur): tema, icones, cursor, painel fino no topo,
# botoes de janela a esquerda, terminal translucido (sem dock, visual clean).
# Uso:  bash rice-macos.sh                      -> tema escuro, wallpaper = 1a imagem achada
#       bash rice-macos.sh --light              -> tema claro
#       bash rice-macos.sh ~/caminho/img.jpg    -> usa essa imagem como wallpaper
#       (pode combinar:  bash rice-macos.sh --light ~/img.jpg)
# Rode dentro da sessao Xfce, como usuario normal (sudo so no apt). Precisa de internet.
# Dica: rode logo apos ligar o live (painel padrao do Xfce). Demora alguns minutos (compila o tema).
set -u

MODE="Dark"
WALL_ARG=""
for a in "$@"; do
  case "$a" in
    --light) MODE="Light" ;;
    --dark)  MODE="Dark" ;;
    *) [ -f "$a" ] && WALL_ARG="$a" ;;
  esac
done
LOWMODE="$(echo "$MODE" | tr 'A-Z' 'a-z')"
TMP="$HOME/.macos-rice-tmp"

setx() { # setx canal propriedade tipo valor
  xfconf-query -c "$1" -p "$2" -n -t "$3" -s "$4" 2>/dev/null \
    || xfconf-query -c "$1" -p "$2" -s "$4" 2>/dev/null || true
}

echo "==> Instalando dependencias..."
sudo apt update
sudo apt install -y git sassc libglib2.0-dev-bin libxml2-utils imagemagick \
  xfce4-panel-profiles xfce4-goodies x11-xserver-utils fonts-inter fonts-jetbrains-mono

echo "==> Salvando backup do painel atual em ~/panel-backup-macos.tar.bz2 ..."
if [ ! -f "$HOME/panel-backup-macos.tar.bz2" ]; then
  xfce4-panel-profiles save "$HOME/panel-backup-macos.tar.bz2" >/dev/null 2>&1 || true
fi

echo "==> Baixando WhiteSur (tema, icones, cursor)..."
rm -rf "$TMP"; mkdir -p "$TMP"
FAIL=0
git clone --depth=1 https://github.com/vinceliuice/WhiteSur-gtk-theme.git   "$TMP/gtk"     || FAIL=1
git clone --depth=1 https://github.com/vinceliuice/WhiteSur-icon-theme.git  "$TMP/icons"   || FAIL=1
git clone --depth=1 https://github.com/vinceliuice/WhiteSur-cursors.git     "$TMP/cursors" || FAIL=1
if [ "$FAIL" = 1 ]; then
  echo "!! Nao consegui baixar algum repositorio (internet?). Nada foi alterado."
  rm -rf "$TMP"
  exit 1
fi

mkdir -p "$HOME/.themes" "$HOME/.icons" "$HOME/.config/gtk-3.0"

echo "==> Instalando tema GTK + janelas (pode levar alguns minutos)..."
(
  cd "$TMP/gtk" || exit 1
  ./install.sh -d "$HOME/.themes" -c "$MODE" -t default \
    || ./install.sh -d "$HOME/.themes" -c "$LOWMODE" -t default \
    || ./install.sh -d "$HOME/.themes"
) || echo "!! Instalacao do tema GTK teve problemas; vou tentar usar o que foi instalado."

echo "==> Instalando icones..."
( cd "$TMP/icons" && ./install.sh -d "$HOME/.icons" ) || echo "!! Icones com problema."

echo "==> Instalando cursor..."
( cd "$TMP/cursors" && ./install.sh ) || echo "!! Cursor com problema."

# descobre nomes reais instalados
GTK_NAME="$(ls "$HOME/.themes" 2>/dev/null | grep -E "^WhiteSur-${MODE}$" | head -1)"
[ -z "$GTK_NAME" ] && GTK_NAME="$(ls "$HOME/.themes" 2>/dev/null | grep -i "^WhiteSur-${MODE}" | head -1)"
[ -z "$GTK_NAME" ] && GTK_NAME="$(ls "$HOME/.themes" 2>/dev/null | grep -i '^WhiteSur' | head -1)"

if [ "$MODE" = "Dark" ]; then
  ICON_NAME="$(ls "$HOME/.icons" 2>/dev/null | grep -ix 'WhiteSur-dark' | head -1)"
else
  ICON_NAME="$(ls "$HOME/.icons" 2>/dev/null | grep -ix 'WhiteSur' | head -1)"
fi
[ -z "$ICON_NAME" ] && ICON_NAME="$(ls "$HOME/.icons" 2>/dev/null | grep -i '^WhiteSur' | grep -vi cursor | head -1)"

CURSOR_NAME="$(ls "$HOME/.icons" "$HOME/.local/share/icons" 2>/dev/null | grep -i 'whitesur.*cursor' | head -1)"

echo "    tema:   ${GTK_NAME:-NAO ENCONTRADO}"
echo "    icones: ${ICON_NAME:-NAO ENCONTRADO}"
echo "    cursor: ${CURSOR_NAME:-NAO ENCONTRADO}"

if [ -z "$GTK_NAME" ]; then
  echo "!! Tema WhiteSur nao foi instalado. Abortando antes de mexer na aparencia."
  rm -rf "$TMP"
  exit 1
fi

echo "==> Limpando CSS de rices anteriores (backup .bak)..."
if [ -f "$HOME/.config/gtk-3.0/gtk.css" ]; then
  mv "$HOME/.config/gtk-3.0/gtk.css" "$HOME/.config/gtk-3.0/gtk.css.pre-macos.bak"
fi

FONT="Sans 10"
fc-list 2>/dev/null | grep -qi 'Inter' && FONT="Inter 10"

echo "==> Aplicando aparencia..."
setx xsettings /Net/ThemeName string "$GTK_NAME"
[ -n "$ICON_NAME" ]   && setx xsettings /Net/IconThemeName string "$ICON_NAME"
[ -n "$CURSOR_NAME" ] && setx xsettings /Gtk/CursorThemeName string "$CURSOR_NAME"
setx xsettings /Gtk/FontName string "$FONT"
setx xfwm4 /general/theme string "$GTK_NAME"
setx xfwm4 /general/title_font string "${FONT%% *} Bold 10"
setx xfwm4 /general/title_alignment string "center"
setx xfwm4 /general/button_layout string "CHM|"        # fechar/maximizar/minimizar a esquerda
setx xfwm4 /general/use_compositing bool true
setx xfwm4 /general/show_dock_shadow bool false   # evita faixa de sombra em volta do dock
setx xfwm4 /general/show_frame_shadow bool true
setx xfwm4 /general/show_popup_shadow bool true
setx xfwm4 /general/frame_opacity int 100

echo "==> Wallpaper..."
WALL=""
if [ -n "$WALL_ARG" ]; then
  WALL="$WALL_ARG"
else
  for d in "$HOME/Pictures/Wallpapers" "$HOME/Pictures/wallpapers" "$HOME/Pictures" "$HOME/Downloads"; do
    [ -d "$d" ] || continue
    WALL="$(find "$d" -maxdepth 1 -type f \( -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.png' -o -iname '*.webp' \) | sort | head -1)"
    [ -n "$WALL" ] && break
  done
fi
if [ -n "$WALL" ]; then
  echo "    usando: $WALL"
  for p in $(xfconf-query -c xfce4-desktop -l 2>/dev/null | grep '/last-image$'); do
    xfconf-query -c xfce4-desktop -p "$p" -s "$WALL" || true
  done
  for p in $(xfconf-query -c xfce4-desktop -l 2>/dev/null | grep '/image-style$'); do
    xfconf-query -c xfce4-desktop -p "$p" -s 5 || true   # 5 = preencher
  done
  for m in $(xrandr --query 2>/dev/null | awk '/ connected/{print $1}'); do
    setx xfce4-desktop "/backdrop/screen0/monitor${m}/workspace0/last-image" string "$WALL"
    setx xfce4-desktop "/backdrop/screen0/monitor${m}/workspace0/image-style" int 5
  done
else
  echo "    nenhuma imagem encontrada; mantendo o wallpaper atual."
  echo "    Depois: bash rice-macos.sh /caminho/da/imagem.jpg"
fi

echo "==> Painel fino no topo (estilo barra de menu do macOS)..."
if [ "$MODE" = "Dark" ]; then
  R=0.10; G=0.10; B=0.12; A=0.78
else
  R=0.95; G=0.95; B=0.97; A=0.78
fi
setx xfce4-panel /panels/panel-1/position string "p=6;x=0;y=0"
setx xfce4-panel /panels/panel-1/position-locked bool true
setx xfce4-panel /panels/panel-1/size uint 28
setx xfce4-panel /panels/panel-1/icon-size uint 16
setx xfce4-panel /panels/panel-1/length uint 100
setx xfce4-panel /panels/panel-1/background-style uint 1
xfconf-query -c xfce4-panel -p /panels/panel-1/background-rgba -n -a \
  -t double -s "$R" -t double -s "$G" -t double -s "$B" -t double -s "$A" 2>/dev/null \
  || xfconf-query -c xfce4-panel -p /panels/panel-1/background-rgba -a \
  -t double -s "$R" -t double -s "$G" -t double -s "$B" -t double -s "$A" 2>/dev/null || true

echo "==> Fixando o painel no monitor principal..."
PRIMARY="$(xrandr --query 2>/dev/null | awk '/ connected primary/{print $1; exit}')"
if [ -z "$PRIMARY" ]; then
  PRIMARY="$(xrandr --query 2>/dev/null | awk '/ connected/{n=$1} /\*/{print n; exit}')"
fi
if [ -n "$PRIMARY" ]; then
  echo "    monitor principal: $PRIMARY"
  xrandr --output "$PRIMARY" --primary 2>/dev/null || true
  for P in $(xfconf-query -c xfce4-panel -l 2>/dev/null | grep -E '^/panels/panel-[0-9]+/position$' | sed -E 's#/position$##'); do
    xfconf-query -c xfce4-panel -p "$P/output-name" -n -t string -s "$PRIMARY" 2>/dev/null \
      || xfconf-query -c xfce4-panel -p "$P/output-name" -s "$PRIMARY" 2>/dev/null || true
  done
else
  echo "    nao achei monitor principal; painel mantido como esta."
fi

echo "==> Terminal translucido..."
mkdir -p "$HOME/.config/xfce4/terminal"
[ -f "$HOME/.config/xfce4/terminal/terminalrc" ] && cp "$HOME/.config/xfce4/terminal/terminalrc" "$HOME/.config/xfce4/terminal/terminalrc.bak"
if [ "$MODE" = "Dark" ]; then
  TFG="#e6e6e6"; TBG="#1c1c1e"
else
  TFG="#1c1c1e"; TBG="#f5f5f7"
fi
cat > "$HOME/.config/xfce4/terminal/terminalrc" <<RC
[Configuration]
FontUseSystem=FALSE
FontName=JetBrains Mono 11
ColorForeground=$TFG
ColorBackground=$TBG
MiscMenubarDefault=FALSE
MiscToolbarDefault=FALSE
MiscDefaultGeometry=100x30
BackgroundMode=TERMINAL_BACKGROUND_TRANSPARENT
BackgroundDarkness=0.85
RC

echo "==> Sem dock (visual clean): fechando Plank se estiver rodando..."
pkill plank 2>/dev/null || true
rm -f "$HOME/.config/autostart/plank.desktop"

echo "==> Limpando e recarregando..."
rm -rf "$TMP"
xfdesktop --reload >/dev/null 2>&1 || true
(setsid xfwm4 --replace >/dev/null 2>&1 &)
sleep 1
# reinicio seguro do painel: funciona mesmo se ele nao estiver rodando
pkill -x xfce4-panel 2>/dev/null || true
sleep 1
(setsid xfce4-panel >/dev/null 2>&1 &)

echo
echo "Pronto! Se algo ficar estranho, faca logout/login."
echo "Voltar o painel antigo:   xfce4-panel-profiles load ~/panel-backup-macos.tar.bz2"
echo "Se o painel sumir:        xfce4-panel &   (clique em Remove, nunca em Quit/X, se aparecer aviso)"
echo "Painel no monitor errado: xfconf-query -c xfce4-panel -p /panels/panel-1/output-name -n -t string -s NOME  (veja o nome: xrandr | grep ' connected')"
echo "Tema claro: bash rice-macos.sh --light"
__EMBED_rice-macos__

cat > "$WORK/panel-padding.sh" <<'__EMBED_panel-padding__'
#!/usr/bin/env bash
# panel-padding.sh - coloca espacadores transparentes no INICIO (antes do Start) e no FIM (depois do relogio)
# do painel que tem a lista de janelas (a taskbar). Tambem volta o comprimento do painel para 100%.
# Uso:  bash panel-padding.sh          -> 2 espacadores em cada ponta
#       bash panel-padding.sh 3        -> 3 espacadores em cada ponta (mais folga)
#       bash panel-padding.sh --force  -> aplica de novo mesmo se ja tiver aplicado
set -u

N=2
FORCE=0
for a in "$@"; do
  case "$a" in
    --force) FORCE=1 ;;
    [0-9]*)  N="$a" ;;
  esac
done

CH=xfce4-panel

ids_of() { # ids_of /panels/panel-1/plugin-ids
  xfconf-query -c "$CH" -p "$1" 2>/dev/null | grep -E '^[0-9]+$'
}
type_of() { xfconf-query -c "$CH" -p "/plugins/plugin-$1" 2>/dev/null; }

echo "==> Backup do painel em ~/panel-backup-padding.tar.bz2 ..."
xfce4-panel-profiles save "$HOME/panel-backup-padding.tar.bz2" >/dev/null 2>&1 || true

# acha o painel que tem a taskbar (tasklist)
TARGET=""
for P in $(xfconf-query -c "$CH" -l 2>/dev/null | grep -E '^/panels/panel-[0-9]+/plugin-ids$' | sed -E 's#/plugin-ids$##'); do
  for id in $(ids_of "$P/plugin-ids"); do
    if [ "$(type_of "$id")" = "tasklist" ]; then TARGET="$P"; break 2; fi
  done
done
[ -z "$TARGET" ] && TARGET="/panels/panel-1"
echo "    painel alvo: $TARGET"

mapfile -t IDS < <(ids_of "$TARGET/plugin-ids")
if [ "${#IDS[@]}" -eq 0 ]; then
  echo "!! Nao consegui ler os plugins do painel. Nada foi alterado."
  exit 1
fi

FIRST="${IDS[0]}"
LAST="${IDS[${#IDS[@]}-1]}"
if [ "$FORCE" = 0 ] && [ "$(type_of "$FIRST")" = "separator" ] && [ "$(type_of "$LAST")" = "separator" ]; then
  echo "O painel ja parece ter espacadores nas pontas. Use --force para adicionar mais."
  exit 0
fi

echo "==> Voltando comprimento para 100% ..."
xfconf-query -c "$CH" -p "$TARGET/length" -s 100 2>/dev/null || true

# proximo id livre
MAXID="$(xfconf-query -c "$CH" -l 2>/dev/null | grep -oE '^/plugins/plugin-[0-9]+' | grep -oE '[0-9]+$' | sort -n | tail -1)"
[ -z "$MAXID" ] && MAXID=0

new_sep() { # cria um separador transparente e devolve o id
  MAXID=$((MAXID + 1))
  xfconf-query -c "$CH" -p "/plugins/plugin-$MAXID" -n -t string -s "separator" 2>/dev/null
  xfconf-query -c "$CH" -p "/plugins/plugin-$MAXID/style" -n -t uint -s 0 2>/dev/null   # 0 = transparente
  xfconf-query -c "$CH" -p "/plugins/plugin-$MAXID/expand" -n -t bool -s false 2>/dev/null
  echo "$MAXID"
}

START=(); END=()
for ((i = 0; i < N; i++)); do START+=("$(new_sep)"); done
for ((i = 0; i < N; i++)); do END+=("$(new_sep)"); done

ALL=("${START[@]}" "${IDS[@]}" "${END[@]}")

echo "==> Aplicando ${N} espacador(es) em cada ponta ..."
ARGS=()
for id in "${ALL[@]}"; do ARGS+=(-t int -s "$id"); done
xfconf-query -c "$CH" -p "$TARGET/plugin-ids" -a "${ARGS[@]}" 2>/dev/null \
  || xfconf-query -c "$CH" -p "$TARGET/plugin-ids" -n -a "${ARGS[@]}" 2>/dev/null \
  || { echo "!! Nao consegui gravar os plugins. Nada mudou visualmente."; exit 1; }

echo "==> Reiniciando o painel ..."
pkill -x xfce4-panel 2>/dev/null || true
sleep 1
(setsid xfce4-panel >/dev/null 2>&1 &)

echo
echo "Pronto! Para mais folga:      bash panel-padding.sh 3 --force"
echo "Para desfazer:                xfce4-panel-profiles load ~/panel-backup-padding.tar.bz2"
echo "Se o painel sumir:            xfce4-panel &   (clique em Remove, nunca em Quit/X)"
__EMBED_panel-padding__

cat > "$WORK/panel-tabs-space.sh" <<'__EMBED_panel-tabs-space__'
#!/usr/bin/env bash
# panel-tabs-space.sh - coloca um espacador transparente EXPANSIVEL logo depois da lista de janelas (taskbar).
# Resultado: as abas ocupam o espaco do meio (e comprimem quando ha muitas janelas) e
# tudo que vem depois (notificacoes, relogio, CPU...) fica fixo na ponta direita.
# Uso: bash panel-tabs-space.sh
set -u
CH=xfce4-panel

ids_of()  { xfconf-query -c "$CH" -p "$1" 2>/dev/null | grep -E '^[0-9]+$'; }
type_of() { xfconf-query -c "$CH" -p "/plugins/plugin-$1" 2>/dev/null; }

echo "==> Backup do painel em ~/panel-backup-tabs.tar.bz2 ..."
xfce4-panel-profiles save "$HOME/panel-backup-tabs.tar.bz2" >/dev/null 2>&1 || true

TARGET=""; TASK=""
for P in $(xfconf-query -c "$CH" -l 2>/dev/null | grep -E '^/panels/panel-[0-9]+/plugin-ids$' | sed -E 's#/plugin-ids$##'); do
  for id in $(ids_of "$P/plugin-ids"); do
    if [ "$(type_of "$id")" = "tasklist" ]; then TARGET="$P"; TASK="$id"; break 2; fi
  done
done
if [ -z "$TARGET" ]; then
  echo "!! Nao achei a lista de janelas (tasklist) em nenhum painel. Nada foi alterado."
  exit 1
fi
echo "    painel: $TARGET | tasklist: plugin-$TASK"

mapfile -t IDS < <(ids_of "$TARGET/plugin-ids")

# ja existe espacador expansivo logo depois da tasklist?
for ((i = 0; i < ${#IDS[@]}; i++)); do
  if [ "${IDS[$i]}" = "$TASK" ]; then POS=$i; break; fi
done
NEXT="${IDS[$((POS + 1))]:-}"
if [ -n "$NEXT" ] && [ "$(type_of "$NEXT")" = "separator" ] \
   && [ "$(xfconf-query -c "$CH" -p "/plugins/plugin-$NEXT/expand" 2>/dev/null)" = "true" ]; then
  echo "Ja existe um espacador expansivo depois da lista de janelas. Nada a fazer."
  exit 0
fi

MAXID="$(xfconf-query -c "$CH" -l 2>/dev/null | grep -oE '^/plugins/plugin-[0-9]+' | grep -oE '[0-9]+$' | sort -n | tail -1)"
[ -z "$MAXID" ] && MAXID=0
NEWID=$((MAXID + 1))

xfconf-query -c "$CH" -p "/plugins/plugin-$NEWID" -n -t string -s "separator" 2>/dev/null
xfconf-query -c "$CH" -p "/plugins/plugin-$NEWID/style" -n -t uint -s 0 2>/dev/null      # transparente
xfconf-query -c "$CH" -p "/plugins/plugin-$NEWID/expand" -n -t bool -s true 2>/dev/null  # ocupa o espaco livre

ALL=()
for ((i = 0; i < ${#IDS[@]}; i++)); do
  ALL+=("${IDS[$i]}")
  [ "$i" -eq "$POS" ] && ALL+=("$NEWID")
done

echo "==> Inserindo o espacador (plugin-$NEWID) depois da tasklist ..."
ARGS=()
for id in "${ALL[@]}"; do ARGS+=(-t int -s "$id"); done
xfconf-query -c "$CH" -p "$TARGET/plugin-ids" -a "${ARGS[@]}" 2>/dev/null \
  || xfconf-query -c "$CH" -p "$TARGET/plugin-ids" -n -a "${ARGS[@]}" 2>/dev/null \
  || { echo "!! Nao consegui gravar a ordem dos plugins."; exit 1; }

echo "==> Reiniciando o painel ..."
pkill -x xfce4-panel 2>/dev/null || true
sleep 1
(setsid xfce4-panel >/dev/null 2>&1 &)

echo
echo "Pronto! Para desfazer:  xfce4-panel-profiles load ~/panel-backup-tabs.tar.bz2"
echo "Se o painel sumir:      xfce4-panel &   (clique em Remove, nunca em Quit/X)"
__EMBED_panel-tabs-space__

cat > "$WORK/launcher-icons.sh" <<'__EMBED_launcher-icons__'
#!/usr/bin/env bash
# launcher-icons.sh - troca os icones dos ATALHOS do painel (navegador, arquivos, terminal...) por icones
# "normais" dos proprios apps (hicolor/Adwaita), em vez dos icones estilo Mac do tema WhiteSur.
# Os demais icones do sistema continuam como estao.
# Uso: bash launcher-icons.sh             -> aplica
#      bash launcher-icons.sh --restore   -> volta os icones originais dos atalhos
set -u

ICON_DIRS="${ICON_DIRS:-/usr/share/icons/hicolor /usr/share/pixmaps /usr/share/icons/Adwaita}"
LDIR="${LAUNCHER_ROOT:-$HOME/.config/xfce4/panel}"

mapfile -t FILES < <(find "$LDIR" -path '*/launcher-*/*.desktop' 2>/dev/null | sort)
if [ "${#FILES[@]}" -eq 0 ]; then
  echo "!! Nao achei atalhos de painel em $LDIR/launcher-*/. Nada foi alterado."
  exit 1
fi

if [ "${1:-}" = "--restore" ]; then
  for f in "${FILES[@]}"; do
    [ -f "$f.bak" ] && cp "$f.bak" "$f" && echo "restaurado: $(basename "$f")"
  done
  pkill -x xfce4-panel 2>/dev/null || true; sleep 1; (setsid xfce4-panel >/dev/null 2>&1 &)
  exit 0
fi

candidates_for() { # $1 = linha Exec
  case "$1" in
    *firefox*|*WebBrowser*)                     echo "firefox-esr firefox";;
    *[Tt]hunar*|*FileManager*)                  echo "org.xfce.thunar org.xfce.filemanager system-file-manager";;
    *xfce4-terminal*|*TerminalEmulator*)        echo "org.xfce.terminal utilities-terminal";;
    *settings-manager*)                         echo "org.xfce.settings.manager preferences-system";;
    *appfinder*)                                echo "org.xfce.appfinder system-search";;
    *thunderbird*|*MailReader*)                 echo "thunderbird mail-client";;
    *) echo "";;
  esac
}

find_icon() { # $1 = nome do icone -> imprime caminho absoluto (svg ou o png maior)
  local d r
  for d in $ICON_DIRS; do
    [ -d "$d" ] || continue
    r="$(find "$d" \( -name "$1.svg" -o -name "$1.png" \) -not -path '*symbolic*' 2>/dev/null | sort -V | tail -1)"
    [ -n "$r" ] && { echo "$r"; return 0; }
  done
  return 1
}

CHANGED=0
for f in "${FILES[@]}"; do
  name="$(grep -m1 '^Name=' "$f" | cut -d= -f2-)"
  exec_line="$(grep -m1 '^Exec=' "$f" | cut -d= -f2-)"
  cur="$(grep -m1 '^Icon=' "$f" | cut -d= -f2-)"
  cands="$(candidates_for "$exec_line")"
  if [ -z "$cands" ]; then
    echo "  [-] $name ($exec_line): nao reconhecido, mantido (icone atual: $cur)"
    continue
  fi
  found=""
  for c in $cands; do
    found="$(find_icon "$c")" && break
    found=""
  done
  if [ -z "$found" ]; then
    echo "  [!] $name: nao achei icone normal ($cands); mantido"
    continue
  fi
  [ -f "$f.bak" ] || cp "$f" "$f.bak"
  if grep -q '^Icon=' "$f"; then
    sed -i "s|^Icon=.*|Icon=$found|" "$f"
  else
    echo "Icon=$found" >> "$f"
  fi
  echo "  [ok] $name: $cur -> $found"
  CHANGED=$((CHANGED + 1))
done

echo
echo "$CHANGED atalho(s) alterado(s)."
if [ "$CHANGED" -gt 0 ]; then
  pkill -x xfce4-panel 2>/dev/null || true
  sleep 1
  (setsid xfce4-panel >/dev/null 2>&1 &)
  echo "Painel reiniciado. Para voltar ao estilo anterior: bash launcher-icons.sh --restore"
fi
__EMBED_launcher-icons__

cat > "$WORK/start-star.sh" <<'__EMBED_start-star__'
#!/usr/bin/env bash
# start-star.sh - troca o icone do botao Start/menu do painel por uma estrela amarela (estilo old school).
# Uso: bash start-star.sh             -> aplica
#      bash start-star.sh --restore   -> volta ao icone padrao do menu
set -u
CH=xfce4-panel
ICON="$HOME/.local/share/icons/start-star.svg"

ids_of()  { xfconf-query -c "$CH" -p "$1" 2>/dev/null | grep -E '^[0-9]+$'; }
type_of() { xfconf-query -c "$CH" -p "/plugins/plugin-$1" 2>/dev/null; }

# acha o botao de menu: whiskermenu ou applicationsmenu (o primeiro encontrado no painel da taskbar)
TASKPANEL=""
for P in $(xfconf-query -c "$CH" -l 2>/dev/null | grep -E '^/panels/panel-[0-9]+/plugin-ids$' | sed -E 's#/plugin-ids$##'); do
  for id in $(ids_of "$P/plugin-ids"); do
    [ "$(type_of "$id")" = "tasklist" ] && { TASKPANEL="$P"; break 2; }
  done
done
MENU_ID=""; MENU_TYPE=""
search() { # $1 = painel ou vazio (todos)
  local list id t
  if [ -n "$1" ]; then list="$1/plugin-ids"; else list="$(xfconf-query -c "$CH" -l 2>/dev/null | grep -E '^/panels/panel-[0-9]+/plugin-ids$')"; fi
  for L in $list; do
    for id in $(ids_of "$L"); do
      t="$(type_of "$id")"
      case "$t" in whiskermenu|applicationsmenu) MENU_ID="$id"; MENU_TYPE="$t"; return 0;; esac
    done
  done
  return 1
}
search "$TASKPANEL" || search "" || { echo "!! Nao achei o botao de menu (whiskermenu/applicationsmenu) no painel. Nada alterado."; exit 1; }
echo "    botao de menu: plugin-$MENU_ID ($MENU_TYPE)"

PROP="/plugins/plugin-$MENU_ID/button-icon"
if [ "${1:-}" = "--restore" ]; then
  if [ "$MENU_TYPE" = "whiskermenu" ]; then DEF="org.xfce.panel.whiskermenu"; else DEF="org.xfce.panel.applicationsmenu"; fi
  xfconf-query -c "$CH" -p "$PROP" -n -t string -s "$DEF" 2>/dev/null || xfconf-query -c "$CH" -p "$PROP" -s "$DEF"
else
  mkdir -p "$HOME/.local/share/icons"
  cat > "$ICON" <<'SVG'
<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffe56b"/>
      <stop offset="1" stop-color="#ffb300"/>
    </linearGradient>
  </defs>
  <polygon points="32.00,3.00 39.05,22.29 59.58,23.04 43.41,35.71 49.05,55.46 32.00,44.00 14.95,55.46 20.59,35.71 4.42,23.04 24.95,22.29" fill="url(#g)" stroke="#8a5a00" stroke-width="2.5" stroke-linejoin="round"/>
</svg>
SVG
  xfconf-query -c "$CH" -p "$PROP" -n -t string -s "$ICON" 2>/dev/null || xfconf-query -c "$CH" -p "$PROP" -s "$ICON"
  xfconf-query -c "$CH" -p "/plugins/plugin-$MENU_ID/show-button-icon" -n -t bool -s true 2>/dev/null || true
fi

pkill -x xfce4-panel 2>/dev/null || true
sleep 1
(setsid xfce4-panel >/dev/null 2>&1 &)
echo "Pronto! Para voltar ao icone original: bash start-star.sh --restore"
echo "Se o painel sumir: xfce4-panel &   (clique em Remove, nunca em Quit/X)"
__EMBED_start-star__

cat > "$WORK/install-panel-autoopaque.sh" <<'__EMBED_install-panel-autoopaque__'
#!/usr/bin/env bash
# install-panel-autoopaque.sh
# Instala um vigia que deixa a taskbar PRETA e OPACA quando existe uma janela maximizada ou em tela cheia
# na area de trabalho atual, e volta ao visual translucido normal quando nao ha mais.
# Instala em ~/.local/bin/panel-autoopaque.sh e cria um autostart (inicia sozinho a cada login).
# Uso: bash install-panel-autoopaque.sh            (instalar)
#      bash install-panel-autoopaque.sh --remove   (desinstalar)
set -u

BIN="$HOME/.local/bin/panel-autoopaque.sh"
AUTO="$HOME/.config/autostart/panel-autoopaque.desktop"

if [ "${1:-}" = "--remove" ]; then
  pkill -f "bin/panel-autoopaque.sh" 2>/dev/null || true
  rm -f "$BIN" "$AUTO"
  echo "Removido. Se a barra ficou preta, rode: xfce4-panel-profiles load ~/panel-backup-padding.tar.bz2  (ou ajuste a cor em Painel > Preferencias > Aparencia)."
  exit 0
fi

if ! command -v xprop >/dev/null 2>&1; then
  echo "==> Instalando x11-utils (xprop)..."
  sudo apt update && sudo apt install -y x11-utils
fi

mkdir -p "$HOME/.local/bin" "$HOME/.config/autostart"

# ===== INICIO DO VIGIA =====
cat > "$BIN" <<'WATCHER'
#!/usr/bin/env bash
# panel-autoopaque.sh - painel preto/opaco quando ha janela maximizada ou em tela cheia
CH=xfce4-panel
INTERVAL="${INTERVAL:-0.5}"

ids_of()  { xfconf-query -c "$CH" -p "$1" 2>/dev/null | grep -E '^[0-9]+$'; }
type_of() { xfconf-query -c "$CH" -p "/plugins/plugin-$1" 2>/dev/null; }

# painel que tem a lista de janelas (taskbar); se nao achar, usa o panel-1
PANEL=""
for P in $(xfconf-query -c "$CH" -l 2>/dev/null | grep -E '^/panels/panel-[0-9]+/plugin-ids$' | sed -E 's#/plugin-ids$##'); do
  for id in $(ids_of "$P/plugin-ids"); do
    if [ "$(type_of "$id")" = "tasklist" ]; then PANEL="$P"; break 2; fi
  done
done
[ -z "$PANEL" ] && PANEL="/panels/panel-1"
PROP="$PANEL/background-rgba"

# cor normal = a que o painel tem agora (4 numeros: R G B A)
mapfile -t NORMAL < <(xfconf-query -c "$CH" -p "$PROP" 2>/dev/null | grep -E '^[0-9.]+$')
if [ "${#NORMAL[@]}" -ne 4 ]; then NORMAL=(0.10 0.10 0.12 0.78); fi

set_rgba() { # R G B A
  xfconf-query -c "$CH" -p "$PROP" -a -t double -s "$1" -t double -s "$2" -t double -s "$3" -t double -s "$4" 2>/dev/null \
    || xfconf-query -c "$CH" -p "$PROP" -n -a -t double -s "$1" -t double -s "$2" -t double -s "$3" -t double -s "$4" 2>/dev/null || true
  xfconf-query -c "$CH" -p "$PANEL/background-style" -s 1 2>/dev/null || true
}

# 0 = ha janela maximizada/tela cheia visivel na area de trabalho atual
has_full() {
  local cur w props desk
  cur="$(xprop -root _NET_CURRENT_DESKTOP 2>/dev/null | awk '{print $NF}')"
  for w in $(xprop -root _NET_CLIENT_LIST 2>/dev/null | grep -oE '0x[0-9a-fA-F]+'); do
    props="$(xprop -id "$w" _NET_WM_STATE _NET_WM_DESKTOP 2>/dev/null)"
    echo "$props" | grep -q '_NET_WM_STATE_HIDDEN' && continue          # minimizada
    desk="$(echo "$props" | awk '/_NET_WM_DESKTOP/{print $NF}')"
    if [ -n "$desk" ] && [ "$desk" != "$cur" ] && [ "$desk" != "4294967295" ]; then continue; fi
    if echo "$props" | grep -q '_NET_WM_STATE_FULLSCREEN'; then return 0; fi
    if echo "$props" | grep -q 'MAXIMIZED_HORZ' && echo "$props" | grep -q 'MAXIMIZED_VERT'; then return 0; fi
  done
  return 1
}

restore() { set_rgba "${NORMAL[@]}"; }
trap 'restore; exit 0' INT TERM

if [ "${1:-}" = "--once" ]; then   # modo de teste: avalia uma vez
  if has_full; then echo "FULL"; else echo "NORMAL"; fi
  exit 0
fi

state="normal"
while true; do
  if has_full; then
    if [ "$state" != "full" ]; then set_rgba 0 0 0 1; state="full"; fi
  else
    if [ "$state" != "normal" ]; then restore; state="normal"; fi
  fi
  sleep "$INTERVAL"
done
WATCHER
# ===== FIM DO VIGIA =====
chmod +x "$BIN"

cat > "$AUTO" <<DESK
[Desktop Entry]
Type=Application
Name=Painel opaco ao maximizar
Exec=$BIN
X-GNOME-Autostart-enabled=true
DESK

pkill -f "bin/panel-autoopaque.sh" 2>/dev/null || true
(setsid "$BIN" >/dev/null 2>&1 &)

echo "Pronto! Maximize uma janela (duplo clique na barra de titulo) para testar."
echo "Desinstalar: bash install-panel-autoopaque.sh --remove"
__EMBED_install-panel-autoopaque__

cat > "$WORK/sysinfo.sh" <<'__EMBED_sysinfo__'
#!/usr/bin/env bash
# sysinfo.sh - mostra uso de CPU e RAM para o plugin "Generic Monitor" do painel Xfce.
# Saida no formato do genmon: <txt> (painel) e <tool> (tooltip).
# Instalacao sugerida:  mkdir -p ~/.local/bin && cp sysinfo.sh ~/.local/bin/ && chmod +x ~/.local/bin/sysinfo.sh

STATE="${XDG_RUNTIME_DIR:-/tmp}/sysinfo-cpu-$USER.state"

# --- CPU: diferenca entre duas leituras de /proc/stat (guarda a anterior em arquivo) ---
read -r _ u n s i io irq sirq st _ < /proc/stat
total=$((u + n + s + i + io + irq + sirq + st))
idle=$((i + io))
cpu=0
if [ -f "$STATE" ]; then
  read -r ptotal pidle < "$STATE"
  dt=$((total - ptotal))
  di=$((idle - pidle))
  if [ "$dt" -gt 0 ]; then
    cpu=$(( (100 * (dt - di)) / dt ))
  fi
fi
echo "$total $idle" > "$STATE"

# --- RAM ---
mem_total=$(awk '/^MemTotal:/{print $2}' /proc/meminfo)
mem_avail=$(awk '/^MemAvailable:/{print $2}' /proc/meminfo)
mem_used=$((mem_total - mem_avail))
ram_pct=$(( (100 * mem_used) / mem_total ))
used_g=$(awk -v k="$mem_used" 'BEGIN{printf "%.1f", k/1048576}')
total_g=$(awk -v k="$mem_total" 'BEGIN{printf "%.1f", k/1048576}')

# --- Temperatura (opcional, se existir) ---
temp=""
for z in /sys/class/thermal/thermal_zone*/temp; do
  [ -r "$z" ] || continue
  t=$(cat "$z" 2>/dev/null)
  [ -n "$t" ] && [ "$t" -gt 0 ] && { temp="$((t / 1000))°C"; break; }
done

load=$(cut -d' ' -f1-3 /proc/loadavg)

echo "<txt>CPU ${cpu}%  RAM ${used_g}G</txt>"
tip="CPU: ${cpu}%"
tip="${tip}\nRAM: ${used_g} / ${total_g} GiB (${ram_pct}%)"
tip="${tip}\nCarga: ${load}"
[ -n "$temp" ] && tip="${tip}\nTemperatura: ${temp}"
echo "<tool>$(printf '%b' "$tip")</tool>"

if command -v xfce4-taskmanager >/dev/null 2>&1; then
  echo "<txtclick>xfce4-taskmanager</txtclick>"
fi
__EMBED_sysinfo__

[ "${RICE_EXTRACT_ONLY:-}" = 1 ] && { trap - EXIT; echo "$WORK"; exit 0; }

step() { echo; echo "=================================================="; echo "== $*"; echo "=================================================="; }

step "1/9 Tema macOS, painel e terminal"
bash "$WORK/rice-macos.sh" "$@"

step "2/9 Area de trabalho so com a Lixeira"
xfconf-query -c xfce4-desktop -p /desktop-icons/file-icons/show-home -n -t bool -s false 2>/dev/null \
  || xfconf-query -c xfce4-desktop -p /desktop-icons/file-icons/show-home -s false 2>/dev/null || true
xfconf-query -c xfce4-desktop -p /desktop-icons/file-icons/show-filesystem -n -t bool -s false 2>/dev/null \
  || xfconf-query -c xfce4-desktop -p /desktop-icons/file-icons/show-filesystem -s false 2>/dev/null || true
xfconf-query -c xfce4-desktop -p /desktop-icons/file-icons/show-trash -n -t bool -s true 2>/dev/null \
  || xfconf-query -c xfce4-desktop -p /desktop-icons/file-icons/show-trash -s true 2>/dev/null || true
xfdesktop --reload >/dev/null 2>&1 || true

step "3/9 Folga no Start e no relogio"
bash "$WORK/panel-padding.sh"

step "4/9 Abas no meio, informacoes fixas na direita"
bash "$WORK/panel-tabs-space.sh"

step "5/9 Espaco entre as abas da taskbar"
mkdir -p "$HOME/.config/gtk-3.0"
if grep -q 'espaco entre as abas da taskbar' "$HOME/.config/gtk-3.0/gtk.css" 2>/dev/null; then
  echo "CSS das abas ja aplicado."
else
  cat >> "$HOME/.config/gtk-3.0/gtk.css" <<'CSS'

/* espaco entre as abas da taskbar */
.xfce4-panel .tasklist button,
#XfceTasklist button {
  margin-left: 3px;
  margin-right: 3px;
}
CSS
  echo "CSS das abas aplicado."
fi
pkill -x xfce4-panel 2>/dev/null || true; sleep 1; (setsid xfce4-panel >/dev/null 2>&1 &); sleep 1

step "6/9 Icones normais nos atalhos"
bash "$WORK/launcher-icons.sh"

step "7/9 Botao Start com estrela"
bash "$WORK/start-star.sh"

step "8/9 Painel preto e opaco ao maximizar"
bash "$WORK/install-panel-autoopaque.sh"

step "9/9 Script de CPU/RAM"
mkdir -p "$HOME/.local/bin"
cp "$WORK/sysinfo.sh" "$HOME/.local/bin/sysinfo.sh"
chmod +x "$HOME/.local/bin/sysinfo.sh"
echo "Salvo em $HOME/.local/bin/sysinfo.sh"

echo
echo "=================================================="
echo " PRONTO! Se algo ficar estranho, faca logout e login."
echo "=================================================="
echo
echo "Falta so UMA coisa, manual (o Xfce nao deixa automatizar):"
echo "  CPU/RAM na barra: botao direito na barra > Painel > Adicionar novos itens > Monitor Generico"
echo "  Depois botao direito nele > Propriedades:"
echo "     Comando:  $HOME/.local/bin/sysinfo.sh"
echo "     Rotulo:   desmarque    |    Periodo: 2 segundos"
echo "  Use as setas em Painel > Preferencias do painel > Itens para posicionar (depois da lista de janelas)."
echo
echo "Desfazer partes:"
echo "  Painel antigo:       xfce4-panel-profiles load ~/panel-backup-macos.tar.bz2"
echo "  Barra preta/opaca:   rm ~/.local/bin/panel-autoopaque.sh ~/.config/autostart/panel-autoopaque.desktop  (e saia/entre na sessao)"
echo "  Icones dos atalhos:  os originais ficam em ~/.config/xfce4/panel/launcher-*/*.desktop.bak"
echo "  Se o painel sumir:   xfce4-panel &   (clique em Remove, nunca em Quit/X)"
