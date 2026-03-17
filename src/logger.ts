import { EventEmitter } from "events";

const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  blue: "\x1b[34m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  magenta: "\x1b[35m",
  gray: "\x1b[90m",
};

const events = new EventEmitter();
const history: string[] = [];
const MAX_HISTORY = 100;

function pushLog(msg: string) {
  console.log(msg);
  history.push(msg);
  if (history.length > MAX_HISTORY) history.shift();
  events.emit("log", msg);
}

export const Logger = {
  getHistory: () => history,
  subscribe: (cb: (msg: string) => void) => {
    events.on("log", cb);
    return () => events.off("log", cb);
  },

  divider: () => pushLog(colors.gray + "—".repeat(60) + colors.reset),

  box: (title: string, lines: string[], color: keyof typeof colors = "cyan") => {
    const width = 64;
    const c = colors[color] || colors.cyan;
    let b = "";
    b += "\n" + c + "╔" + "═".repeat(width - 2) + "╗" + colors.reset + "\n";
    b += c + "║ " + colors.bright + title.padEnd(width - 4) + c + " ║" + colors.reset + "\n";
    b += c + "╠" + "═".repeat(width - 2) + "╣" + colors.reset + "\n";
    lines.forEach((line) => {
      const parts = line.match(new RegExp(".{1," + (width - 4) + "}", "g")) || [];
      parts.forEach((p) => b += c + "║ " + colors.reset + p.padEnd(width - 4) + c + " ║" + colors.reset + "\n");
    });
    b += c + "╚" + "═".repeat(width - 2) + "╝" + colors.reset + "\n";
    pushLog(b);
  },

  startup: () => {
    pushLog(colors.cyan + colors.bright + `
    ██████╗ ███████╗██╗  ██╗███████╗ ██████╗ ██████╗ 
    ██╔══██╗██╔════╝██║  ██║╚══███╔╝██╔═══██╗██╔══██╗
    ██████╔╝█████╗  ███████║  ███╔╝ ██║   ██║██║  ██║
    ██╔══██╗██╔══╝  ██╔══██║ ███╔╝  ██║   ██║██║  ██║
    ██████╔╝███████╗██║  ██║███████╗╚██████╔╝██████╔╝
    ╚═════╝ ╚══════╝╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚═════╝ 
    ` + colors.reset + colors.dim + `
           v2.0 Support Agent — Online & Ready
    ` + colors.reset);
  },

  session: (type: "NEW" | "CONTINUE", key: string, detail: string) => {
    const color = type === "NEW" ? "\x1b[32m" : "\x1b[34m";
    const label = type === "NEW" ? "✨ [SESSION:NEW]" : "🔄 [SESSION:ACT]";
    pushLog(`${color}${label.padEnd(20)}${colors.reset} ${colors.dim}Key:${colors.reset} ${key.padEnd(20)} ${colors.dim}| Info:${colors.reset} ${detail}`);
  },

  tool: (name: string, query: string, status: "START" | "DONE" | "ERROR", detail?: string) => {
    let color = colors.yellow;
    let label = `[TOOL:${name.toUpperCase()}]`;
    if (status === "DONE") color = colors.green;
    if (status === "ERROR") color = colors.red;
    const statusPart = status === "START" ? colors.dim + "..." : status === "DONE" ? "✅" : "❌";
    pushLog(`${color}${colors.bright}${label.padEnd(20)}${colors.reset} ${statusPart} ${colors.dim}q:${colors.reset} "${query}" ${detail ? `${colors.dim}>>${colors.reset} ${detail}` : ""}`);
  },

  info: (msg: string) => {
    pushLog(`${colors.magenta}${colors.bright}[INFO]${colors.reset} ${msg}`);
  },

  error: (msg: string, err?: any) => {
    pushLog(`${colors.red}${colors.bright}[ERROR]${colors.reset} ${colors.bright}${msg}${colors.reset}`);
    if (err) console.error(err);
  }
};
