const { prisma } = require("../config/prisma");
const evaluationService = require("../services/evaluation.service");
const penaltyService = require("../services/penalty.service");
const statsService = require("../services/stats.service");
const inviteService = require("../services/invite.service");
const { asyncHandler } = require("../middlewares/error.middleware");

/**
 * Get dashboard overview for current user
 * GET /api/dashboard
 */
const getDashboard = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // Get all active memberships
  const memberships = await prisma.challengeMember.findMany({
    where: {
      userId,
      isActive: true,
      challenge: {
        status: "ACTIVE",
      },
    },
    include: {
      challenge: {
        select: {
          id: true,
          name: true,
          startDate: true,
          endDate: true,
          minSubmissionsPerDay: true,
          penaltyAmount: true,
        },
      },
    },
  });

  // Get today's status for each membership
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dashboardData = await Promise.all(
    memberships.map(async (membership) => {
      // Get today's result
      const todayResult = await prisma.dailyResult.findUnique({
        where: {
          challengeId_memberId_date: {
            challengeId: membership.challengeId,
            memberId: membership.id,
            date: today,
          },
        },
      });

      // Get recent daily results (last 7 days)
      const recentResults = await evaluationService.getMemberDailyResults(
        membership.id,
        7,
      );

      return {
        challenge: membership.challenge,
        currentStreak: membership.currentStreak,
        longestStreak: membership.longestStreak,
        totalPenalties: membership.totalPenalties,
        todayStatus: todayResult
          ? {
              completed: todayResult.completed,
              submissionsCount: todayResult.submissionsCount,
              evaluatedAt: todayResult.evaluatedAt,
            }
          : null,
        recentResults: recentResults.map((r) => ({
          date: r.date,
          completed: r.completed,
          submissionsCount: r.submissionsCount,
        })),
      };
    }),
  );

  // Get pending invites for the user
  const pendingInvites = await inviteService.getPendingInvites(userId);

  res.status(200).json({
    success: true,
    data: {
      challenges: dashboardData,
      pendingInvites,
    },
  });
});

/**
 * Get detailed challenge progress for a specific challenge
 * GET /api/dashboard/challenge/:challengeId
 */
const getChallengeProgress = asyncHandler(async (req, res) => {
  const { challengeId } = req.params;
  const userId = req.user.id;

  // Get membership
  const membership = await prisma.challengeMember.findUnique({
    where: {
      challengeId_userId: {
        challengeId,
        userId,
      },
    },
    include: {
      challenge: {
        select: {
          id: true,
          name: true,
          description: true,
          startDate: true,
          endDate: true,
          minSubmissionsPerDay: true,
          difficultyFilter: true,
          uniqueProblemConstraint: true,
          penaltyAmount: true,
          status: true,
        },
      },
    },
  });

  if (!membership) {
    return res.status(404).json({
      success: false,
      message: "Challenge membership not found",
    });
  }

  // Get all daily results
  const dailyResults = await evaluationService.getMemberDailyResults(
    membership.id,
    100,
  );

  // Get penalty history
  const penalties = await penaltyService.getMemberPenalties(membership.id);

  // Calculate statistics
  const totalDays = dailyResults.length;
  const completedDays = dailyResults.filter((r) => r.completed).length;
  const failedDays = totalDays - completedDays;
  const completionRate = totalDays > 0 ? (completedDays / totalDays) * 100 : 0;

  res.status(200).json({
    success: true,
    data: {
      challenge: membership.challenge,
      stats: {
        currentStreak: membership.currentStreak,
        longestStreak: membership.longestStreak,
        totalPenalties: membership.totalPenalties,
        totalDays,
        completedDays,
        failedDays,
        completionRate: completionRate.toFixed(2),
      },
      dailyResults,
      penalties,
    },
  });
});

/**
 * Get leaderboard for a challenge
 * GET /api/dashboard/challenge/:challengeId/leaderboard
 */
const getChallengeLeaderboard = asyncHandler(async (req, res) => {
  const { challengeId } = req.params;

  // Get all members with their stats
  const members = await prisma.challengeMember.findMany({
    where: {
      challengeId,
      isActive: true,
    },
    include: {
      user: {
        select: {
          username: true,
          leetcodeUsername: true,
        },
      },
    },
    orderBy: [
      { currentStreak: "desc" },
      { longestStreak: "desc" },
      { totalPenalties: "asc" },
    ],
  });

  // Get total completed days for each member
  const leaderboard = await Promise.all(
    members.map(async (member) => {
      const results = await prisma.dailyResult.findMany({
        where: { memberId: member.id },
      });

      const totalDays = results.length;
      const completedDays = results.filter((r) => r.completed).length;
      const completionRate =
        totalDays > 0 ? (completedDays / totalDays) * 100 : 0;

      return {
        username: member.user.username,
        leetcodeUsername: member.user.leetcodeUsername,
        currentStreak: member.currentStreak,
        longestStreak: member.longestStreak,
        totalPenalties: member.totalPenalties,
        completedDays,
        totalDays,
        completionRate: completionRate.toFixed(2),
      };
    }),
  );

  res.status(200).json({
    success: true,
    data: leaderboard,
  });
});

/**
 * Get today's status across all challenges
 * GET /api/dashboard/today
 */
const getTodayStatus = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get all active memberships
  const memberships = await prisma.challengeMember.findMany({
    where: {
      userId,
      isActive: true,
      challenge: {
        status: "ACTIVE",
      },
    },
    include: {
      challenge: {
        select: {
          id: true,
          name: true,
          minSubmissionsPerDay: true,
        },
      },
    },
  });

  // Get today's results
  const todayStatuses = await Promise.all(
    memberships.map(async (membership) => {
      const result = await prisma.dailyResult.findUnique({
        where: {
          challengeId_memberId_date: {
            challengeId: membership.challengeId,
            memberId: membership.id,
            date: today,
          },
        },
      });

      return {
        challengeId: membership.challenge.id,
        challengeName: membership.challenge.name,
        requiredSubmissions: membership.challenge.minSubmissionsPerDay,
        status: result
          ? {
              completed: result.completed,
              submissionsCount: result.submissionsCount,
              problemsSolved: result.problemsSolved,
              evaluatedAt: result.evaluatedAt,
            }
          : null,
      };
    }),
  );

  res.status(200).json({
    success: true,
    data: {
      date: today,
      challenges: todayStatuses,
    },
  });
});

/**
 * Get user's activity heatmap data
 * GET /api/dashboard/activity-heatmap
 */
const getActivityHeatmap = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const activityData = await statsService.getUserActivityHeatmap(userId);

  res.status(200).json({
    success: true,
    data: activityData,
  });
});

/**
 * Get user's comprehensive stats
 * GET /api/dashboard/stats
 */
const getStats = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const stats = await statsService.getUserStats(userId);

  res.status(200).json({
    success: true,
    data: stats,
  });
});

/**
 * Get user's submission chart data
 * GET /api/dashboard/submission-chart
 */
const getSubmissionChart = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const chartData = await statsService.getUserSubmissionChart(userId);

  res.status(200).json({
    success: true,
    data: chartData,
  });
});

/**
 * Get pending invites for the current user
 * GET /api/dashboard/invites
 */
const getDashboardInvites = asyncHandler(async (req, res) => {
  const invites = await inviteService.getPendingInvites(req.user.id);

  res.status(200).json({
    success: true,
    data: invites,
  });
});

module.exports = {
  getDashboard,
  getChallengeProgress,
  getChallengeLeaderboard,
  getTodayStatus,
  getActivityHeatmap,
  getStats,
  getSubmissionChart,
  getDashboardInvites,
};
