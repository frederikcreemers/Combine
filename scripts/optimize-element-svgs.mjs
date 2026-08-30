import { spawnSync } from "node:child_process";

const args = process.argv.slice(2).filter((argument) => argument !== "--");
if (args.includes("--help")) {
  console.log(`Usage: pnpm migrate:optimize-svgs -- [options]

Options:
  --prod              Run against the production deployment
  --dry-run           Measure changes without replacing stored SVGs
  --batch-size <1-50> Number of elements processed by each action (default: 20)
  --help              Show this help`);
  process.exit(0);
}

const useProduction = args.includes("--prod");
const dryRun = args.includes("--dry-run");
const batchSizeIndex = args.indexOf("--batch-size");
const batchSize = batchSizeIndex === -1 ? 20 : Number(args[batchSizeIndex + 1]);

const knownArgs = new Set(["--prod", "--dry-run", "--batch-size", "--help"]);
for (let index = 0; index < args.length; index += 1) {
  const argument = args[index];
  if (!knownArgs.has(argument) && args[index - 1] !== "--batch-size") {
    throw new Error(`Unknown argument: ${argument}`);
  }
}
if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 50) {
  throw new Error("--batch-size must be an integer from 1 to 50");
}

let cursor = null;
let batchNumber = 0;
const totals = {
  processed: 0,
  updated: 0,
  unchanged: 0,
  skippedBecauseModified: 0,
  bytesBefore: 0,
  bytesAfter: 0,
  failures: [],
};

do {
  const convexArgs = ["exec", "convex", "run"];
  if (useProduction) convexArgs.push("--prod");
  convexArgs.push(
    "svgMigration:optimizeBatch",
    JSON.stringify({ cursor, batchSize, dryRun }),
  );

  const command = spawnSync("pnpm", convexArgs, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["inherit", "pipe", "inherit"],
  });
  if (command.status !== 0) {
    process.exit(command.status ?? 1);
  }

  const result = JSON.parse(command.stdout);
  batchNumber += 1;
  totals.processed += result.processed;
  totals.updated += result.updated;
  totals.unchanged += result.unchanged;
  totals.skippedBecauseModified += result.skippedBecauseModified;
  totals.bytesBefore += result.bytesBefore;
  totals.bytesAfter += result.bytesAfter;
  totals.failures.push(...result.failures);

  const savedBytes = totals.bytesBefore - totals.bytesAfter;
  console.log(
    `Batch ${batchNumber}: ${totals.processed} processed, ` +
      `${totals.updated} ${dryRun ? "would update" : "updated"}, ` +
      `${totals.failures.length} failed, ${savedBytes} bytes saved`,
  );

  cursor = result.continueCursor;
  if (result.isDone) break;
} while (true);

console.log("\nMigration complete");
console.log(
  JSON.stringify(
    { ...totals, savedBytes: totals.bytesBefore - totals.bytesAfter },
    null,
    2,
  ),
);

if (totals.failures.length > 0) {
  process.exitCode = 1;
}
