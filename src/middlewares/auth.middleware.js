const { verifyToken } = require("../utils/jwt");
const { prisma } = require("../config/prisma");
const logger = require("../utils/logger");
const authService = require("../services/auth.service");

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
        role: true,
        leetcodeUsername: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    // Attach user to request object
    req.user = user;

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
 * Role-based access control middleware factory.
 * Must be used after `authenticate`.
 * @param {...string} roles - Allowed roles (e.g. 'ADMIN', 'USER')
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied: insufficient permissions",
      });
    }

    next();
  };
};

/**
 * Shorthand middleware that restricts access to ADMIN role only.
 * Must be used after `authenticate`.
 */
const requireAdmin = requireRole("ADMIN");

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
            role: true,
            leetcodeUsername: true,
            createdAt: true,
          },
        });

        if (user) {
          req.user = user;
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
  requireRole,
  requireAdmin,
};
