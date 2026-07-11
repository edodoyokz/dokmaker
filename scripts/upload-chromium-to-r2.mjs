#!/usr/bin/env node
/**
 * Upload @sparticuz/chromium binaries to R2.
 *
 * On Vercel serverless, the 62MB chromium.br exceeds the 50MB function zip
 * limit and is stripped from the deployment. This script uploads the binaries
 * to R2 once; the download route fetches them to /tmp on cold start.
 *
 * Run locally after setting R2_* env vars in .env:
 *   node scripts/upload-chromium-to-r2.mjs
 *
 * Files uploaded (under prefix "chromium-bin/"):
 *   - chromium.br      (~62MB) — the Chromium browser binary
 *   - al2023.tar.br     (~1MB)  — shared libs for Amazon Linux 2023 (Vercel runtime)
 *   - fonts.tar.br    (~180KB)  — runtime font archive expected by @sparticuz/chromium
 *   - swiftshader.tar.br (~3.5MB) — SwiftShader archive expected by @sparticuz/chromium
 *
 * Only needs to be re-run when upgrading @sparticuz/chromium.
 */
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { statSync } from "node:fs";
import { readdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import "dotenv/config";

const bucket = process.env.R2_BUCKET_NAME;
const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

if (!bucket || !accountId || !accessKeyId || !secretAccessKey) {
  console.error("Missing R2 env vars. Set R2_BUCKET_NAME, R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY in .env");
  process.exit(1);
}

const chromiumBinDir = "node_modules/@sparticuz/chromium/bin";
const r2Prefix = "chromium-bin";

// Upload every archive @sparticuz/chromium may open from its input bin dir.
const filesToUpload = [
  "chromium.br",
  "al2023.tar.br",
  "fonts.tar.br",
  "swiftshader.tar.br",
];

const client = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId, secretAccessKey },
});

console.log(`Uploading @sparticuz/chromium binaries to R2 bucket: ${bucket}`);
console.log(`  source: ${chromiumBinDir}/`);
console.log(`  target: ${r2Prefix}/`);
console.log("");

const availableFiles = readdirSync(chromiumBinDir);
console.log(`Available files in bin/: ${availableFiles.join(", ")}`);
console.log("");

for (const fileName of filesToUpload) {
  const filePath = `${chromiumBinDir}/${fileName}`;
  const key = `${r2Prefix}/${fileName}`;

  try {
    const stat = statSync(filePath);
    const sizeMB = (stat.size / 1024 / 1024).toFixed(1);
    console.log(`Uploading ${fileName} (${sizeMB} MB)...`);

    const body = await readFile(filePath);
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: "application/octet-stream",
      })
    );

    console.log(`  ✓ uploaded to ${key}`);
  } catch (err) {
    if (err.code === "ENOENT") {
      console.error(`  ✗ ${fileName} not found in ${chromiumBinDir}/ — skipping`);
    } else {
      console.error(`  ✗ failed to upload ${fileName}:`, err.message);
      process.exit(1);
    }
  }
}

console.log("");
console.log("Done. Set these env vars on Vercel (already in .env locally):");
console.log("  R2_BUCKET_NAME");
console.log("  R2_ACCOUNT_ID");
console.log("  R2_ACCESS_KEY_ID");
console.log("  R2_SECRET_ACCESS_KEY");
console.log("");
console.log("The download route will fetch chromium.br from R2 on first cold start.");
