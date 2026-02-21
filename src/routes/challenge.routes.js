const express = require("express");
const router = express.Router();
const challengeController = require("../controllers/challenge.controller");
const { authenticate } = require("../middlewares/auth.middleware");

/**
 * @route   POST /api/challenges
 * @desc    Create a new challenge
 * @access  Private
 */
router.post(
  "/",
  authenticate,
  challengeController.validateCreateChallenge,
  challengeController.createChallenge
);

/**
 * @route   GET /api/challenges
 * @desc    Get all challenges for current user
 * @access  Private
 */
router.get("/", authenticate, challengeController.getUserChallenges);

/**
 * @route   GET /api/challenges/:id
 * @desc    Get challenge by ID
 * @access  Private
 */
router.get("/:id", authenticate, challengeController.getChallengeById);

/**
 * @route   POST /api/challenges/:id/join
 * @desc    Join a challenge
 * @access  Private
 */
router.post("/:id/join", authenticate, challengeController.joinChallenge);

/**
 * @route   PATCH /api/challenges/:id/status
 * @desc    Update challenge status (owner only)
 * @access  Private
 */
router.patch(
  "/:id/status",
  authenticate,
  challengeController.updateChallengeStatus
);


/**
 * @route GET /api/challenges/:id/leaderboard 
 * @desc Get the leaderboard for the current challenge with relevant user data
 * @access Private
 */
router.get("/:id/leaderboard", authenticate, challengeController.getLeaderboard)

module.exports = router;
