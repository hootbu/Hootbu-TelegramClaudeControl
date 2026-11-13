import { spawn, execFileSync, type ChildProcess } from "node:child_process";
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, openSync, readSync, closeSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const HOME = homedir();
const TG_DIR = join(HOME, ".claude/channels/telegram");
const PROJECTS = join(HOME, ".claude/projects");
const STATE_FILE = join(import.meta.dir, "state.json");
const CLAUDE = Bun.which("claude") ?? "";
const CLAUDE_ARGS = ["--effort", "max", "--dangerously-skip-permissions", "--output-format", "stream-json", "--verbose"];

const TOKEN = readFileSync(join(TG_DIR, ".env"), "utf8").match(/^TELEGRAM_BOT_TOKEN=(.+)$/m)?.[1].trim();
const ALLOW: string[] = (JSON.parse(readFileSync(join(TG_DIR, "access.json"), "utf8")).allowFrom ?? []).map(String);
if (!TOKEN || !ALLOW.length || !CLAUDE) throw new Error("TELEGRAM_BOT_TOKEN, allowFrom ya da PATH'te claude eksik");

type State = { offset: number; cwd?: string; session?: string };
const fresh = !existsSync(STATE_FILE);
const state: State = fresh ? { offset: 0 } : JSON.parse(readFileSync(STATE_FILE, "utf8"));
const save = () => writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));

let child: ChildProcess | null = null;
let stopping = false;
const queue: string[] = [];

const HELP = [
  "/projeler · son projeler",
  "/proje <no|ad> · proje seç, argümansız durum",
  "/oturumlar · projenin son oturumları",
  "/devam <no> · oturuma geç",
  "/clear · yeni oturum",
  "/dur · çalışan işi durdur",
  "/usage, /context, /compact ve diğer Claude komutları olduğu gibi iletilir. Düz mesaj seçili oturuma gider.",
].join("\n");

async function tg(method: string, body: object) {
  const r = await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const j: any = await r.json();
  if (!j.ok) throw Object.assign(new Error(`${method}: ${j.description}`), { code: j.error_code });
  return j.result;
}

function split(text: string, max = 4000) {
  const out: string[] = [];
  let cur = "";
  for (let line of text.split("\n")) {
    if (cur && cur.length + line.length + 1 > max) {
      out.push(cur);
      cur = "";
    }
    while (line.length > max) {
      out.push(line.slice(0, max));
      line = line.slice(max);
    }
    cur = cur ? `${cur}\n${line}` : line;
  }
  if (cur.trim()) out.push(cur);
  return out.length > 4 ? [...out.slice(0, 4), "…(kısaltıldı)"] : out;
}

async function send(chat: number, text: string, silent = false) {
  for (const part of split(text)) {
    await tg("sendMessage", { chat_id: chat, text: part, disable_notification: silent, link_preview_options: { is_disabled: true } })
      .catch((e) => console.error(new Date().toISOString(), e.message));
  }
}

function head(file: string, n: number) {
  const fd = openSync(file, "r");
  const buf = Buffer.alloc(n);
  const len = readSync(fd, buf, 0, n, 0);
  closeSync(fd);
  return buf.toString("utf8", 0, len);
}

const short = (p: string) => p.replace(HOME, "~");

function ago(ms: number) {
  const m = Math.round((Date.now() - ms) / 60000);
  return m < 60 ? `${m} dk` : m < 1440 ? `${Math.round(m / 60)} sa` : `${Math.round(m / 1440)} gün`;
}

