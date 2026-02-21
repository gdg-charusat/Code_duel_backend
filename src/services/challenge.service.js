const { prisma } = require("../config/prisma");
const { AppError } = require("../middlewares/error.middleware");
const logger = require("../utils/logger");
// variable so it can be changed accordingly
const STREAK_WEIGHT = 5;

/**
 * Create a new challenge
 * @param {string} userId - Owner user ID
 * @param {Object} challengeData - Challenge details
 * @returns {Object} Created challenge
 */
const createChallenge = async (userId, challengeData) => {
  const {
    name,
    description,
    minSubmissionsPerDay,
    difficultyFilter,
    uniqueProblemConstraint,
    penaltyAmount,
    startDate,
    endDate,
  } = challengeData;

  // Validate dates
  const start = new Date(startDate);
  const end = new Date(endDate);
  const now = new Date();

  if (start < now) {
    throw new AppError("Start date must be in the future", 400);
  }

  if (end <= start) {
    throw new AppError("End date must be after start date", 400);
  }

  // Validate difficulty filter
  const validDifficulties = ["Easy", "Medium", "Hard"];
  const invalidDifficulties = difficultyFilter.filter(
    (d) => !validDifficulties.includes(d)
  );

  if (invalidDifficulties.length > 0) {
    throw new AppError(
      `Invalid difficulty levels: ${invalidDifficulties.join(", ")}`,
      400
    );
  }

  // Create challenge
  const challenge = await prisma.challenge.create({
    data: {
      name,
      description: description || null,
      ownerId: userId,
      minSubmissionsPerDay: minSubmissionsPerDay || 1,
      difficultyFilter,
      uniqueProblemConstraint: uniqueProblemConstraint !== false,
      penaltyAmount: penaltyAmount || 0,
      startDate: start,
      endDate: end,
      status: "PENDING",
    },
    include: {
      owner: {
        select: {
          id: true,
          username: true,
          email: true,
        },
      },
    },
  });

  // Automatically add creator as a member
  await prisma.challengeMember.create({
    data: {
      challengeId: challenge.id,
      userId,
    },
  });

  logger.info(
    `Challenge created: ${challenge.name} by ${challenge.owner.username}`
  );

  return challenge;
};

/**
 * Get challenge by ID
 * @param {string} challengeId - Challenge ID
 * @param {string} userId - Requesting user ID (optional)
 * @returns {Object} Challenge details
 */
const getChallengeById = async (challengeId, userId = null) => {
  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
    include: {
      owner: {
        select: {
          id: true,
          username: true,
          email: true,
        },
      },
      members: {
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
      _count: {
        select: {
          members: true,
          dailyResults: true,
        },
      },
    },
  });

  if (!challenge) {
    throw new AppError("Challenge not found", 404);
  }

  return challenge;
};

/**
 * Join a challenge
 * @param {string} userId - User ID
 * @param {string} challengeId - Challenge ID
 * @returns {Object} Challenge membership
 */
const joinChallenge = async (userId, challengeId) => {
  // Check if challenge exists
  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
  });

  if (!challenge) {
    throw new AppError("Challenge not found", 404);
  }

  // Check if challenge has started
  if (challenge.status === "COMPLETED" || challenge.status === "CANCELLED") {
    throw new AppError("Cannot join a completed or cancelled challenge", 400);
  }

  // Check if already a member
  const existingMembership = await prisma.challengeMember.findUnique({
    where: {
      challengeId_userId: {
        challengeId,
        userId,
      },
    },
  });

  if (existingMembership) {
    throw new AppError("Already a member of this challenge", 400);
  }

  // Create membership
  const membership = await prisma.challengeMember.create({
    data: {
      challengeId,
      userId,
    },
    include: {
      challenge: {
        select: {
          id: true,
          name: true,
          startDate: true,
          endDate: true,
        },
      },
      user: {
        select: {
          id: true,
          username: true,
        },
      },
    },
  });

  logger.info(
    `User ${membership.user.username} joined challenge: ${membership.challenge.name}`
  );

  return membership;
};

/**
 * Get all challenges for a user
 * @param {string} userId - User ID
 * @param {Object} filters - Filter options (status, owned)
 * @returns {Array} List of challenges
 */
