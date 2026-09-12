#!/usr/bin/env node
/**
 * Generate branded PDFs via Chrome headless.
 * Usage: node docs/branded-pdfs/generate.mjs
 */
import { mkdirSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "output");
const chrome =
  process.env.CHROME_PATH ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const jobs = [
  {
    html: "partnership-proposal.html",
    pdf: "MyInstantAI-x-MoveDigital-Partnership-Proposal.pdf",
  },
  {
    // Same source — Premium filename for partner leave-behind in Documents.
    html: "partnership-proposal.html",
    pdf: "MyInstantAI-x-MoveDigital-Partnership-Proposal-Premium.pdf",
  },
  {
    html: "one-pager.html",
    pdf: "MyInstantAI-Agents-One-Pager.pdf",
  },
  {
    html: "commercial-leavebehind.html",
    pdf: "MyInstantAI-Agents-Commercial-Leavebehind.pdf",
  },
  {
    html: "demo-pilot-pack.html",
    pdf: "MyInstantAI-Agents-Monday-Demo-Pilot6.pdf",
  },
  {
    html: "azure-deployment.html",
    pdf: "MyInstantAI-x-MoveDigital-Azure-Deployment-Config.pdf",
  },
  {
    html: "cutover-checklist.html",
    pdf: "MyInstantAI-x-MoveDigital-Production-Cutover-Checklist.pdf",
  },
  {
    html: "myinstantai-info-request.html",
    pdf: "MyInstantAI-x-MoveDigital-Production-Cutover-Info-Request.pdf",
  },
  {
    html: "full-codebase-audit.html",
    pdf: "MyInstantAI-Codebase-Architecture-and-Complexity-Audit.pdf",
  },
  {
    html: "white-label-handover.html",
    pdf: "MyInstantAI-White-Label-Platform-Technical-Handover.pdf",
  },
];

if (!existsSync(chrome)) {
  console.error(`Chrome not found at: ${chrome}`);
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });

for (const job of jobs) {
  const htmlPath = resolve(__dirname, job.html);
  const pdfPath = resolve(outDir, job.pdf);
  const fileUrl = pathToFileURL(htmlPath).href;

  console.log(`Printing ${job.html} → ${job.pdf}`);
  const result = spawnSync(
    chrome,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-pdf-header-footer",
      "--print-to-pdf-no-header",
      `--print-to-pdf=${pdfPath}`,
      fileUrl,
    ],
    { encoding: "utf8" },
  );

  if (result.status !== 0) {
    console.error(result.stderr || result.stdout || "Chrome failed");
    process.exit(result.status ?? 1);
  }
  if (!existsSync(pdfPath)) {
    console.error(`Expected PDF missing: ${pdfPath}`);
    process.exit(1);
  }
  console.log(`  ✓ ${pdfPath}`);
}

console.log("Done.");
