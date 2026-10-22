
import { build } from "vite";
import { mkdir, readFile, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const reportPath = resolve(
  process.cwd(),
  ".diagnostics",
  "bundle-analysis.md",
);

async function main() {
  await mkdir(dirname(reportPath), { recursive: true });
  await rm(reportPath, { force: true });

  // Enable the analyzer only inside this process.
  process.env.GEODE_BUNDLE_ANALYZE = "1";

  console.log("\nBuilding Geode for bundle analysis...\n");

  await build();

  const report = await readFile(reportPath, "utf8");

  console.log("\n========== GEODE BUNDLE DIAGNOSTICS ==========\n");
  console.log(report);
  console.log("\n==============================================");
  console.log(`Report saved outside dist: ${reportPath}\n`);
}

main().catch((error) => {
  console.error("Bundle analysis failed:", error);
  process.exitCode = 1;
});
