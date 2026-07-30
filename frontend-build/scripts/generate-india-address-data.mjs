import fs from 'node:fs';
import path from 'node:path';

import pincodeDb from 'india-pincode-search/db/pincode_db.json' with { type: 'json' };

const SMALL_WORDS = new Set(['and', 'of', 'the']);

const STATE_RENAMES = {
  Chattisgarh: 'Chhattisgarh',
  Pondicherry: 'Puducherry',
};

function toTitleCase(input) {
  return String(input || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((word, idx) => {
      const parts = word.split('-').map((part, partIdx) => {
        if (!part) return part;
        if ((idx > 0 || partIdx > 0) && SMALL_WORDS.has(part)) return part;
        return part.charAt(0).toUpperCase() + part.slice(1);
      });
      return parts.join('-');
    })
    .join(' ')
    .replace(/\bNct\b/g, 'NCT')
    .replace(/\bUt\b/g, 'UT');
}

function normalizeState(input) {
  const named = toTitleCase(input);
  return STATE_RENAMES[named] || named;
}

function normalizeCity(input) {
  return toTitleCase(input);
}

function normalizeDistrict(input) {
  return toTitleCase(input);
}

function buildMap() {
  const grouped = {};

  for (const row of pincodeDb) {
    const state = normalizeState(row.state);
    const city = normalizeCity(row.city);
    const district = normalizeDistrict(row.district);

    if (!state || !city || !district) continue;

    if (!grouped[state]) grouped[state] = {};
    if (!grouped[state][city]) grouped[state][city] = new Set();
    grouped[state][city].add(district);
  }

  const sorted = {};
  for (const state of Object.keys(grouped).sort((a, b) => a.localeCompare(b))) {
    sorted[state] = {};
    for (const city of Object.keys(grouped[state]).sort((a, b) => a.localeCompare(b))) {
      sorted[state][city] = [...grouped[state][city]].sort((a, b) => a.localeCompare(b));
    }
  }

  return sorted;
}

const output = buildMap();
const targetPath = path.join(process.cwd(), 'src', 'data', 'indiaStateCityDistrictMap.json');

fs.writeFileSync(targetPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');

console.log(
  `Generated ${targetPath} with ${Object.keys(output).length} states and ${Object.values(output).reduce((count, cities) => count + Object.keys(cities).length, 0)} cities.`
);
