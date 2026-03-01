const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { config } = require("../config/env");

/**
 * Generate JWT token for user
 * @param {Object} payload - User data to encode in token
 * @returns {string} JWT token
 */
const generateToken = (payload) => {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
};

/**
 * Verify JWT token
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded token payload
 * @throws {Error} If token is invalid or expired
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, config.jwtSecret);
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw new Error("Token has expired");
    }
    if (error.name === "JsonWebTokenError") {
      throw new Error("Invalid token");
    }
    throw error;
  }
};

/**
 * Decode JWT token without verification (for debugging)
 * @param {string} token - JWT token to decode
 * @returns {Object} Decoded token
 */
const decodeToken = (token) => {
  return jwt.decode(token);
};

/**
 * Derive a stable token-bound password version from the stored hash.
 * This changes whenever password hash changes, invalidating old tokens.
 * @param {string} passwordHash - Bcrypt password hash from database
 * @returns {string} Password version fingerprint
 */
const createPasswordVersion = (passwordHash) => {
  return crypto
    .createHmac("sha256", config.jwtSecret)
    .update(passwordHash)
    .digest("hex")
    .slice(0, 24);
};

module.exports = {
  generateToken,
  verifyToken,
  decodeToken,
  createPasswordVersion,
};
