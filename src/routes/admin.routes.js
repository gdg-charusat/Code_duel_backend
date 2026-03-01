const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin.controller");
const { authenticate, requireAdmin } = require("../middlewares/auth.middleware");

// All admin routes require authentication AND admin role
router.use(authenticate, requireAdmin);

/**
 * @route   GET /api/admin/stats
 * @desc    Get aggregated platform stats
 * @access  Admin
 */
router.get("/stats", adminController.getPlatformStats);

/**
 * @route   GET /api/admin/users
 * @desc    Get all users
 * @access  Admin
 */
router.get("/users", adminController.getAllUsers);

/**
 * @route   PATCH /api/admin/users/:id/role
 * @desc    Update a user's role
 * @access  Admin
 */
router.patch("/users/:id/role", adminController.updateUserRole);

/**
 * @route   DELETE /api/admin/users/:id
 * @desc    Delete a user
 * @access  Admin
 */
router.delete("/users/:id", adminController.deleteUser);

/**
 * @route   GET /api/admin/challenges
 * @desc    Get all challenges (unfiltered)
 * @access  Admin
 */
router.get("/challenges", adminController.getAllChallenges);

/**
 * @route   DELETE /api/admin/challenges/:id
 * @desc    Delete any challenge
 * @access  Admin
 */
router.delete("/challenges/:id", adminController.deleteChallenge);

module.exports = router;