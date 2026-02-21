const { prisma } = require("../config/prisma");
const { AppError } = require("../middlewares/error.middleware");
const logger = require("../utils/logger");

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
    visibility,
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

  // Validate visibility
  const validVisibilities = ["PUBLIC", "PRIVATE"];
  const challengeVisibility = visibility || "PUBLIC";
  if (!validVisibilities.includes(challengeVisibility)) {
    throw new AppError(
      `Invalid visibility: ${challengeVisibility}. Must be PUBLIC or PRIVATE`,
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
      visibility: challengeVisibility,
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
    `Challenge created: ${challenge.name} by ${challenge.owner.username} (${challengeVisibility})`
  );

  return challenge;
};

/**
 * Get challenge by ID
 * @param {string} challengeId - Challenge ID
 * @param {string} userId - Requesting user ID (optional)
 * @returns {Object} Challenge details
 * @throws {AppError} If challenge is not found or access is denied due to visibility
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

  // Check visibility rules
  // If challenge is PRIVATE, only owner and accepted members can view it
  if (challenge.visibility === "PRIVATE") {
    const isOwner = userId && challenge.ownerId === userId;
    const isMember = userId && challenge.members.some((m) => m.userId === userId);

    if (!isOwner && !isMember) {
      throw new AppError("This private challenge is not accessible to you", 403);
    }
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

  // Determine the query based on owned filter
  let query;

  if (owned === "true") {
    // User owns the challenge
    where.ownerId = userId;
    query = prisma.challenge.findMany({
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
  } else {
    // User is a member of the challenge
    // This query returns challenges where:
    // 1. User is a member (regardless of visibility)
    // 2. All public challenges
    where.OR = [
      {
        members: {
          some: {
            userId,
          },
        },
      },
      {
        visibility: "PUBLIC",
      },
    ];

    query = prisma.challenge.findMany({
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
  }

  const challenges = await query;

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

module.exports = {
  createChallenge,
  getChallengeById,
  joinChallenge,
  getUserChallenges,
  updateChallengeStatus,
};
