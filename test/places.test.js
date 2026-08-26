'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { classicSlice } = require('./support/app-source');
const { loadAndExport } = require('./support/sandbox');

// The Overpass/nearby-places helpers live in the second (classic, non-module)
// <script> block, alongside captureLocation.
const overpassSource = classicSlice('function buildOverpassQuery(radius, lat, lng) {', 'async function fetchWithTimeout');
const { buildOverpassQuery } = loadAndExport(overpassSource, ['buildOverpassQuery']);

const placesSource = classicSlice('function dedupeAndRankPlaces(places, limit = 6) {', 'async function fetchNearbyPlaces');
const { dedupeAndRankPlaces, buildNearbyPlacesCacheKey } = loadAndExport(placesSource, [
  'dedupeAndRankPlaces', 'buildNearbyPlacesCacheKey'
]);

const distanceSource = classicSlice('function calculateDistance(lat1, lon1, lat2, lon2) {', 'function displayNearbyPlacesOSM');
const { calculateDistance } = loadAndExport(distanceSource, ['calculateDistance']);

test('buildOverpassQuery interpolates radius/lat/lng into every amenity clause', () => {
  const q = buildOverpassQuery(250, 37.7749, -122.4194);
  assert.match(q, /nwr\["name"\]\["amenity"\]\(around:250,37\.7749,-122\.4194\)/);
  assert.match(q, /nwr\["name"\]\["shop"\]\(around:250,37\.7749,-122\.4194\)/);
  assert.match(q, /out center 20;/);
});

test('calculateDistance returns ~0 for identical coordinates', () => {
  assert.ok(calculateDistance(37.7749, -122.4194, 37.7749, -122.4194) < 1e-6);
});

test('calculateDistance matches a known reference distance (SF City Hall to Ferry Building, ~2.9km)', () => {
  const meters = calculateDistance(37.77934, -122.41905, 37.79542, -122.39348);
  assert.ok(meters > 2000 && meters < 3200, `expected ~2-3km, got ${meters}m`);
});

test('buildNearbyPlacesCacheKey rounds coordinates to 4 decimal places', () => {
  assert.equal(buildNearbyPlacesCacheKey(37.774912345, -122.419123), '37.7749,-122.4191');
});

test('dedupeAndRankPlaces keeps the closer of two same-name-and-type duplicates', () => {
  const places = [
    { name: 'Central Bark', type: 'park', distance: 500 },
    { name: 'Central Bark', type: 'park', distance: 120 }
  ];
  const result = dedupeAndRankPlaces(places);
  assert.equal(result.length, 1);
  assert.equal(result[0].distance, 120);
});

test('dedupeAndRankPlaces treats the same name with a different type as distinct', () => {
  const places = [
    { name: 'Central Park', type: 'park', distance: 100 },
    { name: 'Central Park', type: 'cafe', distance: 200 }
  ];
  assert.equal(dedupeAndRankPlaces(places).length, 2);
});

test('dedupeAndRankPlaces drops places with no name', () => {
  const places = [{ name: '', type: 'park', distance: 10 }, { name: '  ', type: 'cafe', distance: 20 }];
  assert.deepEqual(dedupeAndRankPlaces(places), []);
});

test('dedupeAndRankPlaces sorts by distance ascending and respects the limit', () => {
  const places = [
    { name: 'Far', type: 'park', distance: 900 },
    { name: 'Near', type: 'park', distance: 100 },
    { name: 'Mid', type: 'park', distance: 500 }
  ];
  const result = dedupeAndRankPlaces(places, 2);
  assert.deepEqual(result.map((p) => p.name), ['Near', 'Mid']);
});
