'use strict';

// index.html has no build step, so its logic can't be `require()`d directly.
// These helpers pull specific function definitions out of its inline
// <script> blocks by locating unique start/end markers in the source text,
// so tests exercise the actual shipped code instead of a hand-copied
// reimplementation that could quietly drift from it.

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.join(__dirname, '..', '..');
const INDEX_HTML_PATH = path.join(REPO_ROOT, 'index.html');

let cachedHtml = null;
function readIndexHtml() {
  if (!cachedHtml) {
    cachedHtml = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  }
  return cachedHtml;
}

let cachedBlocks = null;
function scriptBlocks() {
  if (cachedBlocks) return cachedBlocks;
  const html = readIndexHtml();
  const scriptTagRe = /<script([^>]*)>([\s\S]*?)<\/script>/g;
  let match;
  let moduleCode = null;
  let classicCode = null;
  while ((match = scriptTagRe.exec(html)) !== null) {
    const [, attrs, code] = match;
    if (!code.trim()) continue; // src="..." tags with no inline body
    if (/type\s*=\s*"module"/.test(attrs)) {
      moduleCode = code;
    } else {
      classicCode = code;
    }
  }
  if (!moduleCode || !classicCode) {
    throw new Error('Could not locate both inline <script> blocks in index.html — did the markup change?');
  }
  cachedBlocks = { moduleCode, classicCode };
  return cachedBlocks;
}

// Returns the substring of `source` starting at `startMarker` (inclusive) up
// to `endMarker` (exclusive), or to the end of the string if endMarker is
// omitted. Throws if either marker can't be found, so a rename/refactor in
// index.html fails the test suite loudly instead of silently testing stale
// code.
function slice(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  if (start === -1) {
    throw new Error(`Start marker not found in source: ${JSON.stringify(startMarker)}`);
  }
  if (endMarker === undefined) {
    return source.slice(start);
  }
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (end === -1) {
    throw new Error(`End marker not found in source: ${JSON.stringify(endMarker)}`);
  }
  return source.slice(start, end);
}

function moduleSlice(startMarker, endMarker) {
  return slice(scriptBlocks().moduleCode, startMarker, endMarker);
}

function classicSlice(startMarker, endMarker) {
  return slice(scriptBlocks().classicCode, startMarker, endMarker);
}

module.exports = { scriptBlocks, slice, moduleSlice, classicSlice };
