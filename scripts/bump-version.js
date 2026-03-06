#!/usr/bin/env node

import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP_JSON_PATH = resolve(__dirname, "../frontend/app.json");

const type = process.argv[2];
if (!["patch", "minor", "major"].includes(type)) {
  console.error('Usage: node scripts/bump-version.js <patch|minor|major>');
  process.exit(1);
}

const appJson = JSON.parse(readFileSync(APP_JSON_PATH, "utf8"));
const current = appJson.expo.version;
const [major, minor, patch] = current.split(".").map(Number);

let next;
if (type === "major") next = `${major + 1}.0.0`;
else if (type === "minor") next = `${major}.${minor + 1}.0`;
else next = `${major}.${minor}.${patch + 1}`;

appJson.expo.version = next;
writeFileSync(APP_JSON_PATH, JSON.stringify(appJson, null, 4) + "\n");

console.log(`Version bumped: ${current} → ${next}`);
