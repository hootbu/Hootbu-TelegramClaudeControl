<p align="center">
  <img src="media/icon.png" alt="" width="88" height="88">
</p>

<h1 align="center">Hootbu Telegram Claude Control</h1>

<p align="center">
  <strong>Drive Claude Code on your Mac from Telegram.</strong>
</p>

<p align="center">
  <a href="https://claude.com/claude-code"><img src="https://img.shields.io/badge/Claude%20Code-from%20Telegram-d97757" alt="Claude Code from Telegram"></a>
  <img src="https://img.shields.io/badge/platform-macOS-007ACC" alt="Platform: macOS">
  <img src="https://img.shields.io/badge/runtime-Bun-black" alt="Runtime: Bun">
  <img src="https://img.shields.io/badge/dependencies-none-2E7D32" alt="No dependencies">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-yellow" alt="License: MIT"></a>
</p>

<details>
<summary><b>🇹🇷&nbsp; Türkçe</b> &nbsp;</summary>
<br>

Resmi Telegram eklentisi botu tek bir Claude Code oturumuna bağlar. Her yeni oturum kendi dinleyicisini açıp öncekini düşürür, siz de bağlantıyı geri almak için Mac'in başına dönersiniz. Bu proje botu tek bir küçük servise verir. Servis arka planda çalışır, Telegram'dan istediğiniz projeyi ve oturumu seçersiniz, her mesaj `claude -p --resume` ile o oturumda çalışır. Masaya dönüp `claude --resume` dediğinizde aynı sohbet karşınızdadır.

## Ne yapar

- Botu tek süreç dinler. Oturumlar birbirinin bağlantısını koparmaz, reconnect gerekmez.
- Son projeleri ve oturumlarını doğrudan `~/.claude/projects` içinden listeler, ayar dosyası yok.
- Mac'te bıraktığınız oturuma devam eder ya da `/clear` ile temiz bir oturum açar.
- `/usage`, `/context`, `/compact` gibi Claude Code komutlarını olduğu gibi iletir.
- Claude'un cevapları yazıldıkça gelir. Her cevabın sonunda bağlamın ne kadar dolduğunu gösteren sessiz bir satır olur.
- Claude çalışırken gönderdiğiniz mesajları sıraya alır, `/dur` çalışan işi keser.
- Oturum açılınca kendiliğinden başlar, çökerse yeniden kalkar. Masaüstündeki simge servisi açıp kapatır.

## Gerekenler

