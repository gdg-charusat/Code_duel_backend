const bcrypt = require("bcryptjs");
const { prisma } = require("../config/prisma");
const { generateToken, verifyToken } = require("../utils/jwt");
const { AppError } = require("../middlewares/error.middleware");
const logger = require("../utils/logger");
const { sendWelcomeEmail, sendPasswordResetEmail } = require("./email.service");
const jwt = require("jsonwebtoken");
const { config } = require("../config/env");

/**
 * Register a new user
 * @param {Object} userData - User registration data
 * @returns {Object} User object and JWT token
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

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 12);

  // Create user
  const user = await prisma.user.create({
    data: {
      email,
      username,
      password: hashedPassword,
      leetcodeUsername: leetcodeUsername || null,
    },
    select: {
      id: true,
      email: true,
      username: true,
      leetcodeUsername: true,
      createdAt: true,
    },
  });

  // Generate JWT token
  const token = generateToken({ userId: user.id });

  logger.info(`New user registered: ${user.username} (${user.email})`);

  // Send welcome email (non-blocking)
  sendWelcomeEmail(user.email, user.username).catch((err) => {
    logger.error(`Failed to send welcome email: ${err.message}`);
  });

  return {
    user,
    token,
  };
};

/**
 * Login user
 * @param {string} emailOrUsername - Email or username
 * @param {string} password - User password
 * @returns {Object} User object and JWT token
 */
const login = async (emailOrUsername, password) => {
  // Find user by email or username
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: emailOrUsername }, { username: emailOrUsername }],
    },
  });

  if (!user) {
    throw new AppError("Invalid credentials", 401);
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw new AppError("Invalid credentials", 401);
  }

  // Generate JWT token
  const token = generateToken({ userId: user.id });

  logger.info(`User logged in: ${user.username}`);

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
 * @param {string} userId - User ID
 * @returns {Object} User profile
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
 * @param {string} userId - User ID
 * @param {Object} updateData - Data to update
 * @returns {Object} Updated user profile
 */
const updateProfile = async (userId, updateData) => {
  const { leetcodeUsername, currentPassword, newPassword } = updateData;

  // If changing password, verify current password
  if (newPassword) {
    if (!currentPassword) {
      throw new AppError("Current password is required", 400);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!isPasswordValid) {
      throw new AppError("Current password is incorrect", 401);
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        leetcodeUsername:
          leetcodeUsername !== undefined ? leetcodeUsername : undefined,
      },
      select: {
        id: true,
        email: true,
        username: true,
        leetcodeUsername: true,
        updatedAt: true,
      },
    });

    logger.info(`User profile updated: ${updatedUser.username}`);

    return updatedUser;
  }

  // Update without password change
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      leetcodeUsername:
        leetcodeUsername !== undefined ? leetcodeUsername : undefined,
    },
    select: {
      id: true,
      email: true,
      username: true,
      leetcodeUsername: true,
      updatedAt: true,
    },
  });

  logger.info(`User profile updated: ${updatedUser.username}`);

  return updatedUser;
};

/**
 * Request password reset
 * @param {string} email - User email
 * @returns {Object} Message confirming reset email sent
 */
const forgotPassword = async (email) => {
  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email },
  });

  // For security, we don't reveal whether the email exists
  // But we only send email if user exists
  if (!user) {
    // Return success anyway for security
    logger.info(`Password reset requested for non-existent email: ${email}`);
    return {
      message: "If an account exists with this email, you will receive a password reset link.",
    };
  }

  // Generate reset token (expires in 1 hour)
  const resetToken = jwt.sign(
    { userId: user.id, type: "password_reset" },
    config.jwtSecret,
    { expiresIn: "1h" }
  );

  // Store token in database with expiry
  const expiresAt = new Date(Date.now() + 3600000); // 1 hour from now

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      token: resetToken,
      expiresAt,
    },
  });

  // Send reset email
  const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/reset-password?token=${resetToken}`;

  await sendPasswordResetEmail(user.email, user.username, resetUrl).catch((err) => {
    logger.error(`Failed to send password reset email: ${err.message}`);
  });

  logger.info(`Password reset requested for user: ${user.email}`);

  return {
    message: "If an account exists with this email, you will receive a password reset link.",
  };
};

/**
 * Reset password using token
 * @param {string} token - Password reset token
 * @param {string} newPassword - New password
 * @returns {Object} Success message
 */
const resetPassword = async (token, newPassword) => {
  // Verify JWT token
  let decoded;
  try {
    decoded = jwt.verify(token, config.jwtSecret);
  } catch (error) {
    throw new AppError("Invalid or expired reset link", 401);
  }

  // Check if token has the correct type
  if (decoded.type !== "password_reset") {
    throw new AppError("Invalid reset token", 401);
  }

  // Check if token exists in database and hasn't been used
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token },
  });

  if (!resetToken) {
    throw new AppError("Invalid or expired reset link", 401);
  }

  if (resetToken.usedAt) {
    throw new AppError("This reset link has already been used", 401);
  }

  if (resetToken.expiresAt < new Date()) {
    throw new AppError("Reset link has expired", 401);
  }

  if (resetToken.userId !== decoded.userId) {
    throw new AppError("Invalid reset token", 401);
  }

  // Get user
  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  // Hash new password
  const hashedPassword = await bcrypt.hash(newPassword, 12);

  // Update password and mark token as used
  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
    },
    select: {
      id: true,
      email: true,
      username: true,
      leetcodeUsername: true,
    },
  });

  // Mark token as used
  await prisma.passwordResetToken.update({
    where: { token },
    data: {
      usedAt: new Date(),
    },
  });

  logger.info(`Password reset successful for user: ${user.email}`);

  return {
    message: "Password reset successful",
  };
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  forgotPassword,
  resetPassword,
};
