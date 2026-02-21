const { prisma } = require("../config/prisma");
const { AppError } = require("../middlewares/error.middleware");
const logger = require("../utils/logger");

/**
 * Send an invite to a user for a challenge
 * @param {string} inviterId - The user sending the invite (must be challenge owner)
 * @param {string} challengeId - The challenge ID
 * @param {string} inviteeUsername - Username of the user to invite
 * @returns {Object} Created invite
 */
const sendInvite = async (inviterId, challengeId, inviteeUsername) => {
  // Fetch challenge and verify ownership
  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
  });

  if (!challenge) {
    throw new AppError("Challenge not found", 404);
  }

  if (challenge.ownerId !== inviterId) {
    throw new AppError("Only the challenge owner can send invites", 403);
  }

  if (challenge.status === "COMPLETED" || challenge.status === "CANCELLED") {
    throw new AppError(
      "Cannot send invites for a completed or cancelled challenge",
      400,
    );
  }

  // Find invitee by username
  const invitee = await prisma.user.findUnique({
    where: { username: inviteeUsername },
  });

  if (!invitee) {
    throw new AppError(`User '${inviteeUsername}' not found`, 404);
  }

  if (invitee.id === inviterId) {
    throw new AppError("You cannot invite yourself", 400);
  }

  // Check if invitee is already a member
  const existingMembership = await prisma.challengeMember.findUnique({
    where: {
      challengeId_userId: {
        challengeId,
        userId: invitee.id,
      },
    },
  });

  if (existingMembership) {
    throw new AppError("User is already a member of this challenge", 400);
  }

  // Check if an invite already exists
  const existingInvite = await prisma.challengeInvite.findUnique({
    where: {
      challengeId_inviteeId: {
        challengeId,
        inviteeId: invitee.id,
      },
    },
  });

  if (existingInvite) {
    if (existingInvite.status === "PENDING") {
      throw new AppError("An invite is already pending for this user", 400);
    }
    if (existingInvite.status === "ACCEPTED") {
      throw new AppError("User has already accepted an invite", 400);
    }
    // If previously rejected, allow re-invite by updating the existing record
    const updatedInvite = await prisma.challengeInvite.update({
      where: { id: existingInvite.id },
      data: { status: "PENDING" },
      include: {
        challenge: {
          select: { id: true, name: true },
        },
        invitee: {
          select: { id: true, username: true, email: true },
        },
        inviter: {
          select: { id: true, username: true },
        },
      },
    });

    logger.info(
      `Re-invite sent to ${invitee.username} for challenge: ${challenge.name}`,
    );

    return updatedInvite;
  }

  // Create the invite
  const invite = await prisma.challengeInvite.create({
    data: {
      challengeId,
      inviterId,
      inviteeId: invitee.id,
    },
    include: {
      challenge: {
        select: { id: true, name: true },
      },
      invitee: {
        select: { id: true, username: true, email: true },
      },
      inviter: {
        select: { id: true, username: true },
      },
    },
  });

  logger.info(
    `Invite sent to ${invitee.username} for challenge: ${challenge.name}`,
  );

  return invite;
};

/**
 * Accept an invite
 * @param {string} userId - The user accepting the invite
 * @param {string} challengeId - The challenge ID
 * @returns {Object} Created membership
 */
const acceptInvite = async (userId, challengeId) => {
  const invite = await prisma.challengeInvite.findUnique({
    where: {
      challengeId_inviteeId: {
        challengeId,
        inviteeId: userId,
      },
    },
    include: {
      challenge: {
        select: { id: true, name: true, status: true },
      },
    },
  });

  if (!invite) {
    throw new AppError("Invite not found", 404);
  }

  if (invite.status !== "PENDING") {
    throw new AppError(
      `Invite has already been ${invite.status.toLowerCase()}`,
      400,
    );
  }

  if (
    invite.challenge.status === "COMPLETED" ||
    invite.challenge.status === "CANCELLED"
  ) {
    throw new AppError(
      "Cannot accept invite for a completed or cancelled challenge",
      400,
    );
  }

  // Use a transaction to update invite status and create membership atomically
  const [updatedInvite, membership] = await prisma.$transaction([
    prisma.challengeInvite.update({
      where: { id: invite.id },
      data: { status: "ACCEPTED" },
    }),
    prisma.challengeMember.create({
      data: {
        challengeId,
        userId,
      },
      include: {
        challenge: {
          select: { id: true, name: true, startDate: true, endDate: true },
        },
        user: {
          select: { id: true, username: true },
        },
      },
    }),
  ]);

  logger.info(
    `User ${membership.user.username} accepted invite and joined challenge: ${membership.challenge.name}`,
  );

  return membership;
};

/**
 * Reject an invite
 * @param {string} userId - The user rejecting the invite
 * @param {string} challengeId - The challenge ID
 * @returns {Object} Updated invite
 */
const rejectInvite = async (userId, challengeId) => {
  const invite = await prisma.challengeInvite.findUnique({
    where: {
      challengeId_inviteeId: {
        challengeId,
        inviteeId: userId,
      },
    },
  });

  if (!invite) {
    throw new AppError("Invite not found", 404);
  }

  if (invite.status !== "PENDING") {
    throw new AppError(
      `Invite has already been ${invite.status.toLowerCase()}`,
      400,
    );
  }

  const updatedInvite = await prisma.challengeInvite.update({
    where: { id: invite.id },
    data: { status: "REJECTED" },
    include: {
      challenge: {
        select: { id: true, name: true },
      },
      inviter: {
        select: { id: true, username: true },
      },
    },
  });

  logger.info(`Invite rejected for challenge: ${updatedInvite.challenge.name}`);

  return updatedInvite;
};

/**
 * Get all pending invites for a user (for dashboard)
 * @param {string} userId - The user ID
 * @returns {Array} List of pending invites
 */
const getPendingInvites = async (userId) => {
  const invites = await prisma.challengeInvite.findMany({
    where: {
      inviteeId: userId,
      status: "PENDING",
    },
    include: {
      challenge: {
        select: {
          id: true,
          name: true,
          description: true,
          startDate: true,
          endDate: true,
          status: true,
          _count: {
            select: { members: true },
          },
        },
      },
      inviter: {
        select: { id: true, username: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return invites;
};

/**
 * Get all invites sent for a challenge (for challenge owner)
 * @param {string} userId - The requesting user ID (must be owner)
 * @param {string} challengeId - The challenge ID
 * @returns {Array} List of invites for the challenge
 */
const getChallengeInvites = async (userId, challengeId) => {
  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
  });

  if (!challenge) {
    throw new AppError("Challenge not found", 404);
  }

  if (challenge.ownerId !== userId) {
    throw new AppError("Only the challenge owner can view sent invites", 403);
  }

  const invites = await prisma.challengeInvite.findMany({
    where: { challengeId },
    include: {
      invitee: {
        select: { id: true, username: true, email: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return invites;
};

module.exports = {
  sendInvite,
  acceptInvite,
  rejectInvite,
  getPendingInvites,
  getChallengeInvites,
};
