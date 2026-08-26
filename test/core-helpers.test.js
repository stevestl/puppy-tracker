'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { moduleSlice } = require('./support/app-source');
const { loadAndExport } = require('./support/sandbox');

// normalizeName through resolveDogNameFromSelection sit in one contiguous
// block of small, dependency-free helpers used throughout index.html for
// trimming/validating user input.
const source = moduleSlice('function normalizeName(name) {', 'window.prepareAdditionalAssignment');

const {
  normalizeName,
  getDogDocId,
  parseDogNames,
  normalizeEmail,
  normalizeText,
  normalizePhone,
  isValidPhoneFormat,
  getTrainerMetadataWarnings,
  escapeHtml,
  getDogOptionLabel,
  resolveDogNameFromSelection
} = loadAndExport(source, [
  'normalizeName', 'getDogDocId', 'parseDogNames', 'normalizeEmail', 'normalizeText',
  'normalizePhone', 'isValidPhoneFormat', 'getTrainerMetadataWarnings', 'escapeHtml',
  'getDogOptionLabel', 'resolveDogNameFromSelection'
]);

test('normalizeName collapses whitespace and trims', () => {
  assert.equal(normalizeName('  Rex   the   Dog  '), 'Rex the Dog');
  assert.equal(normalizeName(null), '');
  assert.equal(normalizeName(undefined), '');
});

test('getDogDocId lowercases and URL-encodes the normalized name', () => {
  assert.equal(getDogDocId('Rex'), 'rex');
  assert.equal(getDogDocId('  Bella Pup  '), 'bella%20pup');
});

test('parseDogNames splits on newline/comma/semicolon, dedupes, and normalizes', () => {
  assert.deepEqual(
    parseDogNames('Rex, Bella\nMax;  Rex \n Bella'),
    ['Rex', 'Bella', 'Max']
  );
  assert.deepEqual(parseDogNames(''), []);
  assert.deepEqual(parseDogNames(null), []);
});

test('normalizeEmail trims and lowercases', () => {
  assert.equal(normalizeEmail('  Steve@Example.COM '), 'steve@example.com');
  assert.equal(normalizeEmail(undefined), '');
});

test('normalizeText collapses whitespace, trims, and lowercases', () => {
  assert.equal(normalizeText('  Needs   Improvement '), 'needs improvement');
});

test('normalizePhone keeps only digits and a leading +', () => {
  assert.equal(normalizePhone('(555) 123-4567'), '5551234567');
  assert.equal(normalizePhone('+1 555 123 4567'), '+15551234567');
});

test('isValidPhoneFormat treats an empty phone as valid (optional field)', () => {
  assert.equal(isValidPhoneFormat(''), true);
  assert.equal(isValidPhoneFormat(null), true);
});

test('isValidPhoneFormat requires 10-15 digits', () => {
  assert.equal(isValidPhoneFormat('555-123-4567'), true);
  assert.equal(isValidPhoneFormat('+1 555 123 4567'), true);
  assert.equal(isValidPhoneFormat('12345'), false);
  assert.equal(isValidPhoneFormat('1'.repeat(16)), false);
});

test('getTrainerMetadataWarnings flags a missing name', () => {
  assert.deepEqual(getTrainerMetadataWarnings({ name: '', phone: '5551234567' }), ['missing trainer name']);
});

test('getTrainerMetadataWarnings flags a malformed phone', () => {
  assert.deepEqual(getTrainerMetadataWarnings({ name: 'Jo', phone: '123' }), ['phone format may be invalid']);
});

test('getTrainerMetadataWarnings is silent when everything is valid', () => {
  assert.deepEqual(getTrainerMetadataWarnings({ name: 'Jo', phone: '5551234567' }), []);
});

test('escapeHtml escapes all five HTML-significant characters', () => {
  assert.equal(
    escapeHtml(`<img src=x onerror="alert('xss')">&`),
    '&lt;img src=x onerror=&quot;alert(&#39;xss&#39;)&quot;&gt;&amp;'
  );
});

test('escapeHtml treats a null/undefined value as an empty string', () => {
  assert.equal(escapeHtml(null), '');
  assert.equal(escapeHtml(undefined), '');
});

test('getDogOptionLabel joins litter and dog name, defaulting an unknown litter', () => {
  assert.equal(getDogOptionLabel({ litterName: 'Spring 2026', dogName: 'Rex' }), 'Spring 2026: Rex');
  assert.equal(getDogOptionLabel({ dogName: 'Rex' }), 'Unknown litter: Rex');
});

test('resolveDogNameFromSelection matches against window.availableDogs by option label', () => {
  const withDogs = loadAndExport(source, ['resolveDogNameFromSelection'], {
    availableDogs: [{ dogName: 'Rex', litterName: 'Spring 2026' }]
  });
  assert.equal(withDogs.resolveDogNameFromSelection('Spring 2026: Rex'), 'Rex');
});

test('resolveDogNameFromSelection falls back to text after the colon when no dog matches', () => {
  assert.equal(resolveDogNameFromSelection('Unknown litter: Bella'), 'Bella');
});

test('resolveDogNameFromSelection returns the raw selection when there is no colon', () => {
  assert.equal(resolveDogNameFromSelection('Rex'), 'Rex');
});

test('resolveDogNameFromSelection returns empty string for empty input', () => {
  assert.equal(resolveDogNameFromSelection(''), '');
});
