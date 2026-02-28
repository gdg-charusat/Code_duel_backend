const { prisma } = require("../config/prisma");
const { asyncHandler } = require("../middlewares/error.middleware");
const { AppError } = require("../middlewares/error.middleware");
const logger = require("../utils/logger");

/**
 * Get all users (admin only)
 * GET /api/admin/users
 */
const getAllUsers = asyncHandler(async (req, res) => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      username: true,
      role: true,
      leetcodeUsername: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          ownedChallenges: true,
          memberships: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  res.status(200).json({
    success: true,
    data: users,
  });
});

/**
 * Update a user's role (admin only)
 * PATCH /api/admin/users/:id/role
 */
const updateUserRole = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  const validRoles = ["USER", "ADMIN"];
  if (!role || !validRoles.includes(role)) {
    throw new AppError(`Role must be one of: ${validRoles.join(", ")}`, 400);
  }

  // Prevent admin from demoting themselves
  if (id === req.user.id && role !== "ADMIN") {
    throw new AppError("Admins cannot demote themselves", 403);
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new AppError("User not found", 404);
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { role },
    select: {
      id: true,
      email: true,
      username: true,
      role: true,
      updatedAt: true,
    },
  });

  logger.info(
    `Admin ${req.user.username} changed role of user ${updated.username} to ${role}`
  );

  res.status(200).json({
    success: true,
    message: `User role updated to ${role}`,
    data: updated,
  });
});

/**
 * Delete a user (admin only)
 * DELETE /api/admin/users/:id
 */
const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (id === req.user.id) {
    throw new AppError("Admins cannot delete their own account", 403);
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new AppError("User not found", 404);
  }

  await prisma.user.delete({ where: { id } });

  logger.info(
    `Admin ${req.user.username} deleted user ${user.username} (${user.email})`
  );

  res.status(200).json({
    success: true,
    message: "User deleted successfully",
  });
});

/**
 * Get all challenges (admin only – no ownership filter)
 * GET /api/admin/challenges
 */
const getAllChallenges = asyncHandler(async (req, res) => {
  const { status } = req.query;

  const where = {};
  if (status) {
    where.status = status.toUpperCase();
  }

  const challenges = await prisma.challenge.findMany({
    where,
    include: {
      owner: {
        select: { id: true, username: true, email: true },
      },
      _count: {
        select: { members: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  res.status(200).json({
    success: true,
    data: challenges,
  });
});

/**
 * Delete any challenge (admin only)
 * DELETE /api/admin/challenges/:id
 */
const deleteChallenge = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const challenge = await prisma.challenge.findUnique({ where: { id } });
  if (!challenge) {
    throw new AppError("Challenge not found", 404);
  }

  await prisma.challenge.delete({ where: { id } });

  logger.info(
    `Admin ${req.user.username} deleted challenge "${challenge.name}" (${id})`
  );

  res.status(200).json({
    success: true,
    message: "Challenge deleted successfully",
  });
});

/**
 * Get aggregated platform stats (admin only)
 * GET /api/admin/stats
 */
const getPlatformStats = asyncHandler(async (req, res) => {
  const [
    totalUsers,
    totalChallenges,
    activeChallenges,
    totalMemberships,
    adminCount,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.challenge.count(),
    prisma.challenge.count({ where: { status: "ACTIVE" } }),
    prisma.challengeMember.count(),
    prisma.user.count({ where: { role: "ADMIN" } }),
  ]);

  res.status(200).json({
    success: true,
    data: {
      users: {
        total: totalUsers,
        admins: adminCount,
        regular: totalUsers - adminCount,
      },
      challenges: {
        total: totalChallenges,
        active: activeChallenges,
      },
      memberships: {
        total: totalMemberships,
      },
    },
  });
});

module.exports = {
  getAllUsers,
  updateUserRole,
  deleteUser,
  getAllChallenges,
  deleteChallenge,
  getPlatformStats,
};


/**
 * Get all users (admin only)
 * GET /api/admin/users
 */
const getAllUsers = asyncHandler(async (req, res) => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      username: true,
      role: true,
      leetcodeUsername: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          ownedChallenges: true,
          memberships: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  res.status(200).json({
    success: true,
    data: users,
  });
});

/**
 * Update a user's role (admin only)
 * PATCH /api/admin/users/:id/role
 */
const updateUserRole = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  const validRoles = ["USER", "ADMIN"];
  if (!role || !validRoles.includes(role)) {
    throw new AppError(`Role must be one of: ${validRoles.join(", ")}`, 400);
  }

  // Prevent admin from demoting themselves
  if (id === req.user.id && role !== "ADMIN") {
    throw new AppError("Admins cannot demote themselves", 403);
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new AppError("User not found", 404);
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { role },
    select: {
      id: true,
      email: true,
      username: true,
      role: true,
      updatedAt: true,
    },
  });

  logger.info(
    `Admin ${req.user.username} changed role of user ${updated.username} to ${role}`
  );

  res.status(200).json({
    success: true,
    message: `User role updated to ${role}`,
    data: updated,
  });
});

/**
 * Delete a user (admin only)
 * DELETE /api/admin/users/:id
 */
const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (id === req.user.id) {
    throw new AppError("Admins cannot delete their own account", 403);
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new AppError("User not found", 404);
  }

  await prisma.user.delete({ where: { id } });

  logger.info(
    `Admin ${req.user.username} deleted user ${user.username} (${user.email})`
  );

  res.status(200).json({
    success: true,
    message: "User deleted successfully",
  });
});

/**
 * Get all challenges (admin only — no ownership filter)
 * GET /api/admin/challenges
 */
const getAllChallenges = asyncHandler(async (req, res) => {
  const { status } = req.query;

  const where = {};
  if (status) {
    where.status = status.toUpperCase();
  }

  const challenges = await prisma.challenge.findMany({
    where,
    include: {
      owner: {
        select: { id: true, username: true, email: true },
      },
      _count: {
        select: { members: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  res.status(200).json({
    success: true,
    data: challenges,
  });
});

/**
 * Delete any challenge (admin only)
 * DELETE /api/admin/challenges/:id
 */
const deleteChallenge = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const challenge = await prisma.challenge.findUnique({ where: { id } });
  if (!challenge) {
    throw new AppError("Challenge not found", 404);
  }

  await prisma.challenge.delete({ where: { id } });

  logger.info(
    `Admin ${req.user.username} deleted challenge "${challenge.name}" (${id})`
  );

  res.status(200).json({
    success: true,
    message: "Challenge deleted successfully",
  });
});

/**
 * Get aggregated platform stats (admin only)
 * GET /api/admin/stats
 */
const getPlatformStats = asyncHandler(async (req, res) => {
  const [
    totalUsers,
    totalChallenges,
    activeChallenges,
    totalMemberships,
    adminCount,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.challenge.count(),
    prisma.challenge.count({ where: { status: "ACTIVE" } }),
    prisma.challengeMember.count(),
    prisma.user.count({ where: { role: "ADMIN" } }),
  ]);

  res.status(200).json({
    success: true,
    data: {
      users: {
        total: totalUsers,
        admins: adminCount,
        regular: totalUsers - adminCount,
      },
      challenges: {
        total: totalChallenges,
        active: activeChallenges,
      },
      memberships: {
        total: totalMemberships,
      },
    },
  });
});

module.exports = {
  getAllUsers,
  updateUserRole,
  deleteUser,
  getAllChallenges,
  deleteChallenge,
  getPlatformStats,
};
