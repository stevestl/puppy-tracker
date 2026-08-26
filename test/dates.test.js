'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { moduleSlice } = require('./support/app-source');
const { loadAndExport } = require('./support/sandbox');

const dateHelpersSource = moduleSlice(
  'function formatDateForInput(date) {',
  'function ensureHistoryDateFilterInitialized()'
);
const { formatDateForInput, parseInputDate, getDefaultHistoryDateRange } = loadAndExport(dateHelpersSource, [
  'formatDateForInput', 'parseInputDate', 'getDefaultHistoryDateRange'
]);

const adminRangeSource = moduleSlice(
  'function getAdminRangeStartDate(rangeKey) {',
  'function getAdminEntriesForRange(rangeKey)'
);
const { getAdminRangeStartDate } = loadAndExport(adminRangeSource, ['getAdminRangeStartDate']);

test('formatDateForInput zero-pads month and day into YYYY-MM-DD', () => {
  assert.equal(formatDateForInput(new Date(2026, 0, 5)), '2026-01-05');
  assert.equal(formatDateForInput(new Date(2026, 10, 30)), '2026-11-30');
});

test('parseInputDate round-trips a YYYY-MM-DD string to a local Date', () => {
  const parsed = parseInputDate('2026-03-14');
  assert.equal(parsed.getFullYear(), 2026);
  assert.equal(parsed.getMonth(), 2); // 0-indexed
  assert.equal(parsed.getDate(), 14);
});

test('parseInputDate returns null for empty/malformed input', () => {
  assert.equal(parseInputDate(''), null);
  assert.equal(parseInputDate(null), null);
  assert.equal(parseInputDate('not-a-date'), null);
});

test('getDefaultHistoryDateRange spans 14 days ending today', () => {
  const range = getDefaultHistoryDateRange();
  const start = parseInputDate(range.start);
  const end = parseInputDate(range.end);
  const dayMs = 24 * 60 * 60 * 1000;
  assert.equal(Math.round((end - start) / dayMs), 13);
  assert.equal(range.end, formatDateForInput(new Date(new Date().setHours(0, 0, 0, 0))));
});

test('getAdminRangeStartDate("12months") goes back 12 months from today', () => {
  const start = getAdminRangeStartDate('12months');
  const expected = new Date();
  expected.setMonth(expected.getMonth() - 12);
  expected.setHours(0, 0, 0, 0);
  assert.equal(start.getTime(), expected.getTime());
});

test('getAdminRangeStartDate defaults to a 2-week window for any other key', () => {
  const start = getAdminRangeStartDate('2weeks');
  const expected = new Date();
  expected.setDate(expected.getDate() - 13);
  expected.setHours(0, 0, 0, 0);
  assert.equal(start.getTime(), expected.getTime());

  const startForUnknownKey = getAdminRangeStartDate('bogus');
  assert.equal(startForUnknownKey.getTime(), expected.getTime());
});
