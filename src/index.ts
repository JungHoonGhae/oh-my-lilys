#!/usr/bin/env node
import { auth } from "./commands/login.js";
import { summarize } from "./commands/summarize.js";
import { sessions } from "./commands/sessions.js";
import { report } from "./commands/report.js";
import { doctor } from "./commands/doctor.js";
import { upgrade } from "./commands/upgrade.js";
import { showLanguage, setResultLanguageCmd } from "./commands/language.js";
import { logger, banner } from "./utils/logger.js";
import { getToken } from "./utils/config.js";
import { NOTE_TYPES } from "./api/client.js";
import { VERSION } from "./version.js";

const args = process.argv.slice(2);
const command = args[0] || "help";

async function main() {
  if (args.includes("--version") || args.includes("-v")) {
    console.log(`oh-my-lilys v${VERSION}`);
    return;
  }

  if (args.includes("--help") || args.includes("-h")) {
    showHelp();
    return;
  }

  await banner();

  switch (command) {
    case "auth":
      const tokenArg = args[1];
      await auth(tokenArg);
      break;
    case "upgrade":
      await upgrade(VERSION);
      break;
    case "doctor":
      await doctor(VERSION);
      break;
    case "summarize":
      const url = args[1];
      if (!url) {
        logger.error("Usage: lilys summarize <url>");
        process.exit(1);
      }
      await summarize(url);
      break;
    case "sessions":
      await sessions();
      break;
    case "report":
      const sessionId = args[1];
      if (!sessionId) {
        logger.error("Usage: lilys report <sessionId> [options]");
        logger.info("Options:");
        logger.dim("  --note-type <type>    Note type to generate");
        logger.dim("  --watch               Watch for completion");
        logger.dim("  --timeout <seconds>   Watch timeout (default: 120)");
        logger.dim("  --export markdown     Export as markdown");
        logger.break();
        logger.info(`Available: ${NOTE_TYPES.map(n => n.type).join(", ")}`);
        process.exit(1);
      }
      
      const options = parseReportOptions(args);
      await report(sessionId, options);
      break;
    case "whoami":
      const token = getToken();
      if (token) {
        logger.success("Authenticated");
      } else {
        logger.warn("Not authenticated. Run 'lilys auth' first.");
      }
      break;
    case "lang":
      const langArg = args[1];
      if (langArg) {
        await setResultLanguageCmd(langArg);
      } else {
        await showLanguage();
      }
      break;
    case "help":
    default:
      showHelp();
      break;
  }
}

function parseReportOptions(args: string[]): Record<string, any> {
  const options: Record<string, any> = {};
  
  for (let i = 2; i < args.length; i++) {
    const current = args[i];
    const next = args[i + 1];
    
    if (current === "--note-type" && next) {
      options.noteType = next;
      i++;
    } else if (current === "--watch") {
      options.watch = true;
    } else if (current === "--timeout" && next) {
      options.timeout = parseInt(next, 10);
      i++;
    } else if (current === "--export" && next) {
      options.export = next;
      i++;
    }
  }
  
  return options;
}

function showHelp() {
  logger.log(`
${logger.bold("oh-my-lilys")} v${VERSION} - CLI for lilys.ai

${logger.bold("Usage:")}
  lilys <command> [options]

${logger.bold("Commands:")}
  auth          ${logger.dim("Authenticate with lilys.ai")}
  summarize     ${logger.dim("Summarize a URL (YouTube, PDF, audio, website)")}
  sessions      ${logger.dim("List your digest sessions")}
  report        ${logger.dim("Get report for a session")}
  lang          ${logger.dim("Get/set AI result language")}
  upgrade       ${logger.dim("Check for updates")}
  doctor        ${logger.dim("Diagnose and fix issues")}
  whoami        ${logger.dim("Check authentication status")}
  help          ${logger.dim("Show this help message")}
  version       ${logger.dim("Show version")}

${logger.bold("Options:")}
  -v, --version         Show version
  -h, --help            Show this help

${logger.bold("Language:")}
  lilys lang                   ${logger.dim("Show current AI result language")}
  lilys lang <code>            ${logger.dim("Set AI result language (e.g., en, ko, ja, zh)")}

${logger.bold("Report Options:")}
  --note-type <type>    ${logger.dim("Generate specific note type")}
  --watch               ${logger.dim("Watch for report completion (poll)")}
  --timeout <seconds>   ${logger.dim("Watch timeout (default: 120)")}
  --export markdown     ${logger.dim("Export as markdown file")}

${logger.bold("Examples:")}
  lilys auth eyJhbGci...
  lilys --version
  lilys lang
  lilys lang ko
  lilys summarize https://youtube.com/watch?v=...
  lilys sessions
  lilys report 8211090
  lilys report 8211090 --note-type key_points

For more info, visit: ${logger.dim("https://lilys.ai")}
`);
}

main().catch(logger.error);
