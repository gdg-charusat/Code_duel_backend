const express = require("express");
const router = express.Router();
const challengeController = require("../controllers/challenge.controller");
const inviteController = require("../controllers/invite.controller");
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
  challengeController.createChallenge,
);

/**
 * @route   GET /api/challenges
 * @desc    Get all challenges for current user
 * @access  Private
 */
router.get("/", authenticate, challengeController.getUserChallenges);

/**
 * @route   GET /api/challenges/invites/pending
 * @desc    Get all pending invites for the current user
 * @access  Private
 */
router.get(
  "/invites/pending",
  authenticate,
  inviteController.getPendingInvites,
);

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
  challengeController.updateChallengeStatus,
);

// ========================
// Invite Routes
// ========================

/**
 * @route   POST /api/challenges/:id/invite
 * @desc    Send an invite to a user (owner only)
 * @access  Private
 */
router.post(
  "/:id/invite",
  authenticate,
  inviteController.validateSendInvite,
  inviteController.sendInvite,
);

/**
 * @route   POST /api/challenges/:id/invite/accept
 * @desc    Accept an invite
 * @access  Private
 */
router.post("/:id/invite/accept", authenticate, inviteController.acceptInvite);

/**
 * @route   POST /api/challenges/:id/invite/reject
 * @desc    Reject an invite
 * @access  Private
 */
router.post("/:id/invite/reject", authenticate, inviteController.rejectInvite);

/**
 * @route   GET /api/challenges/:id/invites
 * @desc    Get all invites for a challenge (owner only)
 * @access  Private
 */
router.get("/:id/invites", authenticate, inviteController.getChallengeInvites);

module.exports = router;
