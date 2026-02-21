const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboard.controller");
const { authenticate } = require("../middlewares/auth.middleware");

/**
 * @route   GET /api/dashboard
 * @desc    Get dashboard overview for current user
 * @access  Private
 */
router.get("/", authenticate, dashboardController.getDashboard);

/**
 * @route   GET /api/dashboard/today
 * @desc    Get today's status across all challenges
 * @access  Private
 */
router.get("/today", authenticate, dashboardController.getTodayStatus);

/**
 * @route   GET /api/dashboard/challenge/:challengeId
 * @desc    Get detailed challenge progress
 * @access  Private
 */
router.get(
  "/challenge/:challengeId",
  authenticate,
  dashboardController.getChallengeProgress,
);

/**
 * @route   GET /api/dashboard/challenge/:challengeId/leaderboard
 * @desc    Get challenge leaderboard
 * @access  Private
 */
router.get(
  "/challenge/:challengeId/leaderboard",
  authenticate,
  dashboardController.getChallengeLeaderboard,
);

/**
 * @route   GET /api/dashboard/activity-heatmap
 * @desc    Get user's activity heatmap data for the last 365 days
 * @access  Private
 */
router.get(
  "/activity-heatmap",
  authenticate,
  dashboardController.getActivityHeatmap,
);

/**
 * @route   GET /api/dashboard/stats
 * @desc    Get user's comprehensive stats (streaks, totals)
 * @access  Private
 */
router.get("/stats", authenticate, dashboardController.getStats);

/**
 * @route   GET /api/dashboard/invites
 * @desc    Get pending invites for the current user
 * @access  Private
 */
router.get("/invites", authenticate, dashboardController.getDashboardInvites);

/**
 * @route   GET /api/dashboard/submission-chart
 * @desc    Get user's submission chart data for the last 30 days
 * @access  Private
 */
router.get(
  "/submission-chart",
  authenticate,
  dashboardController.getSubmissionChart,
);

module.exports = router;
