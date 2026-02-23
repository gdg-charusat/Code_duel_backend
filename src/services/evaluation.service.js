const { prisma } = require("../config/prisma");
const leetcodeService = require("./leetcode.service");
const penaltyService = require("./penalty.service");
const logger = require("../utils/logger");

/**
 * Run daily evaluation for all active challenges
 * This is the main function called by the cron job
 */
const runDailyEvaluation = async () => {
  const evaluationDate = new Date();
  evaluationDate.setHours(0, 0, 0, 0); // Start of day

  logger.info(
    `Starting daily evaluation for date: ${evaluationDate.toISOString()}`
  );

  try {
    // Get all active challenges
    const activeChallenges = await prisma.challenge.findMany({
      where: {
        status: "ACTIVE",
        startDate: { lte: new Date() },
        endDate: { gte: new Date() },
      },
      include: {
        members: {
          where: { isActive: true },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                leetcodeUsername: true,
              },
            },
          },
        },
      },
    });

    logger.info(
      `Found ${activeChallenges.length} active challenges to evaluate`
    );

    // Evaluate each challenge
    for (const challenge of activeChallenges) {
      try {
        await evaluateChallenge(challenge, evaluationDate);
      } catch (error) {
        logger.error(`Failed to evaluate challenge ${challenge.id}:`, error);
        // Continue with other challenges even if one fails
      }
    }

    logger.info("Daily evaluation completed successfully");
  } catch (error) {
    logger.error("Daily evaluation failed:", error);
    throw error;
  }
};

/**
 * Evaluate a single challenge for a specific date
 * @param {Object} challenge - Challenge object with members
 * @param {Date} evaluationDate - Date to evaluate
 */
const evaluateChallenge = async (challenge, evaluationDate) => {
  logger.info(`Evaluating challenge: ${challenge.name} (${challenge.id})`);

  for (const member of challenge.members) {
    try {
      await evaluateMember(challenge, member, evaluationDate);
    } catch (error) {
      logger.error(
        `Failed to evaluate member ${member.user.username} for challenge ${challenge.name}:`,
        error
      );
      // Continue with other members
    }
  }
};

/**
 * Evaluate a single member for a specific date
 * @param {Object} challenge - Challenge object
 * @param {Object} member - Challenge member object
 * @param {Date} evaluationDate - Date to evaluate
 */
const evaluateMember = async (challenge, member, evaluationDate) => {
  const user = member.user;

  // Guard: skip if this member+challenge+date was already evaluated
  const existingResult = await prisma.dailyResult.findUnique({
    where: {
      challengeId_memberId_date: {
        challengeId: challenge.id,
        memberId: member.id,
        date: evaluationDate,
      },
    },
  });

  if (existingResult) {
    logger.info(
      `Skipping ${user.username} — already evaluated for ${evaluationDate.toISOString().split('T')[0]}`
    );
    return;
  }

  // Check if user has LeetCode username
  if (!user.leetcodeUsername) {
    logger.warn(`User ${user.username} doesn't have a LeetCode username set`);

    // Create a failed result
    await createDailyResult(
      challenge.id,
      member.id,
      evaluationDate,
      false,
      0,
      [],
      {
        reason: "No LeetCode username configured",
      }
    );

    // Apply penalty
    await applyPenaltyForFailure(
      challenge,
      member,
      evaluationDate,
      "No LeetCode username configured"
    );
    return;
  }

  // Fetch LeetCode session (if stored)
  const sessionData = await leetcodeService.getUserSession(user.id);

  // Fetch submissions for the date
  let submissions;
  try {
    submissions = await leetcodeService.fetchSubmissionsForDate(
      user.leetcodeUsername,
      evaluationDate,
      sessionData
    );
  } catch (error) {
    logger.error(
      `Failed to fetch submissions for ${user.leetcodeUsername}:`,
      error
    );

    // Create a failed result due to API error
    await createDailyResult(
      challenge.id,
      member.id,
      evaluationDate,
      false,
      0,
      [],
      {
        reason: "Failed to fetch submissions from LeetCode",
        error: error.message,
      }
    );

    // Don't apply penalty for API errors
    return;
  }

  // Enrich submissions with metadata (difficulty, etc.)
  const enrichedSubmissions =
    await leetcodeService.enrichSubmissionsWithMetadata(
      submissions,
      sessionData
    );

  // Filter by difficulty if specified
  let filteredSubmissions = enrichedSubmissions;
  if (challenge.difficultyFilter && challenge.difficultyFilter.length > 0) {
    filteredSubmissions = enrichedSubmissions.filter((sub) =>
      challenge.difficultyFilter.includes(sub.difficulty)
    );

    logger.debug(
      `Filtered ${enrichedSubmissions.length} submissions to ${
        filteredSubmissions.length
      } matching difficulties: ${challenge.difficultyFilter.join(", ")}`
    );
  }

  // Extract unique problems if constraint is enabled
  const problemsSolved = challenge.uniqueProblemConstraint
    ? [...new Set(filteredSubmissions.map((s) => s.titleSlug))]
    : filteredSubmissions.map((s) => s.titleSlug);

  const submissionsCount = problemsSolved.length;

  // Check if member met the requirement
  const completed = submissionsCount >= challenge.minSubmissionsPerDay;

  // Create daily result
  await createDailyResult(
    challenge.id,
    member.id,
    evaluationDate,
    completed,
    submissionsCount,
    problemsSolved,
    {
      submissions: filteredSubmissions.map((s) => ({
        title: s.title,
        titleSlug: s.titleSlug,
        difficulty: s.difficulty,
        timestamp: s.timestamp,
        language: s.language,
      })),
    }
  );

  // Update streak
  await updateStreak(member.id, completed);

  // Apply penalty if failed
  if (!completed) {
    await applyPenaltyForFailure(
      challenge,
      member,
      evaluationDate,
      `Failed to meet daily requirement: ${submissionsCount}/${challenge.minSubmissionsPerDay} submissions`
    );
  }

  logger.info(
    `Member ${user.username} evaluation: ${
      completed ? "PASSED" : "FAILED"
    } (${submissionsCount}/${challenge.minSubmissionsPerDay})`
  );
};

