// Run at image build time: seeds the skin catalog so the server starts with data even offline.
import fs from 'node:fs';
import { fetchCatalog, seedPath } from '../src/catalog.js';

const catalog = await fetchCatalog();
fs.writeFileSync(seedPath(), JSON.stringify(catalog));
console.log(`catalog seed: ${catalog.skins.length} skins, ${catalog.tiers.length} tiers`);
