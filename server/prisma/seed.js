// Load .env so lib/db.js can read DATABASE_URL.
import 'dotenv/config';
// Reuse the app's client so the seed connects exactly the way the server does.
import prisma from '../lib/db.js';

// Order matters: on an empty table, ids are handed out in this order (Tulsi = 1 ... Giloy = 8).
// waterIntervalHours are game-tuning values, not horticultural advice.
const plants = [
  {
    name: 'Tulsi', botanicalName: 'Ocimum tenuiflorum',
    habitat: 'Tropical and subtropical regions', partsUsed: 'Leaves, seeds', waterIntervalHours: 24,
    uses: 'Holy basil. Leaves are brewed as tea for coughs, colds and sore throat; used in Ayurveda as an adaptogen to ease stress and support immunity.',
  },
  {
    name: 'Aloe Vera', botanicalName: 'Aloe barbadensis miller',
    habitat: 'Dry and arid climates', partsUsed: 'Leaf gel', waterIntervalHours: 72,
    uses: 'Gel from the leaves soothes minor burns, sunburn and skin irritation, and is used as a moisturiser. A succulent, so it needs infrequent watering.',
  },
  {
    name: 'Ashwagandha', botanicalName: 'Withania somnifera',
    habitat: 'Dry regions of India', partsUsed: 'Primarily roots', waterIntervalHours: 48,
    uses: 'Indian winter cherry. The root is a classic Ayurvedic adaptogen, traditionally taken as powder to reduce stress and anxiety and to improve sleep and stamina.',
  },
  {
    name: 'Neem', botanicalName: 'Azadirachta indica',
    habitat: 'Tropical and semi-arid regions', partsUsed: 'Leaves, bark, seeds', waterIntervalHours: 72,
    uses: 'Traditionally used in skin-care and oral-hygiene preparations.',
  },
  {
    name: 'Turmeric', botanicalName: 'Curcuma longa',
    habitat: 'Warm, humid tropical regions', partsUsed: 'Rhizomes', waterIntervalHours: 36,
    uses: 'Traditionally used in preparations for inflammation, skin care and digestion; also a staple of Indian cooking.',
  },
  {
    name: 'Brahmi', botanicalName: 'Bacopa monnieri',
    habitat: 'Wetlands and marshy areas', partsUsed: 'Whole plant', waterIntervalHours: 12,
    uses: 'Traditionally associated with memory, learning and cognitive wellness.',
  },
  {
    name: 'Amla', botanicalName: 'Phyllanthus emblica',
    habitat: 'Tropical and subtropical regions', partsUsed: 'Fruits', waterIntervalHours: 96,
    uses: 'Traditionally used for digestive health and in Rasayana formulations; a key ingredient of Triphala.',
  },
  {
    name: 'Giloy', botanicalName: 'Tinospora cordifolia',
    habitat: 'Tropical regions; commonly a climbing vine', partsUsed: 'Stems, leaves', waterIntervalHours: 48,
    uses: 'Traditionally used in fever-related formulations and for general wellness.',
  },
];

async function main() {
  // One at a time with await (not Promise.all) so rows are created in list order and ids stay stable.
  for (const p of plants) {
    // Upsert = "update if a plant with this name exists, otherwise create it", as one DB operation.
    await prisma.plant.upsert({ where: { name: p.name }, update: p, create: p });
  }
  console.log(`Seeded ${plants.length} plants`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
