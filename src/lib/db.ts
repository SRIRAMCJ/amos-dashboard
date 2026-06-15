import { PrismaClient } from '@prisma/client';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import ws from 'ws';

// Required for Neon serverless in Node.js environments
if (typeof WebSocket === 'undefined') {
  neonConfig.webSocketConstructor = ws;
}

function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL!;
  const directUrl = process.env.DIRECT_URL || databaseUrl;

  // Use direct connection for migrations, pooled for queries
  const pool = new Pool({ connectionString: directUrl });
  const adapter = new PrismaNeon(pool);

  return new PrismaClient({ adapter, log: process.env.NODE_ENV === 'development' ? ['query'] : [] });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;