const getUserChallenges = async (userId, filters = {}) => {
  const { status, owned } = filters;

  const where = {};

  // Filter by status
  if (status) {
    where.status = status;
  }

  // Filter by owned vs joined
  if (owned === "true") {
    where.ownerId = userId;
  } else {
    where.members = {
      some: {
        userId,
      },
    };
  }

  const challenges = await prisma.challenge.findMany({
    where,
    include: {
      owner: {
        select: {
          id: true,
          username: true,
        },
      },
      _count: {
        select: {
          members: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return challenges;
};

/**
 * Update challenge status (owner only)
 * @param {string} challengeId - Challenge ID
 * @param {string} userId - User ID (must be owner)
 * @param {string} newStatus - New status
 * @returns {Object} Updated challenge
 */
const updateChallengeStatus = async (challengeId, userId, newStatus) => {
  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
  });

  if (!challenge) {
    throw new AppError("Challenge not found", 404);
  }

  if (challenge.ownerId !== userId) {
    throw new AppError("Only the challenge owner can update status", 403);
  }

  const validStatuses = ["PENDING", "ACTIVE", "COMPLETED", "CANCELLED"];
  if (!validStatuses.includes(newStatus)) {
    throw new AppError(`Invalid status: ${newStatus}`, 400);
  }

  const updatedChallenge = await prisma.challenge.update({
    where: { id: challengeId },
    data: { status: newStatus },
    include: {
      owner: {
        select: {
          id: true,
          username: true,
        },
      },
    },
  });

  logger.info(`Challenge ${challenge.name} status updated to ${newStatus}`);

  return updatedChallenge;
};

/**
 * Get all the users for the active challenge 
 * and sort 
 * @param {string} challengeId - Challenge ID
 * @param {string} userId - User ID
 * @return {Array} All the users with user relevant data
 */
const getLeaderboard = async (challengeId, userId) => {
  const challenge = await prisma.challenge.findUnique({
    where: {
      id: challengeId
    }
  })

  if (!challenge) {
    throw new AppError("Challenge not found", 404)
  }

  if (challenge.status === "PENDING") {
    throw new AppError("Leaderboard not available for pending challenge", 400)
  }

  if (challenge.status === "CANCELLED") {
    throw new AppError("Leaderboard not available for cancelled challenge", 400);
  }


  const membership = await prisma.challengeMember.findUnique({
    where: {
      challengeId_userId: {
        challengeId,
        userId
      }
    }
  });


  if (!membership) {
    throw new AppError("You are not a member of this challenge", 403)
  }


  // get all members from the certain challenge
  const members = await prisma.ChallengeMember.findMany({
    where: {
      challengeId,
      isActive: true
    }, include: {
      user: {
        select: {
          id: true,
          username: true,
          leetcodeUsername: true
        }
      },
      dailyResults: {
        select: {
          problemsSolved: true
        }
      }
    }
  })

  // single value array so we can calculate based on number of problems solved
  const leaderboard = members.map(member => {
    const totalSolved = member.dailyResults.reduce(
      (acc, day) => acc + day.problemsSolved.length,
      0
    );

    const score = totalSolved + member.currentStreak * STREAK_WEIGHT - member.totalPenalties;

    return {
      userId: member.user.id,
      username: member.user.username,
      leetcodeUsername: member.user.leetcodeUsername,
      totalSolved,
      currentStreak: member.currentStreak,
      totalPenalties: member.totalPenalties,
      score
    };
  });

  leaderboard.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return b.totalSolved - a.totalSolved;
  });
  let currentRank = 1;

  const rankedLeaderboard = leaderboard.map((user, index) => {
    if (index > 0 && (user.score < leaderboard[index - 1].score || user.totalSolved < leaderboard[index - 1].totalSolved)) {
      currentRank = index + 1;
    }

    return {
      rank: currentRank,
      ...user
    };
  });

  return rankedLeaderboard
}

module.exports = {
  createChallenge,
  getChallengeById,
  joinChallenge,
  getUserChallenges,
  updateChallengeStatus,
  getLeaderboard
};