function jsonls(dir: string) {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".jsonl"))
    .map((f) => ({ id: f.slice(0, -6), file: join(dir, f), mtime: statSync(join(dir, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
}

function projects() {
  const list: { cwd: string; mtime: number }[] = [];
  for (const d of readdirSync(PROJECTS)) {
    const dir = join(PROJECTS, d);
    if (!statSync(dir).isDirectory()) continue;
    const latest = jsonls(dir)[0];
    const cwd = latest && head(latest.file, 65536).match(/"cwd":"([^"]+)"/)?.[1];
    if (cwd && existsSync(cwd) && !/^\/(private|tmp)\//.test(cwd)) list.push({ cwd, mtime: latest.mtime });
  }
  return list.sort((a, b) => b.mtime - a.mtime).slice(0, 10);
}

function sessions(cwd: string) {
  const dir = join(PROJECTS, cwd.replace(/[^a-zA-Z0-9]/g, "-"));
  return existsSync(dir) ? jsonls(dir).slice(0, 10) : [];
}

function title(file: string) {
  for (const line of head(file, 262144).split("\n")) {
    try {
      const o = JSON.parse(line);
      if (o.type !== "user" || o.isMeta) continue;
      const c = o.message?.content;
      const t = typeof c === "string" ? c : Array.isArray(c) ? c.find((x: any) => x.type === "text")?.text : "";
      if (t && !t.startsWith("<")) return t.replace(/\s+/g, " ").slice(0, 70);
    } catch {}
  }
  return "(boş)";
}

function openOnPc(id: string) {
  try {
    return execFileSync("ps", ["-axo", "command"], { encoding: "utf8" })
      .split("\n")
      .some((l) => l.includes(id) && !l.includes(" -p "));
  } catch {
    return false;
  }
}

function attached(cwd: string, id?: string) {
  const s = id && sessions(cwd).find((x) => x.id === id);
  if (!s) return "Yeni oturum.";
  const warn = openOnPc(s.id) ? "\n⚠️ Bu oturum PC'de de açık. PC'ye dönünce oradaki pencereyi kapatıp claude --resume ile aç." : "";
  return `Oturum: ${title(s.file)} · ${ago(s.mtime)}${warn}`;
}

function run(chat: number, text: string) {
  if (!state.cwd) return send(chat, "Önce /projeler ile proje seç.");
  if (child) {
    queue.push(text);
    return send(chat, "⏳ Sıraya aldım.", true);
  }
  const p = spawn(CLAUDE, ["-p", text, ...CLAUDE_ARGS, ...(state.session ? ["--resume", state.session] : [])], {
    cwd: state.cwd,
    stdio: ["ignore", "pipe", "pipe"],
  });
  child = p;
  stopping = false;
  const typing = () => tg("sendChatAction", { chat_id: chat, action: "typing" }).catch(() => {});
  typing();
  const timer = setInterval(typing, 4500);
  let buf = "", err = "", model = "", result = "", isError = false, sent = false, ctx = 0, win = 0;
  let chain: Promise<void> = Promise.resolve();
  const out = (t: string, silent = false) => {
    sent = true;
    chain = chain.then(() => send(chat, t, silent));
  };
  p.stdout!.setEncoding("utf8");
  p.stdout!.on("data", (d: string) => {
    buf += d;
    let i: number;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i);
      buf = buf.slice(i + 1);
      let o: any;
      try {
        o = JSON.parse(line);
      } catch {
        continue;
      }
      if (o.type === "system" && o.subtype === "init") {
        model = o.model;
        if (o.session_id !== state.session) {
          state.session = o.session_id;
          save();
        }
      }
      if (o.type === "assistant" && !o.parent_tool_use_id) {
        const u = o.message?.usage;
        if (u) ctx = (u.input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0);
        for (const c of o.message?.content ?? []) if (c.type === "text" && c.text.trim()) out(c.text);
      }
      if (o.type === "result") {
        result = o.result ?? "";
        isError = !!o.is_error;
        win = o.modelUsage?.[model]?.contextWindow ?? 0;
      }
    }
  });
  p.stderr!.on("data", (d) => {
    err = (err + d).slice(-2000);
  });
  p.on("close", async (code) => {
    clearInterval(timer);
    child = null;
    if (!stopping) {
      if (isError) out(`⚠️ ${result || err.trim() || `çıkış ${code}`}`);
      else if (!sent) out(result || `⚠️ Çıktı yok (çıkış ${code}). ${err.trim().slice(-1500)}`);
      if (ctx && win) out(`bağlam %${Math.round((ctx / win) * 100)} · ${Math.round(ctx / 1000)}k/${win >= 1e6 ? `${win / 1e6}M` : `${win / 1000}k`}`, true);
    }
    await chain;
    if (queue.length) run(chat, queue.splice(0).join("\n\n"));
  });
}

async function handle(chat: number, text: string) {
  const [first, ...rest] = text.trim().split(/\s+/);
  const cmd = first.split("@")[0];
  const arg = rest.join(" ");
  const busy = () => send(chat, "Çalışan iş var, bitmesini bekle ya da /dur.");
  switch (cmd) {
    case "/start":
    case "/help":
      return send(chat, HELP);
    case "/projeler": {
      const ps = projects();
      return send(chat, `${ps.map((p, i) => `${i + 1}. ${short(p.cwd)} · ${ago(p.mtime)}`).join("\n")}\n\nSeç: /proje <no>`);
    }
    case "/proje": {
      if (!arg) {
        if (!state.cwd) return send(chat, "Proje seçili değil. /projeler");
        return send(chat, `Proje: ${short(state.cwd)}\n${attached(state.cwd, state.session)}${child ? "\nŞu an çalışıyor." : ""}`);
      }
      if (child) return busy();
      const ps = projects();
      const p = /^\d+$/.test(arg) ? ps[Number(arg) - 1] : ps.find((x) => x.cwd.toLowerCase().includes(arg.toLowerCase()));
      if (!p) return send(chat, "Bulamadım. /projeler");
      state.cwd = p.cwd;
      state.session = sessions(p.cwd)[0]?.id;
      save();
      return send(chat, `✅ ${short(p.cwd)}\n${attached(p.cwd, state.session)}`);
    }
    case "/oturumlar": {
      if (!state.cwd) return send(chat, "Önce /proje seç.");
      const ss = sessions(state.cwd);
      if (!ss.length) return send(chat, "Bu projede oturum yok.");
      const lines = ss.map((s, i) => `${s.id === state.session ? "▶" : `${i + 1}.`} ${title(s.file)} · ${ago(s.mtime)}${openOnPc(s.id) ? " · PC'de açık" : ""}`);
      return send(chat, `${lines.join("\n")}\n\nGeç: /devam <no>`);
    }
    case "/devam": {
      if (!state.cwd) return send(chat, "Önce /proje seç.");
      if (child) return busy();
      const s = sessions(state.cwd)[Number(arg) - 1];
      if (!s) return send(chat, "Böyle bir oturum yok. /oturumlar");
      state.session = s.id;
      save();
      return send(chat, attached(state.cwd, s.id));
    }
    case "/clear":
      if (child) return busy();
      state.session = undefined;
      save();
      return send(chat, "🧹 Temizlendi. Sonraki mesaj yeni oturumda başlar.");
    case "/dur":
      if (!child) return send(chat, "Çalışan iş yok.");
      stopping = true;
      queue.length = 0;
      child.kill("SIGINT");
      return send(chat, "⏹ Durdurdum.");
    default:
      return run(chat, text);
  }
}

async function main() {
  if (fresh) {
    const last = await tg("getUpdates", { offset: -1 });
    state.offset = last.length ? last[0].update_id + 1 : 0;
    save();
  }
  const commands = [
    ["projeler", "Son projeler"],
    ["proje", "Proje seç, argümansız durum"],
    ["oturumlar", "Projenin son oturumları"],
    ["devam", "Oturuma geç: /devam <no>"],
    ["clear", "Yeni oturum"],
    ["dur", "Çalışan işi durdur"],
    ["usage", "Kullanım limitleri"],
    ["context", "Bağlam doluluğu"],
    ["compact", "Oturumu özetle"],
  ].map(([command, description]) => ({ command, description }));
  for (const id of ALLOW) {
    await tg("setMyCommands", { scope: { type: "chat", chat_id: id }, commands }).catch((e) => console.error(e.message));
    await tg("setChatMenuButton", { chat_id: id, menu_button: { type: "commands" } }).catch((e) => console.error(e.message));
  }
  console.error(new Date().toISOString(), "router açıldı");
  for (;;) {
    try {
      const ups = await tg("getUpdates", { offset: state.offset, timeout: 50, allowed_updates: ["message"] });
      for (const u of ups) {
        state.offset = u.update_id + 1;
        save();
        const m = u.message;
        if (!m?.text || m.chat.type !== "private" || !ALLOW.includes(String(m.from?.id))) continue;
        handle(m.chat.id, m.text).catch((e) => console.error(new Date().toISOString(), e));
      }
    } catch (e: any) {
      console.error(new Date().toISOString(), e.message);
      await Bun.sleep(e.code === 409 ? 10000 : 3000);
    }
  }
}

main();
