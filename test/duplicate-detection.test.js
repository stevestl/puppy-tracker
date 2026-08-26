'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { moduleSlice } = require('./support/app-source');
const { loadAndExport } = require('./support/sandbox');

// Includes normalizeText, which getEntryDuplicateSignature depends on.
const source = moduleSlice('function normalizeText(value) {', 'function normalizePhone(value)');
const { getEntryDuplicateSignature } = loadAndExport(source, ['getEntryDuplicateSignature']);

const baseEntry = {
  userId: 'user-1',
  dogName: 'Rex',
  locationType: 'Park',
  behavior: 'Good',
  behaviorComments: '',
  locationName: 'Main St Park',
  notes: 'Went well',
  duration: 1.5,
  commands: ['Sit', 'Down'],
  distractions: ['Children']
};

test('two entries with identical fields produce the same signature', () => {
  assert.equal(getEntryDuplicateSignature(baseEntry), getEntryDuplicateSignature({ ...baseEntry }));
});

test('signature is insensitive to whitespace/case differences (normalizeText)', () => {
  const messy = { ...baseEntry, dogName: '  REX  ', locationName: 'main st   park' };
  assert.equal(getEntryDuplicateSignature(baseEntry), getEntryDuplicateSignature(messy));
});

test('signature is insensitive to commands/distractions array order', () => {
  const reordered = { ...baseEntry, commands: ['Down', 'Sit'], distractions: ['Children'] };
  assert.equal(getEntryDuplicateSignature(baseEntry), getEntryDuplicateSignature(reordered));
});

test('a different dogName changes the signature', () => {
  assert.notEqual(getEntryDuplicateSignature(baseEntry), getEntryDuplicateSignature({ ...baseEntry, dogName: 'Bella' }));
});

test('duration null/undefined/"" all collapse to the same duration slot, distinct from an explicit 0', () => {
  const withNull = getEntryDuplicateSignature({ ...baseEntry, duration: null });
  const withUndefined = getEntryDuplicateSignature({ ...baseEntry, duration: undefined });
  const withEmptyString = getEntryDuplicateSignature({ ...baseEntry, duration: '' });
  const withZero = getEntryDuplicateSignature({ ...baseEntry, duration: 0 });

  assert.equal(withNull, withUndefined);
  assert.equal(withNull, withEmptyString);
  assert.notEqual(withNull, withZero, 'an explicit 0 duration must not be treated as "not recorded"');
});

test('a different duration value changes the signature', () => {
  assert.notEqual(getEntryDuplicateSignature(baseEntry), getEntryDuplicateSignature({ ...baseEntry, duration: 2 }));
});
