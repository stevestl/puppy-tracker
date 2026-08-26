'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { moduleSlice, classicSlice } = require('./support/app-source');
const { createSandbox, run } = require('./support/sandbox');

const behaviorLevelsSource = moduleSlice(
  'window.BEHAVIOR_LEVELS = {',
  'function getDogOptionLabel(dog)'
);

test('BEHAVIOR_LEVELS: Excellent/Good do not require comments, Fair/Needs Improvement do', () => {
  const sandbox = createSandbox();
  run(sandbox, behaviorLevelsSource);
  assert.equal(sandbox.behaviorRequiresComments('Excellent'), false);
  assert.equal(sandbox.behaviorRequiresComments('Good'), false);
  assert.equal(sandbox.behaviorRequiresComments('Fair'), true);
  assert.equal(sandbox.behaviorRequiresComments('Needs Improvement'), true);
  assert.equal(sandbox.behaviorRequiresComments(''), false);
  assert.equal(sandbox.behaviorRequiresComments(undefined), false);
});

test('behaviorToScore maps the four levels to 4/3/2/1 and unknown values to null', () => {
  const sandbox = createSandbox();
  run(sandbox, behaviorLevelsSource);
  assert.equal(sandbox.behaviorToScore('Excellent'), 4);
  assert.equal(sandbox.behaviorToScore('Good'), 3);
  assert.equal(sandbox.behaviorToScore('Fair'), 2);
  assert.equal(sandbox.behaviorToScore('Needs Improvement'), 1);
  assert.equal(sandbox.behaviorToScore('Not A Real Rating'), null);
  assert.equal(sandbox.behaviorToScore(''), null);
});

// applyBehaviorChange (via handleBehaviorChange/handleEditBehaviorChange) is
// defined in the classic <script> block but calls window.behaviorRequiresComments,
// which lives in the module block — load both into one shared sandbox, the
// same way the browser makes window.* globals visible across script tags.
const behaviorFormSource = classicSlice(
  'const BEHAVIOR_FORM_FIELD_IDS = {',
  'window.updateDurationDisplay = updateDurationDisplay;'
);

function loadBehaviorForms() {
  const sandbox = createSandbox();
  run(sandbox, behaviorLevelsSource, 'behavior-levels.js');
  run(sandbox, behaviorFormSource, 'behavior-forms.js');
  return sandbox;
}

test('handleBehaviorChange shows/requires the comments field for Fair, hides it for Excellent', () => {
  const sandbox = loadBehaviorForms();
  const commentsEl = sandbox.document.getElementById('behaviorComments');
  const groupEl = sandbox.document.getElementById('behaviorCommentsGroup');

  sandbox.handleBehaviorChange('Fair');
  assert.equal(commentsEl.required, true);
  assert.equal(groupEl.classList.contains('hidden'), false);

  commentsEl.value = 'should be cleared';
  sandbox.handleBehaviorChange('Excellent');
  assert.equal(commentsEl.required, false);
  assert.equal(groupEl.classList.contains('hidden'), true);
  assert.equal(commentsEl.value, '');
});

test('handleEditBehaviorChange operates on the edit-form fields independently of the new-entry form', () => {
  const sandbox = loadBehaviorForms();
  sandbox.handleBehaviorChange('Fair'); // new-entry form
  sandbox.handleEditBehaviorChange('Excellent'); // edit form

  assert.equal(sandbox.document.getElementById('behaviorComments').required, true, 'new-entry form untouched by edit-form call');
  assert.equal(sandbox.document.getElementById('editBehaviorComments').required, false);
});

test('updateBehaviorCommentsCounter truncates to 128 chars and reports the remaining count', () => {
  const sandbox = loadBehaviorForms();
  const commentsEl = sandbox.document.getElementById('behaviorComments');
  const counterEl = sandbox.document.getElementById('behaviorCommentsCounter');

  commentsEl.value = 'x'.repeat(140);
  sandbox.updateBehaviorCommentsCounter();
  assert.equal(commentsEl.value.length, 128);
  assert.equal(counterEl.textContent, '0 characters remaining');

  commentsEl.value = 'short';
  sandbox.updateBehaviorCommentsCounter();
  assert.equal(counterEl.textContent, '123 characters remaining');
});

test('updateEditBehaviorCommentsCounter truncates the edit-form field independently', () => {
  const sandbox = loadBehaviorForms();
  const editCommentsEl = sandbox.document.getElementById('editBehaviorComments');
  editCommentsEl.value = 'y'.repeat(200);
  sandbox.updateEditBehaviorCommentsCounter();
  assert.equal(editCommentsEl.value.length, 128);
  assert.equal(sandbox.document.getElementById('behaviorComments').value, '', 'new-entry form untouched');
});
