#!/usr/bin/env node
// Seals a personal note so the public repo only holds ciphertext.
//
//   node scripts/seal-note.mjs notes-src/<id>.json
//
// The source file (gitignored) looks like notes-src/_template.json:
//   { "path": "n/<neutral-name>.html", "note": { ...what assets/note/note.js renders... } }
// The first run adds a random "key" to it; later runs reuse that key, so the link
// stays the same when you edit the note and seal it again. The key only appears in
// the link (after "#k="), which browsers never send to the server.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { webcrypto as crypto } from "node:crypto";

const src = process.argv[2];
if (!src) {
  console.error("usage: node scripts/seal-note.mjs notes-src/<id>.json");
  process.exit(1);
}

const data = JSON.parse(readFileSync(src, "utf8"));
if (!data.path || !data.note) throw new Error(src + " needs \"path\" and \"note\"");

const b64url = (bytes) => Buffer.from(bytes).toString("base64url");
if (!data.key) {
  data.key = b64url(crypto.getRandomValues(new Uint8Array(16)));
  writeFileSync(src, JSON.stringify(data, null, 2) + "\n");
}

const key = await crypto.subtle.importKey("raw", Buffer.from(data.key, "base64url"), "AES-GCM", false, ["encrypt"]);
const iv = crypto.getRandomValues(new Uint8Array(12));
const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(JSON.stringify(data.note)));

// Nothing in this page names the person; the title stays generic on purpose.
const page = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow, noarchive">
<meta name="referrer" content="no-referrer">
<title>a note for you</title>
<meta property="og:title" content="a note for you">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<script src="/assets/js/analytics.js" async></script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Caveat:wght@500;700&family=Patrick+Hand&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/note/note.css">
</head>
<body>
<div id="note"></div>
<script>window.NOTE_SEALED = ${JSON.stringify({ iv: b64url(iv), ct: b64url(ct) })};</script>
<script src="/assets/note/note.js"></script>
</body>
</html>
`;

mkdirSync(dirname(data.path), { recursive: true });
writeFileSync(data.path, page);
const urlPath = data.path.replace(/\.html$/, "");
console.log(`sealed ${src} -> ${data.path}`);
console.log(`link: https://pixelsbypavan.com/${urlPath}#k=${data.key}`);
