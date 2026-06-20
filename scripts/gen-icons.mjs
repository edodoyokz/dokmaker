import sharp from "sharp";
import { readFileSync } from "node:fs";

const svg = readFileSync("public/icon.svg");

await sharp(svg, { density: 512 }).resize(192, 192).png().toFile("public/icon-192.png");
await sharp(svg, { density: 512 }).resize(512, 512).png().toFile("public/icon-512.png");
await sharp(svg, { density: 512 }).resize(180, 180).flatten({ background: "#4f46e5" }).png().toFile("public/apple-touch-icon.png");
await sharp(svg, { density: 512 }).resize(32, 32).png().toFile("public/favicon-32.png");

const m192 = await sharp("public/icon-192.png").metadata();
const m512 = await sharp("public/icon-512.png").metadata();
console.log("192:", m192.width + "x" + m192.height, m192.format);
console.log("512:", m512.width + "x" + m512.height, m512.format);
