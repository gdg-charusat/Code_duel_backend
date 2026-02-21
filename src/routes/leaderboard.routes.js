const express = require("express");
const router = express.Router();
const leaderboardController = require("../controllers/leaderboard.controller");

/**
 * Public leaderboard endpoint
 */
router.get("/", leaderboardController.getLeaderboard);

module.exports = router;
