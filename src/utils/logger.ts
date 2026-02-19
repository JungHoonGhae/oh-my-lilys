import pc from "picocolors";

let bannerPrinted = false;

export const banner = async () => {
  if (bannerPrinted) return;
  bannerPrinted = true;
  
  console.log(`
 █▀█ █ █ ▄▄ █▀▄▀█ █▄█ ▄▄ █   █ █   █▄█ █▀▀
 █▄█ █▀█    █ ▀ █  █     █▄▄ █ █▄▄  █  ▄▄█
`);
  console.log(pc.dim("  lilys.ai CLI - AI Summarizer"));
  console.log("");
};

export const logger = {
  error: (...args: unknown[]) => {
    console.log(pc.red("✖"), ...args.map(a => pc.red(String(a))));
  },
  warn: (...args: unknown[]) => {
    console.log(pc.yellow("⚠"), ...args.map(a => pc.yellow(String(a))));
  },
  info: (...args: unknown[]) => {
    console.log(pc.cyan("ℹ"), ...args.map(a => pc.cyan(String(a))));
  },
  success: (...args: unknown[]) => {
    console.log(pc.green("✓"), ...args.map(a => pc.green(String(a))));
  },
  dim: (s?: string) => s ? pc.dim(s) : "",
  log: (...args: unknown[]) => {
    console.log(...args);
  },
  break: () => {
    console.log("");
  },
  bold: (s: string) => pc.bold(s),
};

export const styles = {
  key: (s: string) => pc.cyan(s),
  value: (s: string) => pc.white(s),
  label: (s: string) => pc.yellow(s),
  url: (s: string) => pc.underline(pc.blue(s)),
  error: (s: string) => pc.red(s),
  success: (s: string) => pc.green(s),
  dim: (s: string) => pc.dim(s),
};
