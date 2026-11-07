// Bootstrap: fetch Dhad sources from the public repo (pinned commit), build, generate.
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const REPO = "kaledgmal71-commits/dhad";
const SHA = "__SHA__";
fs.rmSync("_src", { recursive: true, force: true });
fs.mkdirSync("_src");
execSync(`curl -fsSL https://codeload.github.com/${REPO}/tar.gz/${SHA} | tar -xz --strip-components=1 -C _src`, { stdio: "inherit", shell: "/bin/bash" });
const SKIP = new Set(["package.json", "vercel.json", "api", ".git"]);
for (const f of fs.readdirSync("_src")) {
  if (SKIP.has(f)) continue;
  fs.cpSync(path.join("_src", f), f, { recursive: true });
}
execSync("node build.js", { stdio: "inherit" });
execSync("node site/pages.gen.js", { stdio: "inherit" });