/**
 * Create or update a daily result record (upsert to handle duplicate runs)
 */
const createDailyResult = async (
  challengeId,
  memberId,
  date,
  completed,
  submissionsCount,
  problemsSolved,
  metadata = {}
) => {
  return await prisma.dailyResult.upsert({
    where: {
      challengeId_memberId_date: {
        challengeId,
        memberId,
        date,
      },
    },
    update: {
      completed,
      submissionsCount,
      problemsSolved,
      evaluatedAt: new Date(),
      metadata,
    },
    create: {
      challengeId,
      memberId,
      date,
      completed,
      submissionsCount,
      problemsSolved,
      evaluatedAt: new Date(),
      metadata,
    },
  });
};

/**
 * Update member's streak based on completion status
 */
const updateStreak = async (memberId, completed) => {
  const member = await prisma.challengeMember.findUnique({
    where: { id: memberId },
  });

  if (completed) {
    // Increment current streak
    const newStreak = member.currentStreak + 1;
    const newLongest = Math.max(newStreak, member.longestStreak);

    await prisma.challengeMember.update({
      where: { id: memberId },
      data: {
        currentStreak: newStreak,
        longestStreak: newLongest,
      },
    });
  } else {
    // Reset current streak
    await prisma.challengeMember.update({
      where: { id: memberId },
      data: {
        currentStreak: 0,
      },
    });
  }
};

/**
 * Apply penalty for failing daily requirement
 */
const applyPenaltyForFailure = async (challenge, member, date, reason) => {
  if (challenge.penaltyAmount > 0) {
    await penaltyService.applyPenalty(
      member.id,
      challenge.penaltyAmount,
      reason,
      date
    );
  }
};

/**
 * Get daily results for a member
 * @param {string} memberId - Challenge member ID
 * @param {number} limit - Number of results to fetch
 * @returns {Array} Daily results
 */
const getMemberDailyResults = async (memberId, limit = 30) => {
  return await prisma.dailyResult.findMany({
    where: { memberId },
    orderBy: { date: "desc" },
    take: limit,
  });
};

/**
 * Get today's status for a member
 * @param {string} memberId - Challenge member ID
 * @returns {Object|null} Today's daily result or null
 */
const getTodayStatus = async (memberId) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return await prisma.dailyResult.findUnique({
    where: {
      challengeId_memberId_date: {
        challengeId: (
          await prisma.challengeMember.findUnique({ where: { id: memberId } })
        ).challengeId,
        memberId,
        date: today,
      },
    },
  });
};

module.exports = {
  runDailyEvaluation,
  evaluateChallenge,
  evaluateMember,
  getMemberDailyResults,
  getTodayStatus,
};
