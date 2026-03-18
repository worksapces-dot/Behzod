import { EventEmitter } from "events";
import { LOGGER_CONFIG } from "./constants";

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
  white: "\x1b[37m",
  bgBlue: "\x1b[44m",
  bgGreen: "\x1b[42m",
  bgYellow: "\x1b[43m",
  bgRed: "\x1b[41m",
  bgMagenta: "\x1b[45m",
  bgCyan: "\x1b[46m",
};

const events = new EventEmitter();
const history: string[] = [];
const MAX_HISTORY = LOGGER_CONFIG.MAX_HISTORY;

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

  divider: () => pushLog(colors.gray + "─".repeat(80) + colors.reset),

  box: (title: string, lines: string[], color: keyof typeof colors = "cyan") => {
    const width = 80;
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
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║   ██████╗ ███████╗██╗  ██╗███████╗ ██████╗ ██████╗     ██╗  ██╗            ║
║   ██╔══██╗██╔════╝██║  ██║╚══███╔╝██╔═══██╗██╔══██╗   ███║ ███║            ║
║   ██████╔╝█████╗  ███████║  ███╔╝ ██║   ██║██║  ██║   ╚██║ ╚██║            ║
║   ██╔══██╗██╔══╝  ██╔══██║ ███╔╝  ██║   ██║██║  ██║    ██║  ██║            ║
║   ██████╔╝███████╗██║  ██║███████╗╚██████╔╝██████╔╝    ██║  ██║            ║
║   ╚═════╝ ╚══════╝╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚═════╝     ╚═╝  ╚═╝            ║
║                                                                              ║
║   ███████╗██╗  ██╗███████╗██████╗ ███████╗ ██████╗ ██████╗                 ║
║   ██╔════╝██║  ██║██╔════╝██╔══██╗╚══███╔╝██╔═══██╗██╔══██╗                ║
║   ███████╗███████║█████╗  ██████╔╝  ███╔╝ ██║   ██║██║  ██║                ║
║   ╚════██║██╔══██║██╔══╝  ██╔══██╗ ███╔╝  ██║   ██║██║  ██║                ║
║   ███████║██║  ██║███████╗██║  ██║███████╗╚██████╔╝██████╔╝                ║
║   ╚══════╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚═════╝                 ║
║                                                                              ║
║                    🤖 AI Support Agents - v2.1                               ║
║                    Powered by Groq + LangGraph                               ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
    ` + colors.reset);
  },

  message: (type: "DM" | "GROUP", username: string, chatName: string, text: string, responded: boolean) => {
    const typeColor = type === "DM" ? colors.bgBlue : colors.bgMagenta;
    const typeLabel = type === "DM" ? " 💬 DM " : " 👥 GROUP ";
    const statusIcon = responded ? "✅" : "⏭️";
    const statusColor = responded ? colors.green : colors.gray;
    
    let log = "\n";
    log += colors.bright + typeColor + colors.white + typeLabel + colors.reset + " ";
    log += colors.cyan + `@${username}` + colors.reset;
    if (type === "GROUP") {
      log += colors.dim + ` in ${chatName}` + colors.reset;
    }
    log += "\n";
    log += colors.yellow + "📝 Message: " + colors.reset + colors.dim + text.substring(0, 100) + (text.length > 100 ? "..." : "") + colors.reset + "\n";
    log += statusColor + statusIcon + " " + (responded ? "Responded" : "Ignored") + colors.reset + "\n";
    
    pushLog(log);
  },

  session: (type: "NEW" | "CONTINUE", key: string, detail: string) => {
    const color = type === "NEW" ? colors.green : colors.blue;
    const icon = type === "NEW" ? "✨" : "🔄";
    const label = type === "NEW" ? "[SESSION:NEW]" : "[SESSION:ACTIVE]";
    pushLog(`${color}${colors.bright}${icon} ${label.padEnd(20)}${colors.reset} ${colors.dim}Key:${colors.reset} ${key.padEnd(20)} ${colors.dim}| Info:${colors.reset} ${detail}`);
  },

  tool: (name: string, query: string, status: "START" | "DONE" | "ERROR", detail?: string) => {
    let color = colors.yellow;
    let icon = "🔧";
    let label = `[TOOL:${name.toUpperCase()}]`;
    if (status === "DONE") {
      color = colors.green;
      icon = "✅";
    }
    if (status === "ERROR") {
      color = colors.red;
      icon = "❌";
    }
    const statusPart = status === "START" ? colors.dim + "..." : status === "DONE" ? "✅" : "❌";
    pushLog(`${color}${colors.bright}${icon} ${label.padEnd(25)}${colors.reset} ${statusPart} ${colors.dim}q:${colors.reset} "${query.substring(0, 40)}" ${detail ? `${colors.dim}>>${colors.reset} ${detail}` : ""}`);
  },

  info: (msg: string) => {
    pushLog(`${colors.magenta}${colors.bright}[INFO]${colors.reset} ${msg}`);
  },

  error: (msg: string, err?: any) => {
    pushLog(`${colors.red}${colors.bright}[ERROR]${colors.reset} ${colors.bright}${msg}${colors.reset}`);
    if (err) console.error(err);
  }
};

