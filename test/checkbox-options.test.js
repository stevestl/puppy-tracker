'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { moduleSlice } = require('./support/app-source');
const { createSandbox, run } = require('./support/sandbox');

// DISTRACTION_OPTIONS/COMMAND_OPTIONS/renderCheckboxOptions are the shared
// source of truth rendered into both the New Entry form and the Edit Entry
// modal (see index.html's four renderCheckboxOptions(...) calls). Includes
// escapeHtml, which renderCheckboxOptions depends on.
const source = moduleSlice(
  'function escapeHtml(value) {',
  'function getDogOptionLabel(dog)'
);

function loadCheckboxOptions() {
  const sandbox = createSandbox();
  run(sandbox, source, 'checkbox-options.js');
  return sandbox;
}

test('renderCheckboxOptions renders one checkbox per option with matching name/value', () => {
  const sandbox = loadCheckboxOptions();
  run(sandbox, `renderCheckboxOptions('distractionCheckboxGroup', 'distraction', DISTRACTION_OPTIONS);`);
  const html = sandbox.document.getElementById('distractionCheckboxGroup').innerHTML;
  const matches = [...html.matchAll(/name="distraction" value="([^"]*)"/g)].map((m) => m[1]);
  assert.deepEqual(matches, ['Other dogs', 'Children', 'Food', 'Loud noises', 'Crowds', 'Other animals']);
});

test('the New Entry and Edit Entry command lists render from the identical option set', () => {
  const sandbox = loadCheckboxOptions();
  run(sandbox, `
    renderCheckboxOptions('commandCheckboxGroup', 'command', COMMAND_OPTIONS);
    renderCheckboxOptions('editCommandCheckboxGroup', 'editCommand', COMMAND_OPTIONS);
  `);
  const newHtml = sandbox.document.getElementById('commandCheckboxGroup').innerHTML;
  const editHtml = sandbox.document.getElementById('editCommandCheckboxGroup').innerHTML;

  const newValues = [...newHtml.matchAll(/name="command" value="([^"]*)"/g)].map((m) => m[1]);
  const editValues = [...editHtml.matchAll(/name="editCommand" value="([^"]*)"/g)].map((m) => m[1]);

  assert.equal(newValues.length, 17);
  assert.deepEqual(newValues, editValues, 'both forms must render the exact same commands in the exact same order');
  assert.ok(newValues.includes('Look'), 'the full command set (including "Look") must be present');
});

test('renderCheckboxOptions HTML-escapes option values (defense in depth, even for static option lists)', () => {
  const sandbox = loadCheckboxOptions();
  run(sandbox, `renderCheckboxOptions('commandCheckboxGroup', 'command', ["<script>alert(1)</script>"]);`);
  const html = sandbox.document.getElementById('commandCheckboxGroup').innerHTML;
  assert.ok(!html.includes('<script>alert(1)</script>'));
  assert.ok(html.includes('&lt;script&gt;'));
});

test('renderCheckboxOptions does nothing if the target container does not exist', () => {
  const sandbox = loadCheckboxOptions();
  assert.doesNotThrow(() => {
    run(sandbox, `renderCheckboxOptions('doesNotExist', 'x', ['a']);`);
  });
});
