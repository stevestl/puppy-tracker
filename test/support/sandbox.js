'use strict';

// A minimal vm sandbox for running extracted snippets of index.html's inline
// scripts. Not a DOM implementation — just enough surface (getElementById
// returning a reusable fake element, classList/innerHTML/value) for the
// pure-logic-adjacent functions under test to run without throwing.

const vm = require('vm');

function makeElement() {
  const classSet = new Set();
  return {
    _html: '',
    get innerHTML() { return this._html; },
    set innerHTML(v) { this._html = v; },
    value: '',
    required: false,
    textContent: '',
    classList: {
      add(...names) { names.forEach((n) => classSet.add(n)); },
      remove(...names) { names.forEach((n) => classSet.delete(n)); },
      contains(name) { return classSet.has(name); },
      toggle(name, force) {
        const next = force === undefined ? !classSet.has(name) : !!force;
        if (next) classSet.add(name); else classSet.delete(name);
        return next;
      }
    },
    querySelectorAll() { return []; },
    addEventListener() {},
    setAttribute() {},
    getAttribute() { return null; }
  };
}

function makeDocumentStub() {
  const elements = new Map();
  return {
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, makeElement());
      return elements.get(id);
    },
    querySelectorAll() { return []; },
    querySelector() { return null; },
    createElement() { return makeElement(); },
    _elements: elements
  };
}

// Creates a fresh vm context pre-seeded with `window`/`document` stubs plus
// any caller-supplied globals (e.g. window.availableDogs for a specific
// test). `window` and the context's global object are the same object, so
// `window.foo = ...` inside the snippet and reading `sandbox.foo` outside
// both work, matching how index.html relies on implicit globals.
function createSandbox(extraGlobals = {}) {
  const sandbox = {};
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.document = makeDocumentStub();
  sandbox.console = console;
  Object.assign(sandbox, extraGlobals);
  vm.createContext(sandbox);
  return sandbox;
}

function run(sandbox, code, filename = 'snippet.js') {
  return vm.runInContext(code, sandbox, { filename });
}

// Objects/arrays returned from a vm sandbox belong to a different realm, so
// Node's strict assert.deepEqual (which checks prototype identity) reports
// them as unequal to an identical-looking native object. A JSON round-trip
// normalizes plain data (strings/numbers/booleans/null/arrays/objects) back
// into the native realm; it's not appropriate for values containing
// functions, undefined, NaN, or Infinity, but none of the app helpers under
// test return those.
function toNative(value) {
  if (value === null || typeof value !== 'object') return value;
  if (Object.prototype.toString.call(value) === '[object Date]') {
    return new Date(value.getTime());
  }
  return JSON.parse(JSON.stringify(value));
}

// Runs `code` in a fresh sandbox, then exposes the given top-level
// identifiers (function/const/let names declared by `code`) as properties on
// the returned sandbox object. A plain `const` in a vm script doesn't become
// a global-object property on its own, so this does it explicitly via a
// same-context follow-up script. Exported functions are wrapped so their
// return values are realm-normalized (see toNative) before reaching the
// test's assertions.
function loadAndExport(code, names, extraGlobals = {}) {
  const sandbox = createSandbox(extraGlobals);
  run(sandbox, code, 'extracted.js');
  run(sandbox, `globalThis.__exports = { ${names.join(', ')} };`, 'export.js');
  const raw = sandbox.__exports;
  const wrapped = {};
  for (const key of Object.keys(raw)) {
    const value = raw[key];
    wrapped[key] = typeof value === 'function'
      ? (...args) => toNative(value(...args))
      : toNative(value);
  }
  return wrapped;
}

module.exports = { createSandbox, run, loadAndExport, makeElement, toNative };
