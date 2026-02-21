const inviteService = require("../services/invite.service");
const { asyncHandler } = require("../middlewares/error.middleware");
const { body, validationResult } = require("express-validator");

/**
 * Validation middleware for sending an invite
 */
const validateSendInvite = [
  body("username")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Username of the invitee is required"),
];

/**
 * Send an invite to a user for a challenge
 * POST /api/challenges/:id/invite
 */
const sendInvite = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array(),
    });
  }

  const { id: challengeId } = req.params;
  const { username } = req.body;

  const invite = await inviteService.sendInvite(
    req.user.id,
    challengeId,
    username,
  );

  res.status(201).json({
    success: true,
    message: `Invite sent to ${username}`,
    data: invite,
  });
});

/**
 * Accept an invite
 * POST /api/challenges/:id/invite/accept
 */
const acceptInvite = asyncHandler(async (req, res) => {
  const { id: challengeId } = req.params;

  const membership = await inviteService.acceptInvite(req.user.id, challengeId);

  res.status(200).json({
    success: true,
    message: "Invite accepted. You have joined the challenge.",
    data: membership,
  });
});

/**
 * Reject an invite
 * POST /api/challenges/:id/invite/reject
 */
const rejectInvite = asyncHandler(async (req, res) => {
  const { id: challengeId } = req.params;

  const invite = await inviteService.rejectInvite(req.user.id, challengeId);

  res.status(200).json({
    success: true,
    message: "Invite rejected",
    data: invite,
  });
});

/**
 * Get all pending invites for the current user
 * GET /api/challenges/invites/pending
 */
const getPendingInvites = asyncHandler(async (req, res) => {
  const invites = await inviteService.getPendingInvites(req.user.id);

  res.status(200).json({
    success: true,
    data: invites,
  });
});

/**
 * Get all invites sent for a challenge (owner only)
 * GET /api/challenges/:id/invites
 */
const getChallengeInvites = asyncHandler(async (req, res) => {
  const { id: challengeId } = req.params;

  const invites = await inviteService.getChallengeInvites(
    req.user.id,
    challengeId,
  );

  res.status(200).json({
    success: true,
    data: invites,
  });
});

module.exports = {
  sendInvite,
  acceptInvite,
  rejectInvite,
  getPendingInvites,
  getChallengeInvites,
  validateSendInvite,
};
