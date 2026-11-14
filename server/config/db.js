const dns = require('dns');
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

const { prisma } = require('./prismaClient');

const connectDB = async (maxRetries = 5) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await prisma.$connect();
      await prisma.$queryRaw`SELECT 1`;
      console.log('PostgreSQL (Prisma / Neon) Connected successfully');
      return;
    } catch (error) {
      if (attempt === maxRetries) {
        console.error(`PostgreSQL Connection Error: ${error.message}`);
        throw error;
      }
      const baseDelay = 1500 * Math.pow(1.3, attempt - 1);
      const jitter = Math.floor(Math.random() * 400);
      const delayMs = Math.min(Math.round(baseDelay + jitter), 5000);

      console.log(`Neon compute node spinning up (Attempt ${attempt}/${maxRetries}), retrying in ${(delayMs / 1000).toFixed(1)}s...`);
      try {
        await prisma.$disconnect();
      } catch (_) {}
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
};

module.exports = connectDB;
