const { prisma } = require("../config/prisma");
const statsService = require("./stats.service");
const logger = require("../utils/logger");

/**
 * Build leaderboard across users.
 * Returns array of user metrics sorted by score (desc).
 */
const getLeaderboard = async (limit = 100) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                username: true,
                leetcodeUsername: true,
                createdAt: true,
            },
        });

        const data = await Promise.all(
            users.map(async (user) => {
                const [totalCompletedDays, totalDays, submissionsAgg, penaltiesAgg, streaks] =
                    await Promise.all([
                        prisma.dailyResult.count({
                            where: {
                                member: { userId: user.id },
                                completed: true,
                            },
                        }),
                        prisma.dailyResult.count({
                            where: { member: { userId: user.id } },
                        }),
                        prisma.dailyResult.aggregate({
                            where: { member: { userId: user.id } },
                            _sum: { submissionsCount: true },
                        }),
                        prisma.penaltyLedger.aggregate({
                            where: { member: { userId: user.id } },
                            _sum: { amount: true },
                        }),
                        statsService.calculateUserStreak(user.id),
                    ]);

                const totalSubmissions = submissionsAgg._sum.submissionsCount || 0;
                const totalPenalties = penaltiesAgg._sum.amount || 0;

                // Simple score: number of completed days (can be adjusted later)
                const score = totalCompletedDays;

                return {
                    userId: user.id,
                    username: user.username,
                    leetcodeUsername: user.leetcodeUsername,
                    createdAt: user.createdAt,
                    score,
                    totalCompletedDays,
                    totalDays,
                    totalSubmissions,
                    totalPenalties,
                    currentStreak: streaks.currentStreak || 0,
                    longestStreak: streaks.longestStreak || 0,
                };
            })
        );

        // Sort by score desc, then currentStreak desc, then totalPenalties asc
        data.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            if (b.currentStreak !== a.currentStreak)
                return b.currentStreak - a.currentStreak;
            return a.totalPenalties - b.totalPenalties;
        });

        return data.slice(0, limit);
    } catch (error) {
        logger.error("Error building leaderboard:", error);
        throw error;
    }
};

module.exports = {
    getLeaderboard,
};
