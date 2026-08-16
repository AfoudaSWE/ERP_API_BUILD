import 'dotenv/config';
import { createHmac, randomBytes } from 'node:crypto';
import { PrismaClient, DirectionMode } from '@prisma/client';

const prisma = new PrismaClient();

function hashApiKey(apiKey: string, pepper: string): string {
  return createHmac('sha256', pepper).update(apiKey).digest('hex');
}

async function main(): Promise<void> {
  const pepper = process.env.CAMERA_API_KEY_PEPPER;
  if (!pepper) throw new Error('CAMERA_API_KEY_PEPPER is required');

  const configuredKey = process.env.DEMO_CAMERA_API_KEY;
  const apiKey = configuredKey ?? `dev_${randomBytes(24).toString('hex')}`;
  const store = await prisma.store.upsert({
    where: { code: 'store-01' },
    update: { name: 'Demo Retail Store', timezone: 'Africa/Cairo', isActive: true },
    create: { code: 'store-01', name: 'Demo Retail Store', timezone: 'Africa/Cairo' },
  });

  await prisma.camera.upsert({
    where: { cameraId: 'store-01-entry' },
    update: {
      storeId: store.id,
      name: 'Main Entrance Camera',
      location: 'Main entrance',
      directionMode: DirectionMode.TOP_TO_BOTTOM_ENTRY,
      isActive: true,
      apiKeyHash: hashApiKey(apiKey, pepper),
    },
    create: {
      cameraId: 'store-01-entry',
      storeId: store.id,
      name: 'Main Entrance Camera',
      location: 'Main entrance',
      directionMode: DirectionMode.TOP_TO_BOTTOM_ENTRY,
      apiKeyHash: hashApiKey(apiKey, pepper),
    },
  });

  await prisma.storeOccupancy.upsert({
    where: { storeId: store.id },
    update: {},
    create: { storeId: store.id, totalsDate: new Date() },
  });

  console.log(`Seeded store-01 and store-01-entry. Demo API key: ${apiKey}`);
  if (!configuredKey) console.log('Save this generated development key; it is not stored in plaintext.');
}

main().finally(() => prisma.$disconnect());
