import { readFileSync, writeFileSync } from "fs";

const pkg = JSON.parse(readFileSync("package.json", "utf-8"));
const version = pkg.version;

writeFileSync("src/version.ts", `export const VERSION = "${version}";\n`);

console.log(`Version: ${version}`);
