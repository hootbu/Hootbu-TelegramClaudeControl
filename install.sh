#!/bin/zsh
set -e

DIR=$(cd "$(dirname "$0")" && pwd)
LABEL=com.hootbu.telegram-router
PLIST=$HOME/Library/LaunchAgents/$LABEL.plist
LOG=$HOME/Library/Logs/hootbu-telegram-router.log
APP="$HOME/Desktop/Telegram Claude.app"
BUN=$(command -v bun || true)
CLAUDE=$(command -v claude || true)

[[ -x $BUN && -x $CLAUDE ]] || { echo "bun ve claude PATH'te olmalı."; exit 1; }
[[ -f $HOME/.claude/channels/telegram/.env && -f $HOME/.claude/channels/telegram/access.json ]] || { echo "~/.claude/channels/telegram/.env ve access.json gerekli, README'ye bak."; exit 1; }

mkdir -p "$HOME/Library/LaunchAgents" "$HOME/Library/Logs"
cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>Label</key>
	<string>$LABEL</string>
	<key>ProgramArguments</key>
	<array>
		<string>$BUN</string>
		<string>$DIR/router.ts</string>
	</array>
	<key>EnvironmentVariables</key>
	<dict>
		<key>PATH</key>
		<string>${CLAUDE:h}:${BUN:h}:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
		<key>LANG</key>
		<string>en_US.UTF-8</string>
	</dict>
	<key>RunAtLoad</key>
	<true/>
	<key>KeepAlive</key>
	<true/>
	<key>StandardOutPath</key>
	<string>$LOG</string>
	<key>StandardErrorPath</key>
	<string>$LOG</string>
</dict>
</plist>
EOF

launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
launchctl enable "gui/$(id -u)/$LABEL"
launchctl bootstrap "gui/$(id -u)" "$PLIST"

rm -rf "$APP"
osacompile -o "$APP" "$DIR/baslat.applescript"

echo "Kuruldu. Masaüstündeki Telegram Claude simgesi servisi açıp kapatır. Log: $LOG"
