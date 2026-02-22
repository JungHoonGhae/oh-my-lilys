import { test, expect } from "bun:test";

async function runCli(args: string[]) {
  const proc = Bun.spawn(["bun", "run", "src/index.ts", ...args], {
    cwd: process.cwd(),
    stdout: "pipe",
    stderr: "pipe",
    env: {
      ...process.env,
    },
  });

  const [exitCode, stdout, stderr] = await Promise.all([
    proc.exited,
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);

  return { exitCode, stdout, stderr };
}

test("--version prints version and exits", async () => {
  const { exitCode, stdout } = await runCli(["--version"]);
  expect(exitCode).toBe(0);
  expect(stdout).toMatch(/oh-my-lilys v\d+\.\d+\.\d+/);
});

test("no args prints banner + help", async () => {
  const { exitCode, stdout } = await runCli([]);
  expect(exitCode).toBe(0);
  expect(stdout).toContain("lilys.ai CLI - AI Summarizer");
  expect(stdout).toContain("Usage:");
  expect(stdout).toContain("Commands:");
});
