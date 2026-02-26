const { sendEmail } = require("../config/email");
const { prisma } = require("../config/prisma");
const logger = require("../utils/logger");

/**
 * Email Templates
 */
const templates = {
  /**
   * Welcome email template
   */
  welcome: (username) => ({
    subject: "Welcome to Code Duel! 🎉",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; color: #888; font-size: 12px; margin-top: 20px; }
          .feature { margin: 15px 0; padding: 10px; background: white; border-radius: 5px; }
          .feature-icon { font-size: 24px; margin-right: 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Code Duel! 🚀</h1>
          </div>
          <div class="content">
            <h2>Hey ${username}! 👋</h2>
            <p>Congratulations on joining Code Duel! You're now part of a community of developers who are committed to improving their coding skills through daily challenges.</p>
            
            <h3>Here's what you can do:</h3>
            <div class="feature">
              <span class="feature-icon">🎯</span>
              <strong>Create Challenges</strong> - Set up custom challenges with your own rules
            </div>
            <div class="feature">
              <span class="feature-icon">👥</span>
              <strong>Join Challenges</strong> - Compete with friends and colleagues
            </div>
            <div class="feature">
              <span class="feature-icon">🔥</span>
              <strong>Build Streaks</strong> - Maintain daily streaks to stay consistent
            </div>
            <div class="feature">
              <span class="feature-icon">📊</span>
              <strong>Track Progress</strong> - View detailed dashboards and leaderboards
            </div>
            
            <p><strong>Pro Tip:</strong> Link your LeetCode account to automatically track your submissions!</p>
            
            <p>Ready to start your coding journey?</p>
            
            <p>Happy Coding! 💻</p>
            <p><strong>The Code Duel Team</strong></p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Code Duel. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  /**
   * Password reset email template
   */
  passwordReset: (username, resetUrl) => ({
    subject: "Reset Your Code Duel Password 🔐",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; text-align: center; }
          .warning { background: #fff3cd; border: 1px solid #ffc107; border-radius: 5px; padding: 15px; margin: 20px 0; color: #856404; }
          .footer { text-align: center; color: #888; font-size: 12px; margin-top: 20px; }
          .link-text { word-break: break-all; color: #667eea; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request 🔐</h1>
          </div>
          <div class="content">
            <h2>Hi ${username}!</h2>
            <p>We received a request to reset your Code Duel account password. If you made this request, click the button below to set a new password.</p>
            
            <center>
              <a href="${resetUrl}" class="button">Reset Password</a>
            </center>
            
            <p style="text-align: center; margin-top: 20px;">
              Or copy and paste this link in your browser:<br>
              <span class="link-text">${resetUrl}</span>
            </p>
            
            <div class="warning">
              <strong>⏰ Important:</strong> This link will expire in 1 hour for security reasons.
            </div>
            
            <div class="warning">
              <strong>🔒 Security Note:</strong> If you didn't request a password reset, you can ignore this email. Your password won't change unless you click the link above.
            </div>
            
            <p>Need help? Contact our support team.</p>
            
            <p>Best regards,<br><strong>The Code Duel Team</strong></p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Code Duel. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  /**
   * Daily streak reminder template
   */
  streakReminder: (username, currentStreak, challengeName) => ({
    subject: `⏰ Don't lose your ${currentStreak}-day streak! Complete today's challenge`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .streak-box { background: #fff; border: 2px solid #f5576c; border-radius: 10px; padding: 20px; text-align: center; margin: 20px 0; }
          .streak-number { font-size: 48px; color: #f5576c; font-weight: bold; }
          .button { display: inline-block; background: #f5576c; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; color: #888; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⏰ Streak Reminder!</h1>
          </div>
          <div class="content">
            <h2>Hey ${username}! 👋</h2>
            <p>Just a friendly reminder - you haven't completed today's challenge yet!</p>
            
            <div class="streak-box">
              <p>Your Current Streak</p>
              <div class="streak-number">🔥 ${currentStreak}</div>
              <p>days in <strong>${challengeName}</strong></p>
            </div>
            
            <p>Don't let all that hard work go to waste! Complete at least one LeetCode problem today to keep your streak alive.</p>
            
            <p><strong>Time is running out!</strong> The day resets at midnight UTC.</p>
            
            <p>You've got this! 💪</p>
            <p><strong>The Code Duel Team</strong></p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Code Duel. All rights reserved.</p>
            <p>Don't want reminders? Update your notification preferences in your profile.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  /**
   * Streak broken notification template
   */
  streakBroken: (username, lostStreak, challengeName) => ({
    subject: `😢 Your ${lostStreak}-day streak was broken`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .streak-box { background: #fff; border: 2px solid #ff6b6b; border-radius: 10px; padding: 20px; text-align: center; margin: 20px 0; }
          .streak-number { font-size: 48px; color: #ff6b6b; font-weight: bold; }
          .motivation { background: #e8f5e9; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; color: #888; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Streak Update 📊</h1>
          </div>
          <div class="content">
            <h2>Hey ${username},</h2>
            <p>We noticed you missed yesterday's challenge in <strong>${challengeName}</strong>.</p>
            
            <div class="streak-box">
              <p>Streak Lost</p>
              <div class="streak-number">💔 ${lostStreak}</div>
              <p>days</p>
            </div>
            
            <div class="motivation">
              <h3>💪 Don't Give Up!</h3>
              <p>Every expert was once a beginner. Missing a day happens to everyone. What matters is getting back on track!</p>
              <ul>
                <li>Start fresh today with a new streak</li>
                <li>Try an Easy problem to get back in the groove</li>
                <li>Set a reminder for your daily practice</li>
              </ul>
            </div>
            
            <p>Remember: Consistency beats perfection. One missed day doesn't define your journey!</p>
            
            <p>Let's get back to coding! 🚀</p>
            <p><strong>The Code Duel Team</strong></p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Code Duel. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  /**
   * Weekly summary template
   */
  weeklySummary: (username, stats) => ({
    subject: `📊 Your Weekly Code Duel Summary`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin: 20px 0; }
          .stat-box { background: white; padding: 20px; border-radius: 10px; text-align: center; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
          .stat-number { font-size: 32px; font-weight: bold; color: #11998e; }
          .stat-label { color: #666; font-size: 14px; }
          .challenge-item { background: white; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #11998e; }
          .footer { text-align: center; color: #888; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📊 Weekly Summary</h1>
            <p>Week of ${stats.weekStart} - ${stats.weekEnd}</p>
          </div>
          <div class="content">
            <h2>Great work this week, ${username}! 🎉</h2>
            
            <div class="stats-grid">
              <div class="stat-box">
                <div class="stat-number">${stats.problemsSolved}</div>
                <div class="stat-label">Problems Solved</div>
              </div>
              <div class="stat-box">
                <div class="stat-number">${stats.daysCompleted}/7</div>
                <div class="stat-label">Days Completed</div>
              </div>
              <div class="stat-box">
                <div class="stat-number">🔥 ${stats.currentStreak}</div>
                <div class="stat-label">Current Streak</div>
              </div>
              <div class="stat-box">
                <div class="stat-number">🏆 ${stats.longestStreak}</div>
                <div class="stat-label">Longest Streak</div>
              </div>
            </div>
            
            ${stats.activeChallenges.length > 0 ? `
              <h3>Your Active Challenges:</h3>
              ${stats.activeChallenges.map(c => `
                <div class="challenge-item">
                  <strong>${c.name}</strong>
                  <p>Rank: #${c.rank} | Streak: ${c.streak} days | Completion: ${c.completionRate}%</p>
                </div>
              `).join('')}
            ` : '<p>No active challenges this week. Join a challenge to compete!</p>'}
            
            <h3>Tips for Next Week:</h3>
            <ul>
              <li>🎯 Try solving at least one problem daily</li>
              <li>📈 Challenge yourself with harder problems</li>
              <li>👥 Invite friends to compete with you</li>
            </ul>
            
            <p>Keep up the great work! 💪</p>
            <p><strong>The Code Duel Team</strong></p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Code Duel. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),
};

/**
 * Send welcome email to new user
 * @param {string} email - User email
 * @param {string} username - Username
 */
const sendWelcomeEmail = async (email, username) => {
  try {
    const template = templates.welcome(username);
    const result = await sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
    });

    if (result.success) {
      logger.info(`Welcome email sent to ${email}`);
    }
    return result;
  } catch (error) {
    logger.error(`Failed to send welcome email to ${email}:`, error);
    return { success: false, reason: error.message };
  }
};

/**
 * Send password reset email
 * @param {string} email - User email
 * @param {string} username - Username
 * @param {string} resetUrl - Password reset URL
 */
const sendPasswordResetEmail = async (email, username, resetUrl) => {
  try {
    const template = templates.passwordReset(username, resetUrl);
    const result = await sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
    });

    if (result.success) {
      logger.info(`Password reset email sent to ${email}`);
    }
    return result;
  } catch (error) {
    logger.error(`Failed to send password reset email to ${email}:`, error);
    return { success: false, reason: error.message };
  }
};

/**
 * Send streak reminder email
 * @param {string} email - User email
 * @param {string} username - Username
 * @param {number} currentStreak - Current streak count
 * @param {string} challengeName - Challenge name
 */
const sendStreakReminder = async (email, username, currentStreak, challengeName) => {
  try {
    const template = templates.streakReminder(username, currentStreak, challengeName);
    const result = await sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
    });

    if (result.success) {
      logger.info(`Streak reminder sent to ${email}`);
    }
    return result;
  } catch (error) {
    logger.error(`Failed to send streak reminder to ${email}:`, error);
    return { success: false, reason: error.message };
  }
};

/**
 * Send streak broken notification
 * @param {string} email - User email
 * @param {string} username - Username
 * @param {number} lostStreak - Lost streak count
 * @param {string} challengeName - Challenge name
 */
const sendStreakBrokenNotification = async (email, username, lostStreak, challengeName) => {
  try {
    const template = templates.streakBroken(username, lostStreak, challengeName);
    const result = await sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
    });

    if (result.success) {
      logger.info(`Streak broken notification sent to ${email}`);
    }
    return result;
  } catch (error) {
    logger.error(`Failed to send streak broken notification to ${email}:`, error);
    return { success: false, reason: error.message };
  }
};

/**
 * Send weekly summary email
 * @param {string} email - User email
 * @param {string} username - Username
 * @param {Object} stats - Weekly statistics
 */
const sendWeeklySummary = async (email, username, stats) => {
  try {
    const template = templates.weeklySummary(username, stats);
    const result = await sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
    });

    if (result.success) {
      logger.info(`Weekly summary sent to ${email}`);
    }
    return result;
  } catch (error) {
    logger.error(`Failed to send weekly summary to ${email}:`, error);
    return { success: false, reason: error.message };
  }
};

/**
 * Send daily reminder to users who haven't completed today's challenge
 */
const sendDailyReminders = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    // Get all active challenge members who haven't completed today
    const activeMembers = await prisma.challengeMember.findMany({
      where: {
        isActive: true,
        challenge: {
          status: "ACTIVE",
          startDate: { lte: new Date() },
          endDate: { gte: new Date() },
        },
        // Exclude members who already have a completed result for today
        NOT: {
          dailyResults: {
            some: {
              date: today,
              completed: true,
            },
          },
        },
      },
      include: {
        user: {
          select: {
            email: true,
            username: true,
          },
        },
        challenge: {
          select: {
            name: true,
          },
        },
      },
    });

    logger.info(`Sending daily reminders to ${activeMembers.length} members`);

    // Group by user to avoid multiple emails
    const userReminders = new Map();
    for (const member of activeMembers) {
      const userId = member.userId;
      if (!userReminders.has(userId)) {
        userReminders.set(userId, {
          email: member.user.email,
          username: member.user.username,
          challenges: [],
        });
      }
      userReminders.get(userId).challenges.push({
        name: member.challenge.name,
        streak: member.currentStreak,
      });
    }

    // Send emails
    for (const [userId, data] of userReminders) {
      // Use the first challenge for the reminder (or highest streak)
      const challenge = data.challenges.sort((a, b) => b.streak - a.streak)[0];
      await sendStreakReminder(
        data.email,
        data.username,
        challenge.streak,
        challenge.name
      );
    }

    logger.info(`Daily reminders sent successfully`);
    return { success: true, count: userReminders.size };
  } catch (error) {
    logger.error("Failed to send daily reminders:", error);
    return { success: false, reason: error.message };
  }
};

/**
 * Send weekly summaries to all users
 */
const sendWeeklySummaries = async () => {
  try {
    const weekEnd = new Date();
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);

    // Get all users with active memberships
    const users = await prisma.user.findMany({
      where: {
        memberships: {
          some: {
            isActive: true,
          },
        },
      },
      include: {
        memberships: {
          where: { isActive: true },
          include: {
            challenge: {
              select: {
                id: true,
                name: true,
                status: true,
              },
            },
            dailyResults: {
              where: {
                date: {
                  gte: weekStart,
                  lte: weekEnd,
                },
              },
            },
          },
        },
      },
    });

    logger.info(`Generating weekly summaries for ${users.length} users`);

    for (const user of users) {
      // Calculate stats
      let totalProblems = 0;
      let daysCompleted = 0;
      let currentStreak = 0;
      let longestStreak = 0;
      const activeChallenges = [];

      const completedDays = new Set();

      for (const membership of user.memberships) {
        currentStreak = Math.max(currentStreak, membership.currentStreak);
        longestStreak = Math.max(longestStreak, membership.longestStreak);

        for (const result of membership.dailyResults) {
          if (result.completed) {
            completedDays.add(result.date.toISOString().split('T')[0]);
            totalProblems += result.submissionsCount;
          }
        }

        if (membership.challenge.status === "ACTIVE") {
          // Get leaderboard rank (simplified)
          const rank = await getLeaderboardRank(membership.challengeId, membership.id);
          const completedCount = membership.dailyResults.filter(r => r.completed).length;
          
          activeChallenges.push({
            name: membership.challenge.name,
            rank,
            streak: membership.currentStreak,
            completionRate: Math.round((completedCount / 7) * 100),
          });
        }
      }

      daysCompleted = completedDays.size;

      const stats = {
        weekStart: weekStart.toLocaleDateString(),
        weekEnd: weekEnd.toLocaleDateString(),
        problemsSolved: totalProblems,
        daysCompleted,
        currentStreak,
        longestStreak,
        activeChallenges,
      };

      await sendWeeklySummary(user.email, user.username, stats);
    }

    logger.info("Weekly summaries sent successfully");
    return { success: true, count: users.length };
  } catch (error) {
    logger.error("Failed to send weekly summaries:", error);
    return { success: false, reason: error.message };
  }
};

/**
 * Get leaderboard rank for a member
 */
const getLeaderboardRank = async (challengeId, memberId) => {
  const members = await prisma.challengeMember.findMany({
    where: { challengeId, isActive: true },
    orderBy: [
      { longestStreak: "desc" },
      { currentStreak: "desc" },
      { totalPenalties: "asc" },
    ],
    select: { id: true },
  });

  const rank = members.findIndex((m) => m.id === memberId) + 1;
  return rank || members.length;
};

module.exports = {
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendStreakReminder,
  sendStreakBrokenNotification,
  sendWeeklySummary,
  sendDailyReminders,
  sendWeeklySummaries,
};
