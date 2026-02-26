#!/usr/bin/env node
import { auth } from "./commands/login.js";
import { summarize } from "./commands/summarize.js";
import { sessions } from "./commands/sessions.js";
import { report } from "./commands/report.js";
import { doctor } from "./commands/doctor.js";
import { upgrade } from "./commands/upgrade.js";
import { showLanguage, setResultLanguageCmd } from "./commands/language.js";
import { search } from "./commands/search.js";
import { deleteCommand } from "./commands/delete.js";
import { usage } from "./commands/usage.js";
import { share, unshare } from "./commands/share.js";
import { exportPdfCommand } from "./commands/export-pdf.js";
import { collectionsList, collectionsCreate, collectionsRename, collectionsDelete, collectionsMove } from "./commands/collections.js";
import { logger, banner } from "./utils/logger.js";
import { getTokenAsync, loadTokenFromKeychain } from "./utils/config.js";
import { NOTE_TYPES } from "./api/client.js";
import { VERSION } from "./version.js";

const args = process.argv.slice(2);
const command = args[0] || "help";

function hasFlag(flag: string): boolean {
  return args.includes(flag);
}

function getFlagValue(flag: string): string | undefined {
  const idx = args.indexOf(flag);
  return idx >= 0 ? args[idx + 1] : undefined;
}

async function main() {
  if (hasFlag("--version") || hasFlag("-v")) {
    console.log(`oh-my-lilys v${VERSION}`);
    return;
  }

  if (hasFlag("--help") || hasFlag("-h")) {
    showHelp();
    return;
  }

  await loadTokenFromKeychain();
  await banner();

  switch (command) {
    case "auth":
      await auth(
        args.find(a => !a.startsWith("--")),
        { auto: hasFlag("--auto"), refresh: hasFlag("--refresh") }
      );
      break;

    case "upgrade":
      await upgrade(VERSION);
      break;

    case "doctor":
      await doctor(VERSION);
      break;

    case "summarize": {
      const url = args[1];
      if (!url) {
        logger.error("Usage: lilys summarize <url>");
        process.exit(1);
      }
      await summarize(url);
      break;
    }

    case "sessions":
      await sessions();
      break;

    case "search": {
      const query = args[1];
      if (!query) {
        logger.error("Usage: lilys search <query> [--limit N] [--cursor TOKEN] [--json]");
        process.exit(1);
      }
      await search(query, {
        limit: getFlagValue("--limit") ? parseInt(getFlagValue("--limit")!, 10) : undefined,
        cursor: getFlagValue("--cursor"),
        json: hasFlag("--json"),
      });
      break;
    }

    case "delete": {
      const sids = args.slice(1).filter(a => !a.startsWith("--"));
      if (sids.length === 0) {
        logger.error("Usage: lilys delete <sessionId> [sessionId2 ...] [--yes]");
        process.exit(1);
      }
      await deleteCommand(sids, { skipConfirm: hasFlag("--yes") || hasFlag("-y") });
      break;
    }

    case "usage":
      await usage({ json: hasFlag("--json") });
      break;

    case "share": {
      const sid = args[1];
      if (!sid) {
        logger.error("Usage: lilys share <sessionId> [--note-id ID] [--json]");
        process.exit(1);
      }
      await share(sid, {
        noteId: getFlagValue("--note-id"),
        json: hasFlag("--json"),
      });
      break;
    }

    case "unshare": {
      const sid = args[1];
      if (!sid) {
        logger.error("Usage: lilys unshare <sessionId>");
        process.exit(1);
      }
      await unshare(sid);
      break;
    }

    case "export-pdf": {
      const sid = args[1];
      if (!sid) {
        logger.error("Usage: lilys export-pdf <sessionId> [--output FILE] [--note-id ID]");
        process.exit(1);
      }
      await exportPdfCommand(sid, {
        output: getFlagValue("--output"),
        noteId: getFlagValue("--note-id"),
      });
      break;
    }

    case "collections":
    case "col": {
      const sub = args[1];
      switch (sub) {
        case "list":
        case undefined:
          await collectionsList({ json: hasFlag("--json") });
          break;
        case "create": {
          const name = args[2];
          if (!name) {
            logger.error("Usage: lilys collections create <name> [--parent ID]");
            process.exit(1);
          }
          await collectionsCreate(name, { parent: getFlagValue("--parent") });
          break;
        }
        case "rename": {
          const cid = args[2];
          const newName = args[3];
          if (!cid || !newName) {
            logger.error("Usage: lilys collections rename <collectionId> <newName>");
            process.exit(1);
          }
          await collectionsRename(cid, newName);
          break;
        }
        case "delete": {
          const cid = args[2];
          if (!cid) {
            logger.error("Usage: lilys collections delete <collectionId>");
            process.exit(1);
          }
          await collectionsDelete(cid);
          break;
        }
        case "move": {
          const cid = args[2];
          const sids = args.slice(3).filter(a => !a.startsWith("--"));
          if (!cid || sids.length === 0) {
            logger.error("Usage: lilys collections move <collectionId> <sessionId...>");
            process.exit(1);
          }
          await collectionsMove(cid, sids);
          break;
        }
        default:
          logger.error(`Unknown subcommand: ${sub}`);
          logger.info("Subcommands: list, create, rename, delete, move");
          process.exit(1);
      }
      break;
    }

    case "report": {
      const sessionId = args[1];
      if (!sessionId) {
        logger.error("Usage: lilys report <sessionId> [options]");
        logger.info("Options:");
        logger.dim("  --generate <category> AI streaming generation (report, textbook, quiz, ...)");
        logger.dim("  --note-type <type>    Note type (detailed, key_points, easy, ...)");
        logger.dim("  --watch               Watch for completion");
        logger.dim("  --timeout <seconds>   Watch timeout (default: 120)");
        logger.dim("  --export markdown     Export as markdown");
        logger.dim("  --images              Generate images from <gen-image> tags");
        logger.dim("  --frames              Inject video frames at timestamp references");
        logger.dim("  --visual              Trigger visual rendering for web display");
        logger.break();
        logger.info(`Generate categories: report, textbook, quiz, flashcard, meeting, blog, newsletter`);
        logger.info(`Note types: ${NOTE_TYPES.map(n => n.type).join(", ")}`);
        process.exit(1);
      }
      await report(sessionId, {
        generate: getFlagValue("--generate"),
        noteType: getFlagValue("--note-type"),
        watch: hasFlag("--watch"),
        timeout: getFlagValue("--timeout") ? parseInt(getFlagValue("--timeout")!, 10) : undefined,
        export: getFlagValue("--export"),
        images: hasFlag("--images"),
        frames: hasFlag("--frames"),
        visual: hasFlag("--visual"),
      });
      break;
    }

    case "whoami": {
      const token = await getTokenAsync();
      if (token) {
        logger.success("Authenticated");
      } else {
        logger.warn("Not authenticated. Run 'lilys auth' first.");
      }
      break;
    }

    case "lang": {
      const langArg = args[1];
      if (langArg) {
        await setResultLanguageCmd(langArg);
      } else {
        await showLanguage();
      }
      break;
    }

    case "help":
    default:
      showHelp();
      break;
  }
}

