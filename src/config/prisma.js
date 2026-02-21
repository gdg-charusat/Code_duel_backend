const { PrismaClient } = require("@prisma/client");
const logger = require("../utils/logger");

// Allow a fake in-memory prisma for local testing when USE_FAKE_DB=true
if (process.env.USE_FAKE_DB === "true") {
  // Simple fake data for leaderboard testing
  const fakeUsers = [
    {
      id: "user-1",
      username: "alice",
      leetcodeUsername: "alice_lc",
      createdAt: new Date(),
    },
    {
      id: "user-2",
      username: "bob",
      leetcodeUsername: "bob_lc",
      createdAt: new Date(),
    },
    {
      id: "user-3",
      username: "carol",
      leetcodeUsername: null,
      createdAt: new Date(),
    },
  ];

  const fakeResults = {
    "user-1": {
      totalDays: 140,
      completedDays: 120,
      submissions: 340,
      penalties: 5,
      results: Array.from({ length: 140 }).map((_, i) => ({
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
        completed: i % 2 === 0,
        submissionsCount: 2,
      })),
    },
    "user-2": {
      totalDays: 80,
      completedDays: 60,
      submissions: 120,
      penalties: 2,
      results: Array.from({ length: 80 }).map((_, i) => ({
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
        completed: i % 3 !== 0,
        submissionsCount: 1,
      })),
    },
    "user-3": {
      totalDays: 10,
      completedDays: 2,
      submissions: 5,
      penalties: 0,
      results: Array.from({ length: 10 }).map((_, i) => ({
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
        completed: i === 0 || i === 2,
        submissionsCount: 1,
      })),
    },
  };

  const fakePrisma = {
    user: {
      findMany: async () => fakeUsers,
    },
    dailyResult: {
      count: async ({ where }) => {
        // where: { member: { userId } } or where: { member: { userId }, completed: true }
        const userId = where && where.member && where.member.userId;
        const completed = where && where.completed === true;
        if (!userId) return 0;
        const entry = fakeResults[userId];
        if (!entry) return 0;
        return completed ? entry.completedDays : entry.totalDays;
      },
      aggregate: async ({ where }) => {
        const userId = where && where.member && where.member.userId;
        const entry = fakeResults[userId] || { submissions: 0 };
        return { _sum: { submissionsCount: entry.submissions } };
      },
      findMany: async ({ where }) => {
        const userId = where && where.member && where.member.userId;
        return (fakeResults[userId] && fakeResults[userId].results) || [];
      },
    },
    penaltyLedger: {
      aggregate: async ({ where }) => {
        const userId = where && where.member && where.member.userId;
        const entry = fakeResults[userId] || { penalties: 0 };
        return { _sum: { amount: entry.penalties } };
      },
    },
    $disconnect: async () => { },
    $on: () => { },
  };

  module.exports = {
    prisma: fakePrisma,
    disconnectPrisma: async () => { },
  };
} else {
  // Singleton pattern for Prisma Client
  let prismaInstance = null;

  const getPrismaClient = () => {
    if (!prismaInstance) {
      prismaInstance = new PrismaClient({
        log: [
          { level: "error", emit: "event" },
          { level: "warn", emit: "event" },
        ],
      });

      // Log errors
      prismaInstance.$on("error", (e) => {
        logger.error("Prisma Error:", e);
      });

      // Log warnings
      prismaInstance.$on("warn", (e) => {
        logger.warn("Prisma Warning:", e);
      });
    }

    return prismaInstance;
  };

  // Graceful shutdown
  const disconnectPrisma = async () => {
    if (prismaInstance) {
      await prismaInstance.$disconnect();
      logger.info("Prisma Client disconnected");
    }
  };

  module.exports = {
    prisma: getPrismaClient(),
    disconnectPrisma,
  };
}
