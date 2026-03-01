const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { prisma } = require("../config/prisma");
const { config } = require("../config/env");
const {
  generateToken,
  decodeToken,
  createPasswordVersion,
} = require("../utils/jwt");
const { AppError } = require("../middlewares/error.middleware");
const logger = require("../utils/logger");
const { logAudit } = require("../utils/auditLogger");
const { sendWelcomeEmail, sendPasswordResetEmail } = require("./email.service");

const MIN_PASSWORD_LENGTH = 6;
const crypto = require('crypto');
/**
 * Register a new user
 */
const register = async (userData) => {
  const { email, username, password, leetcodeUsername } = userData;

  // Check if user already exists
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ email }, { username }],
    },
  });

  if (existingUser) {
    if (existingUser.email === email) {
      throw new AppError("Email already registered", 400);
    }
    if (existingUser.username === username) {
      throw new AppError("Username already taken", 400);
    }
  }


  const hashedPassword = await bcrypt.hash(password, 12);

  const verificationToken = crypto.randomBytes(32).toString("hex");
  const tokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  const user = await prisma.user.create({
    data: {
      email,
      username,
      password: hashedPassword,
      leetcodeUsername: leetcodeUsername || null,
      isEmailVerified: false,
      emailVerificationToken: verificationToken,
      emailVerificationExpires: tokenExpiry,
    },
  });

  // Generate JWT token
  const token = generateToken({
    userId: user.id,
    pwdv: createPasswordVersion(hashedPassword),
  });

  logger.info(`New user registered: ${user.username} (${user.email})`);

  sendVerificationEmail(
    user.email,
    user.username,
    verificationToken
  ).catch((err) => {
    logger.error(`Failed to send verification email: ${err.message}`);
  });

  return {
    user,
    message: "Registration successful. Please verify your email.",
  };
};
// VerifyEmail
const verifyEmail = async (token) => {
  const user = await prisma.user.findFirst({
    where: {
      emailVerificationToken: token,
      emailVerificationExpires: {
        gte: new Date(),
      },
    },
  });

  if (!user) {
    throw new AppError("Invalid or expired verification token", 400);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      isEmailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpires: null,
    },
  });
  
  sendWelcomeEmail(user.email, user.username).catch((err) => {
    logger.error(`Failed to send welcome email: ${err.message}`);
  });
  
  logger.info(`Email verified for user: ${user.username}`);

  return { message: "Email verified successfully" };
};

/**
 * Login user
 */
const login = async (emailOrUsername, password) => {
  // Find user by email OR username
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: emailOrUsername }, { username: emailOrUsername }],
    },
  });

  if (!user) {
    throw new AppError("Invalid credentials", 401);
  }

  // Compare password
  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw new AppError("Invalid credentials", 401);
  }

  // Generate JWT token
  const token = generateToken({
    userId: user.id,
    pwdv: createPasswordVersion(user.password),
  });

  logger.info(`User logged in: ${user.username}`);

  await logAudit("USER_LOGIN", user.id, { username: user.username });

  return {
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      leetcodeUsername: user.leetcodeUsername,
      createdAt: user.createdAt,
    },
    token,
  };
};

/**
 * Get user profile
 */
const getProfile = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      username: true,
      leetcodeUsername: true,
      createdAt: true,
      _count: {
        select: {
          ownedChallenges: true,
          memberships: true,
        },
      },
    },
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  return user;
};

/**
 * Update user profile
 */