function showHelp() {
  logger.log(`
${logger.bold("oh-my-lilys")} v${VERSION} - CLI for lilys.ai

${logger.bold("Usage:")}
  lilys <command> [options]

${logger.bold("Commands:")}
  auth              ${logger.dim("Authenticate (--auto: from browser, --refresh: renew)")}
  summarize <url>   ${logger.dim("Summarize a URL (YouTube, PDF, audio, website)")}
  sessions          ${logger.dim("List your digest sessions")}
  search <query>    ${logger.dim("Search sessions by keyword")}
  report <id>       ${logger.dim("Get report for a session")}
  delete <id...>    ${logger.dim("Delete one or more sessions")}
  usage             ${logger.dim("Show usage quota and plan info")}
  share <id>        ${logger.dim("Share a session publicly")}
  unshare <id>      ${logger.dim("Remove public sharing")}
  export-pdf <id>   ${logger.dim("Export session report as PDF")}
  collections       ${logger.dim("Manage collections (list/create/rename/delete/move)")}
  col               ${logger.dim("Alias for collections")}
  lang [code]       ${logger.dim("Get/set AI result language")}
  upgrade           ${logger.dim("Check for updates")}
  doctor            ${logger.dim("Diagnose and fix issues")}
  whoami            ${logger.dim("Check authentication status")}
  help              ${logger.dim("Show this help message")}

${logger.bold("Options:")}
  -v, --version     Show version
  -h, --help        Show this help
  --json            Output raw JSON (search, usage, share)

${logger.bold("Search Options:")}
  --limit <n>       ${logger.dim("Max results (default: 10)")}
  --cursor <token>  ${logger.dim("Pagination cursor")}

${logger.bold("Report Options:")}
  --generate <cat>    ${logger.dim("AI streaming generation (report, textbook, quiz, ...)")}
  --note-type <type>  ${logger.dim("Generate specific note type")}
  --watch             ${logger.dim("Watch for report completion")}
  --timeout <secs>    ${logger.dim("Watch timeout (default: 120)")}
  --export markdown   ${logger.dim("Export as markdown file")}
  --images            ${logger.dim("Generate images from <gen-image> tags")}
  --frames            ${logger.dim("Inject video frames at timestamp references")}
  --visual            ${logger.dim("Trigger visual rendering for web display")}

${logger.bold("Audit Options:")}
  --verbose, -V       ${logger.dim("Show detailed findings and all usage types")}
  --usage-type <type> ${logger.dim("Specific usage type to test (default: num_boost)")}

${logger.bold("Delete Options:")}
  --yes, -y         ${logger.dim("Skip confirmation prompt")}

${logger.bold("Export PDF Options:")}
  --output <file>   ${logger.dim("Output filename (default: <id>.pdf)")}
  --note-id <id>    ${logger.dim("Specific note ID to export")}

${logger.bold("Collections:")}
  lilys collections              ${logger.dim("List all collections")}
  lilys collections create <n>   ${logger.dim("Create a collection")}
  lilys collections rename <id> <n>  ${logger.dim("Rename a collection")}
  lilys collections delete <id>  ${logger.dim("Delete a collection")}
  lilys collections move <id> <sid...>  ${logger.dim("Move sessions into collection")}

${logger.bold("Note Types:")}
  ${NOTE_TYPES.map(n => n.type).join(", ")}

${logger.bold("Examples:")}
  lilys auth eyJhbGci...
  lilys summarize https://youtube.com/watch?v=...
  lilys sessions
  lilys search "machine learning"
  lilys search "AI" --limit 5 --json
  lilys report 8211090
  lilys report 8211090 --note-type key_points --watch
  lilys delete 8211090 --yes
  lilys usage
  lilys share 8211090
  lilys export-pdf 8211090 --output summary.pdf
  lilys lang ko
  lilys collections
  lilys col create "AI Research"
  lilys col move abc123 8211090 8211091

For more info, visit: ${logger.dim("https://lilys.ai")}
`);
}

main().catch(logger.error);
