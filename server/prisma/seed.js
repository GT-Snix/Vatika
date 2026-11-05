const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const plants = [
  {
    name: 'Tulsi',
    botanicalName: 'Ocimum tenuiflorum',
    uses: 'Holy basil. Leaves are brewed as tea for coughs, colds and sore throat; used in Ayurveda as an adaptogen to ease stress and support immunity.',
    waterIntervalHours: 24,
  },
  {
    name: 'Aloe Vera',
    botanicalName: 'Aloe barbadensis miller',
    uses: 'Gel from the leaves soothes minor burns, sunburn and skin irritation, and is used as a moisturiser. A succulent, so it needs infrequent watering.',
    waterIntervalHours: 72,
  },
  {
    name: 'Ashwagandha',
    botanicalName: 'Withania somnifera',
    uses: 'Indian winter cherry. The root is a classic Ayurvedic adaptogen, traditionally taken as powder to reduce stress and anxiety and to improve sleep and stamina.',
    waterIntervalHours: 48,
  },
];

async function main() {
  for (const p of plants) {
    // name isn't @unique, so we can't upsert; check first so re-running the seed doesn't duplicate.
    const existing = await prisma.plant.findFirst({ where: { name: p.name } });
    if (existing) {
      await prisma.plant.update({ where: { id: existing.id }, data: p });
    } else {
      await prisma.plant.create({ data: p });
    }
  }
  console.log(`Seeded ${plants.length} plants`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
