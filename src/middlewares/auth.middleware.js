const { verifyToken, createPasswordVersion } = require("../utils/jwt");
const { prisma } = require("../config/prisma");
const logger = require("../utils/logger");
const authService = require("../services/auth.service");

const isPasswordVersionValid = (decoded, passwordHash) => {
  if (!decoded?.pwdv || !passwordHash) {
    return false;
  }

  return decoded.pwdv === createPasswordVersion(passwordHash);
};

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request object
 */
const authenticate = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "No token provided",
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: error.message,
      });
    }

    // Check if token is blacklisted
    const isBlacklisted = await authService.isTokenBlacklisted(token);
    if (isBlacklisted) {
      return res.status(401).json({
        success: false,
        message: "Token has been revoked",
      });
    }

    // Store token for use in controllers (e.g., logout endpoint)
    req.verifiedToken = token;

    // Fetch user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        username: true,
        leetcodeUsername: true,
        password: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    if (!isPasswordVersionValid(decoded, user.password)) {
      return res.status(401).json({
        success: false,
        message: "Token is no longer valid. Please log in again.",
      });
    }

    // Attach user to request object
    const { password, ...safeUser } = user;
    req.user = safeUser;

    next();
  } catch (error) {
    logger.error("Authentication middleware error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Optional authentication middleware
 * Attaches user to request if token is valid, but doesn't require authentication
 */
const optionalAuthenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);

      try {
        const decoded = verifyToken(token);
        const user = await prisma.user.findUnique({
          where: { id: decoded.userId },
          select: {
            id: true,
            email: true,
            username: true,
            leetcodeUsername: true,
            password: true,
            createdAt: true,
          },
        });

        if (user && isPasswordVersionValid(decoded, user.password)) {
          const { password, ...safeUser } = user;
          req.user = safeUser;
        }
      } catch (error) {
        // Token invalid, but we don't return error for optional auth
        logger.debug("Optional auth - invalid token:", error.message);
      }
    }

    next();
  } catch (error) {
    logger.error("Optional authentication middleware error:", error);
    next(); // Continue even if error
  }
};

/**
 * Admin authorization middleware
 * Placeholder until role-based access is implemented
 */
const authorizeAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  next();
};

module.exports = {
  authenticate,
  optionalAuthenticate,
  authorizeAdmin,
};
