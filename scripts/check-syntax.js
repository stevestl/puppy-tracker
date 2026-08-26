#!/usr/bin/env node
// Validates index.html's inline <script> blocks parse cleanly and that the
// Firebase config files are well-formed JSON. No build step exists for this
// single-file app, so this is what CI runs in place of a real test suite.

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const repoRoot = path.join(__dirname, '..');
let hadError = false;

function checkJson(relPath) {
  const filePath = path.join(repoRoot, relPath);
  try {
    JSON.parse(fs.readFileSync(filePath, 'utf8'));
    console.log(`OK   ${relPath}`);
  } catch (err) {
    hadError = true;
    console.error(`FAIL ${relPath}: ${err.message}`);
  }
}

function checkInlineScripts() {
  const htmlPath = path.join(repoRoot, 'index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');

  const scriptTagRe = /<script([^>]*)>([\s\S]*?)<\/script>/g;
  let match;
  let count = 0;

  while ((match = scriptTagRe.exec(html)) !== null) {
    const [, attrs, code] = match;
    if (!code.trim()) continue; // src="..." tags with no inline body
    count += 1;

    const isModule = /type\s*=\s*"module"/.test(attrs);
    const ext = isModule ? '.mjs' : '.js';
    const tmpFile = path.join(os.tmpdir(), `puppy-tracker-inline-${count}${ext}`);
    fs.writeFileSync(tmpFile, code);

    try {
      execFileSync(process.execPath, ['--check', tmpFile], { stdio: 'pipe' });
      console.log(`OK   index.html inline <script> block #${count}${isModule ? ' (module)' : ''}`);
    } catch (err) {
      hadError = true;
      console.error(`FAIL index.html inline <script> block #${count}:`);
      console.error(err.stderr ? err.stderr.toString() : err.message);
    } finally {
      fs.unlinkSync(tmpFile);
    }
  }

  if (count === 0) {
    hadError = true;
    console.error('FAIL no inline <script> blocks were found in index.html — check the markup.');
  }
}

checkJson('firebase.json');
checkJson('.firebaserc');
checkJson('firestore.indexes.json');
checkInlineScripts();

if (hadError) {
  console.error('\nSyntax check failed.');
  process.exit(1);
}

console.log('\nAll checks passed.');
