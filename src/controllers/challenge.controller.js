const challengeService = require("../services/challenge.service");
const { asyncHandler } = require("../middlewares/error.middleware");
const { body, validationResult } = require("express-validator");

/**
 * Validation middleware for creating challenge
 */
const validateCreateChallenge = [
  body("name")
    .isLength({ min: 3, max: 100 })
    .withMessage("Challenge name must be 3-100 characters"),
  body("description")
    .optional()
    .isLength({ max: 500 })
    .withMessage("Description must not exceed 500 characters"),
  body("minSubmissionsPerDay")
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage("Min submissions per day must be between 1 and 10"),
  body("difficultyFilter")
    .isArray()
    .withMessage("Difficulty filter must be an array")
    .custom((value) => {
      const valid = ["Easy", "Medium", "Hard"];
      return value.every((d) => valid.includes(d));
    })
    .withMessage("Difficulty filter must contain only Easy, Medium, or Hard"),
  body("uniqueProblemConstraint")
    .optional()
    .isBoolean()
    .withMessage("Unique problem constraint must be a boolean"),
  body("penaltyAmount")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Penalty amount must be a non-negative number"),
  body("visibility")
    .optional()
    .isIn(["PUBLIC", "PRIVATE"])
    .withMessage("Visibility must be either PUBLIC or PRIVATE"),
  body("startDate")
    .isISO8601()
    .withMessage("Start date must be a valid ISO 8601 date"),
  body("endDate")
    .isISO8601()
    .withMessage("End date must be a valid ISO 8601 date"),
];

/**
 * Create a new challenge
 * POST /api/challenges
 */
const createChallenge = asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array(),
    });
  }

  const challenge = await challengeService.createChallenge(
    req.user.id,
    req.body
  );

  res.status(201).json({
    success: true,
    message: "Challenge created successfully",
    data: challenge,
  });
});

/**
 * Get challenge by ID
 * GET /api/challenges/:id
 */
const getChallengeById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const challenge = await challengeService.getChallengeById(id, req.user.id);

  res.status(200).json({
    success: true,
    data: challenge,
  });
});

/**
 * Join a challenge
 * POST /api/challenges/:id/join
 */
const joinChallenge = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const membership = await challengeService.joinChallenge(req.user.id, id);

  res.status(200).json({
    success: true,
    message: "Successfully joined the challenge",
    data: membership,
  });
});

/**
 * Get all challenges for current user
 * GET /api/challenges
 */
const getUserChallenges = asyncHandler(async (req, res) => {
  const { status, owned } = req.query;

  const challenges = await challengeService.getUserChallenges(req.user.id, {
    status,
    owned,
  });

  res.status(200).json({
    success: true,
    data: challenges,
  });
});

/**
 * Update challenge status
 * PATCH /api/challenges/:id/status
 */
const updateChallengeStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({
      success: false,
      message: "Status is required",
    });
  }

  const challenge = await challengeService.updateChallengeStatus(
    id,
    req.user.id,
    status
  );

  res.status(200).json({
    success: true,
    message: "Challenge status updated successfully",
    data: challenge,
  });
});

module.exports = {
  createChallenge,
  getChallengeById,
  joinChallenge,
  getUserChallenges,
  updateChallengeStatus,
  validateCreateChallenge,
};