const updateProfile = async (userId, updateData) => {
  const { leetcodeUsername, currentPassword, newPassword } = updateData;

  // If password change requested
  if (newPassword) {
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      throw new AppError(
        `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
        400
      );
    }

    if (!currentPassword) {
      throw new AppError("Current password is required", 400);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError("User not found", 404);
    }

    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );

    if (!isPasswordValid) {
      throw new AppError("Current password is incorrect", 401);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        leetcodeUsername:
          leetcodeUsername !== undefined ? leetcodeUsername : undefined,
      },
    });

    logger.info(`User profile updated: ${updatedUser.username}`);

    await logAudit("PASSWORD_CHANGED", userId, {
      username: updatedUser.username,
    });

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      username: updatedUser.username,
      leetcodeUsername: updatedUser.leetcodeUsername,
      updatedAt: updatedUser.updatedAt,
    };
  }

  // Update without password change
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      leetcodeUsername:
        leetcodeUsername !== undefined ? leetcodeUsername : undefined,
    },
  });

  logger.info(`User profile updated: ${updatedUser.username}`);

  return {
    id: updatedUser.id,
    email: updatedUser.email,
    username: updatedUser.username,
    leetcodeUsername: updatedUser.leetcodeUsername,
    updatedAt: updatedUser.updatedAt,
  };
};

/**
 * Request password reset email
 * @param {string} email - User email
 * @returns {Object} Generic response
 */
const forgotPassword = async (email) => {
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      username: true,
    },
  });

  if (!user) {
    logger.info(`Password reset requested for non-existent email: ${email}`);
    return {
      message:
        "If an account with that email exists, a password reset link has been sent.",
    };
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expiryDate = new Date(
    Date.now() + config.passwordResetTokenExpiryMinutes * 60 * 1000,
  );

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordResetTokenHash: tokenHash,
      passwordResetTokenExpiry: expiryDate,
    },
  });

  const resetLink = `${config.appBaseUrl}/reset-password?token=${rawToken}`;

  const emailResult = await sendPasswordResetEmail(
    user.email,
    user.username,
    resetLink,
    config.passwordResetTokenExpiryMinutes,
  );

  if (!emailResult.success) {
    logger.error(
      `Password reset email failed for ${user.email}: ${emailResult.reason}`,
    );
  }

  return {
    message:
      "If an account with that email exists, a password reset link has been sent.",
  };
};

/**
 * Reset user password using token
 * @param {string} token - Raw reset token
 * @param {string} newPassword - New password
 * @returns {Object} Success message
 */
const resetPassword = async (token, newPassword) => {
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const user = await prisma.user.findFirst({
    where: {
      passwordResetTokenHash: tokenHash,
      passwordResetTokenExpiry: {
        gt: new Date(),
      },
    },
    select: {
      id: true,
      username: true,
    },
  });

  if (!user) {
    throw new AppError("Invalid or expired reset token", 400);
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      passwordResetTokenHash: null,
      passwordResetTokenExpiry: null,
    },
  });

  logger.info(`Password reset successful for user: ${user.username}`);

  return {
    message: "Password reset successful",
  };
};

/**
 * Blacklist a JWT token
 * @param {string} token - JWT token to blacklist
 * @param {string} userId - User ID for ownership verification
 * @throws {Error} If token is invalid or cannot be decoded
 */
const blacklistToken = async (token, userId) => {
  try {
    // Decode token to get expiry time
    const decoded = decodeToken(token);

    if (!decoded || !decoded.exp) {
      throw new AppError("Invalid token", 400);
    }

    // Verify token ownership - ensure user can only blacklist their own tokens
    if (decoded.userId !== userId) {
      throw new AppError("Token ownership mismatch", 403);
    }

    // Convert Unix timestamp (seconds) to milliseconds and then to Date
    const expiresAt = new Date(decoded.exp * 1000);

    // Add token to blacklist using upsert for idempotent logout
    await prisma.tokenBlacklist.upsert({
      where: { token },
      update: {}, // No update needed if already exists
      create: {
        token,
        expiresAt,
      },
    });

    logger.info(`Token blacklisted for user: ${decoded.userId}`);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error(`Error blacklisting token: ${error.message}`);
    throw new AppError("Failed to logout", 500);
  }
};

/**
 * Check if a token is blacklisted
 * @param {string} token - JWT token to check
 * @returns {boolean} True if token is blacklisted, false otherwise
 */
const isTokenBlacklisted = async (token) => {
  try {
    const blacklistedToken = await prisma.tokenBlacklist.findUnique({
      where: { token },
    });

    return !!blacklistedToken;
  } catch (error) {
    logger.error(`Error checking token blacklist: ${error.message}`);
    return false;
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  verifyEmail,
};