- macOS, giriş yapılmış [Claude Code](https://claude.com/claude-code) ve [Bun](https://bun.sh).
- `@BotFather`'dan alınmış bir bot token'ı ve Telegram kullanıcı kimliğiniz.

## Kurulum

```bash
git clone https://github.com/hootbu/Hootbu-TelegramClaudeControl.git
cd Hootbu-TelegramClaudeControl
```

Token ve kullanıcı kimliğiniz, resmi Telegram eklentisinin kullandığı yere yazılır:

```bash
mkdir -p ~/.claude/channels/telegram
echo "TELEGRAM_BOT_TOKEN=<token>" > ~/.claude/channels/telegram/.env
echo '{"allowFrom": ["<kullanıcı kimliği>"]}' > ~/.claude/channels/telegram/access.json
chmod 600 ~/.claude/channels/telegram/.env ~/.claude/channels/telegram/access.json
```

Resmi eklentiyi kullanıyorsanız bu dosyalar zaten var. Eklentiyi kapatın, yoksa botu geri alır:

```bash
claude plugin disable telegram@claude-plugins-official
```

Sonra:

```bash
./install.sh
```

Betik launchd servisini kaydedip başlatır, Masaüstüne **Telegram Claude** simgesini koyar.

## Kullanım

Botla sohbeti açıp `/` yazın, komutlar menüde çıkar.

| Komut | Ne yapar |
|---|---|
| `/projeler` | Son 10 proje |
| `/proje <no ya da ad>` | Projeyi seçer, son oturumuna bağlanır. Argümansız nerede olduğunuzu gösterir |
| `/oturumlar` | Projenin son 10 oturumu |
| `/devam <no>` | O oturuma geçer |
| `/clear` | Sonraki mesaj yeni oturumda başlar |
| `/dur` | Çalışan işi durdurur, sırayı boşaltır |
| `/usage`, `/context`, `/compact` | Diğer `/` komutları gibi Claude Code'a olduğu gibi gider |

Bunların dışında yazdığınız her şey seçili oturuma gider.

## Açıp kapatma

Masaüstündeki **Telegram Claude** simgesine çift tıklayın. Servis çalışıyorsa durdurmak isteyip istemediğinizi sorar. Durdurulan servis Mac yeniden başlasa da kapalı kalır. Duruyorsa başlatır.

Log: `~/Library/Logs/hootbu-telegram-router.log`

## Bilinmesi gerekenler

**Telegram'dan Mac'inizin kabuğu.** Mac'in başında onay verecek kimse olmadığı için Claude `--dangerously-skip-permissions` ile çalışır. Bot yalnız `allowFrom` listesindeki kullanıcılardan gelen özel mesajlara cevap verir. Listeyi kendinize saklayın.

**Mac uyanık olmalı.** Mac uyurken bot susar. Telegram mesajları 24 saate kadar tutar, Mac uyanınca sırayla çalışırlar.

**Bir oturum, bir pencere.** Mac'te terminalde açık duran bir oturuma Telegram'dan devam ederseniz o pencere yeni mesajları görmez. Döndüğünüzde pencereyi kapatıp `claude --resume` ile açın.

**`--effort max` ile çalışır.** İstemezseniz `router.ts` içindeki `CLAUDE_ARGS` satırını değiştirin.

## Kaldırma

```bash
launchctl bootout gui/$(id -u)/com.hootbu.telegram-router
rm ~/Library/LaunchAgents/com.hootbu.telegram-router.plist
rm -rf ~/Desktop/"Telegram Claude.app"
```

## Lisans

MIT © Emir Yorgun

<hr>
</details>

The official Telegram plugin ties the bot to one Claude Code session. Every new session starts its own poller and knocks the previous one off, so you end up walking back to your Mac to reconnect. This hands the bot to one small service instead. It runs in the background, you pick any project and session from Telegram, and each message runs in that session through `claude -p --resume`. Back at your desk, `claude --resume` shows you the same conversation.

## What it does

- One process owns the bot. Sessions stop knocking each other off and nothing needs a reconnect.
- Lists your recent projects and their sessions straight from `~/.claude/projects`, no config file.
- Continues the session you left on your Mac, or starts a clean one with `/clear`.
- Passes Claude Code commands like `/usage`, `/context` and `/compact` through as they are.
- Sends Claude's replies as they are written. Each answer ends with a quiet line showing how full the context is.
- Queues what you send while Claude is working, and `/dur` stops the current job.
- Starts at login and comes back on its own if it crashes. A Desktop icon turns it on and off.

## Requirements

- macOS, [Claude Code](https://claude.com/claude-code) signed in, and [Bun](https://bun.sh).
- A bot token from `@BotFather` and your Telegram user ID.

## Install

```bash
git clone https://github.com/hootbu/Hootbu-TelegramClaudeControl.git
cd Hootbu-TelegramClaudeControl
```

The token and your user ID go where the official Telegram plugin keeps them:

```bash
mkdir -p ~/.claude/channels/telegram
echo "TELEGRAM_BOT_TOKEN=<token>" > ~/.claude/channels/telegram/.env
echo '{"allowFrom": ["<your user id>"]}' > ~/.claude/channels/telegram/access.json
chmod 600 ~/.claude/channels/telegram/.env ~/.claude/channels/telegram/access.json
```

If you already use the official plugin, these files exist. Turn the plugin off, or it takes the bot back:

```bash
claude plugin disable telegram@claude-plugins-official
```

Then:

```bash
./install.sh
```

It registers and starts the launchd service and puts a **Telegram Claude** icon on your Desktop.

## Using it

Open the chat with your bot and type `/` for the menu.

| Command | What it does |
|---|---|
| `/projeler` | Your 10 most recent projects |
| `/proje <no or name>` | Picks a project and attaches to its latest session. With no argument, shows where you are |
| `/oturumlar` | The project's 10 most recent sessions |
| `/devam <no>` | Switches to that session |
| `/clear` | The next message starts a new session |
| `/dur` | Stops the running job and empties the queue |
| `/usage`, `/context`, `/compact` | Go to Claude Code as they are, like any other `/` command |

Anything else you type goes to the selected session.

## Turning it on and off

Double-click **Telegram Claude** on your Desktop. If the service is running, it asks whether to stop it. A stopped service stays off across restarts. If it's stopped, it starts it.

Log: `~/Library/Logs/hootbu-telegram-router.log`

## Good to know

**It's your Mac's shell, from Telegram.** Nobody is at the Mac to approve prompts, so Claude runs with `--dangerously-skip-permissions`. The bot only answers private messages from the users in `allowFrom`. Keep that list to yourself.

**Your Mac has to be awake.** While it sleeps the bot is silent. Telegram holds messages for up to 24 hours and they run in order when the Mac wakes.

**One session, one window.** If a session is still open in a terminal on your Mac and you continue it from Telegram, that window won't see the new messages. When you're back, close it and open the session with `claude --resume`.

**It runs at `--effort max`.** Change the `CLAUDE_ARGS` line in `router.ts` if you'd rather not.

**It's written in Turkish.** The commands (`/projeler`, `/oturumlar`, `/devam`, `/dur`) and the bot's replies are Turkish. They're plain strings in `router.ts` and `baslat.applescript`.

## Uninstall

```bash
launchctl bootout gui/$(id -u)/com.hootbu.telegram-router
rm ~/Library/LaunchAgents/com.hootbu.telegram-router.plist
rm -rf ~/Desktop/"Telegram Claude.app"
```

## License

MIT © Emir Yorgun
