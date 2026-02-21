const leaderboardService = require("../services/leaderboard.service");
const { asyncHandler } = require("../middlewares/error.middleware");

/**
 * GET /api/leaderboard
 * Optional query: ?limit=50
 */
const getLeaderboard = asyncHandler(async (req, res) => {
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 100;

    const leaderboard = await leaderboardService.getLeaderboard(limit);

    res.status(200).json({
        success: true,
        data: leaderboard,
    });
});

module.exports = {
    getLeaderboard,
};
