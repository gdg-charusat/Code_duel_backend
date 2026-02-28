const { PrismaClient } = require("@prisma/client");
const bcryptjs = require("bcryptjs");

const prisma = new PrismaClient();

// Sample data
const ADMIN_USER = {
  email: "admin@codeduel.dev",
  username: "admin",
  password: "Admin@1234",
  leetcodeUsername: null,
  role: "ADMIN",
};

const USERS = [
  {
    email: "john.doe@example.com",
    username: "johndoe",
    password: "password123",
    leetcodeUsername: "john_doe",
  },
  {
    email: "jane.smith@example.com",
    username: "janesmith",
    password: "password123",
    leetcodeUsername: "jane_smith",
  },
  {
    email: "bob.wilson@example.com",
    username: "bobwilson",
    password: "password123",
    leetcodeUsername: "bob_wilson",
  },
  {
    email: "alice.johnson@example.com",
    username: "alicejohnson",
    password: "password123",
    leetcodeUsername: "alice_johnson",
  },
  {
    email: "charlie.brown@example.com",
    username: "charliebrown",
    password: "password123",
    leetcodeUsername: "charlie_brown",
  },
];

const PROBLEM_METADATA = [
  {
    titleSlug: "two-sum",
    questionId: "1",
    title: "Two Sum",
    difficulty: "Easy",
    acRate: 48.5,
    likes: 32000,
    dislikes: 1000,
    isPaidOnly: false,
    topicTags: ["Array", "Hash Table"],
  },
  {
    titleSlug: "add-two-numbers",
    questionId: "2",
    title: "Add Two Numbers",
    difficulty: "Medium",
    acRate: 34.2,
    likes: 18000,
    dislikes: 4000,
    isPaidOnly: false,
    topicTags: ["Math", "Linked List"],
  },
  {
    titleSlug: "longest-substring-without-repeating-characters",
    questionId: "3",
    title: "Longest Substring Without Repeating Characters",
    difficulty: "Medium",
    acRate: 35.5,
    likes: 16000,
    dislikes: 700,
    isPaidOnly: false,
    topicTags: ["Hash Table", "Sliding Window", "String"],
  },
  {
    titleSlug: "median-of-two-sorted-arrays",
    questionId: "4",
    title: "Median of Two Sorted Arrays",
    difficulty: "Hard",
    acRate: 29.1,
    likes: 13000,
    dislikes: 2000,
    isPaidOnly: false,
    topicTags: ["Array", "Binary Search", "Divide and Conquer"],
  },
  {
    titleSlug: "palindrome-number",
    questionId: "9",
    title: "Palindrome Number",
    difficulty: "Easy",
    acRate: 52.0,
    likes: 8000,
    dislikes: 2000,
    isPaidOnly: false,
    topicTags: ["Math"],
  },
  {
    titleSlug: "container-with-most-water",
    questionId: "11",
    title: "Container With Most Water",
    difficulty: "Medium",
    acRate: 54.0,
    likes: 15000,
    dislikes: 800,
    isPaidOnly: false,
    topicTags: ["Array", "Two Pointers", "Greedy"],
  },
  {
    titleSlug: "merge-sorted-array",
    questionId: "88",
    title: "Merge Sorted Array",
    difficulty: "Easy",
    acRate: 58.0,
    likes: 12000,
    dislikes: 4000,
    isPaidOnly: false,
    topicTags: ["Array", "Two Pointers", "Sorting"],
  },
  {
    titleSlug: "search-in-rotated-sorted-array",
    questionId: "33",
    title: "Search in Rotated Sorted Array",
    difficulty: "Medium",
    acRate: 42.0,
    likes: 17000,
    dislikes: 1000,
    isPaidOnly: false,
    topicTags: ["Array", "Binary Search"],
  },
  {
    titleSlug: "word-ladder",
    questionId: "127",
    title: "Word Ladder",
    difficulty: "Hard",
    acRate: 38.5,
    likes: 9000,
    dislikes: 2000,
    isPaidOnly: false,
    topicTags: ["BFS", "Breadth-First Search", "Graph"],
  },
  {
    titleSlug: "regular-expression-matching",
    questionId: "10",
    title: "Regular Expression Matching",
    difficulty: "Hard",
    acRate: 27.5,
    likes: 7000,
    dislikes: 1500,
    isPaidOnly: false,
    topicTags: ["String", "Dynamic Programming", "Recursion"],
  },
];

/**
 * Main seeding function
 */
async function main() {
  console.log("🌱 Starting database seed...");

  try {
    // Clear existing data (in correct order due to foreign keys)
    console.log("🗑️  Clearing existing data...");
    await prisma.penaltyLedger.deleteMany();
    await prisma.dailyResult.deleteMany();
    await prisma.challengeMember.deleteMany();
    await prisma.challenge.deleteMany();
    await prisma.user.deleteMany();
    await prisma.problemMetadata.deleteMany();

    // 1. Create Users
    console.log("👥 Creating users...");

    // Create admin user first
    const adminHashedPassword = await bcryptjs.hash(ADMIN_USER.password, 10);
    const adminUser = await prisma.user.create({
      data: {
        email: ADMIN_USER.email,
        username: ADMIN_USER.username,
        password: adminHashedPassword,
        leetcodeUsername: ADMIN_USER.leetcodeUsername,
        role: ADMIN_USER.role,
        emailPreferences: {
          welcomeEmail: true,
          streakReminder: true,
          streakBroken: true,
          weeklySummary: true,
        },
      },
    });
    console.log(`✅ Created admin user: ${adminUser.username}`);

    const users = await Promise.all(
      USERS.map(async (user) => {
        const hashedPassword = await bcryptjs.hash(user.password, 10);
        return prisma.user.create({
          data: {
            email: user.email,
            username: user.username,
            password: hashedPassword,
            leetcodeUsername: user.leetcodeUsername,
            emailPreferences: {
              welcomeEmail: true,
              streakReminder: true,
              streakBroken: true,
              weeklySummary: true,
            },
          },
        });
      })
    );
    console.log(`✅ Created ${users.length} users`);

    // 2. Create Problem Metadata
    console.log("📚 Creating problem metadata...");
    const problems = await Promise.all(
      PROBLEM_METADATA.map((problem) =>
        prisma.problemMetadata.create({
          data: problem,
        })
      )
    );
    console.log(`✅ Created ${problems.length} problems`);

    // 3. Create Challenges
    console.log("🎯 Creating challenges...");
    const now = new Date();
    const startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
    const endDate = new Date(now.getTime() + 23 * 24 * 60 * 60 * 1000); // 23 days from now

    const challenges = [
      {
        name: "LeetCode Easy Challenges March 2026",
        description:
          "A series of easy-level coding problems to warm up your skills",
        ownerId: users[0].id,
        minSubmissionsPerDay: 1,
        difficultyFilter: ["Easy"],
        uniqueProblemConstraint: true,
        penaltyAmount: 0,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        status: "ACTIVE",
        visibility: "PUBLIC",
      },
      {
        name: "LeetCode Medium Marathon",
        description:
          "Challenge yourself with medium-level problems for 30 days",
        ownerId: users[1].id,
        minSubmissionsPerDay: 2,
        difficultyFilter: ["Medium"],
        uniqueProblemConstraint: true,
        penaltyAmount: 5,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        status: "ACTIVE",
        visibility: "PUBLIC",
      },
      {
        name: "Hard Problem Weekend",
        description: "Tackle the hardest problems every weekend",
        ownerId: users[0].id,
        minSubmissionsPerDay: 1,
        difficultyFilter: ["Hard"],
        uniqueProblemConstraint: false,
        penaltyAmount: 10,
        startDate: new Date(now),
        endDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        status: "PENDING",
        visibility: "PRIVATE",
      },
      {
        name: "Beginner's Journey",
        description: "A comprehensive challenge for those starting their coding journey",
        ownerId: users[2].id,
        minSubmissionsPerDay: 1,
        difficultyFilter: ["Easy", "Medium"],
        uniqueProblemConstraint: true,
        penaltyAmount: 2,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        status: "ACTIVE",
        visibility: "PUBLIC",
      },
      {
        name: "All-In January Challenge",
        description: "No difficulty limits - solve problems of any level",
        ownerId: users[3].id,
        minSubmissionsPerDay: 3,
        difficultyFilter: ["Easy", "Medium", "Hard"],
        uniqueProblemConstraint: true,
        penaltyAmount: 15,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        status: "COMPLETED",
        visibility: "PUBLIC",
      },
    ];

    const createdChallenges = await Promise.all(
      challenges.map((challenge) => prisma.challenge.create({ data: challenge }))
    );
    console.log(`✅ Created ${createdChallenges.length} challenges`);

    // 4. Create Challenge Members
    console.log("👫 Creating challenge memberships...");
    const memberships = [];

    // Users join challenges (not their own)
    for (let i = 0; i < createdChallenges.length; i++) {
      const challenge = createdChallenges[i];
      for (let j = 0; j < users.length; j++) {
        const user = users[j];
        // Don't add owner twice, add others randomly
        if (user.id !== challenge.ownerId) {
          if (Math.random() > 0.3) {
            // 70% chance to join
            const membership = await prisma.challengeMember.create({
              data: {
                challengeId: challenge.id,
                userId: user.id,
                currentStreak: Math.floor(Math.random() * 10),
                longestStreak: Math.floor(Math.random() * 25),
                totalPenalties: Math.random() * 50,
                isActive: Math.random() > 0.2, // 80% active
              },
            });
            memberships.push(membership);
          }
        }
      }
    }
    console.log(`✅ Created ${memberships.length} challenge memberships`);

    // 5. Create Daily Results
    console.log("📊 Creating daily results...");
    const dailyResults = [];

    for (const membership of memberships) {
      // Create random daily results for the last 7 days
      for (let daysAgo = 0; daysAgo < 7; daysAgo++) {
        const resultDate = new Date(now);
        resultDate.setDate(resultDate.getDate() - daysAgo);
        resultDate.setHours(0, 0, 0, 0);

        const completed = Math.random() > 0.3; // 70% completion rate
        const result = await prisma.dailyResult.create({
          data: {
            challengeId: membership.challengeId,
            memberId: membership.id,
            date: resultDate,
            completed: completed,
            submissionsCount: completed ? Math.floor(Math.random() * 5) + 1 : 0,
            problemsSolved: completed
              ? [
                  problems[Math.floor(Math.random() * problems.length)]
                    .titleSlug,
                ]
              : [],
            evaluatedAt: completed ? new Date() : null,
            metadata: {
              submissionDetails:
                completed ? Math.floor(Math.random() * 10) + 1 : null,
              timeSpent: completed ? Math.floor(Math.random() * 120) : null,
            },
          },
        });
        dailyResults.push(result);
      }
    }
    console.log(`✅ Created ${dailyResults.length} daily results`);

    // 6. Create Penalty Ledger entries
    console.log("⚠️  Creating penalty ledger entries...");
    const penaltyLedgerEntries = [];

    for (const membership of memberships.slice(0, Math.floor(memberships.length * 0.5))) {
      // Only some members have penalties
      const penaltyCount = Math.floor(Math.random() * 3); // 0-2 penalties
      for (let i = 0; i < penaltyCount; i++) {
        const penaltyDate = new Date(now);
        penaltyDate.setDate(penaltyDate.getDate() - Math.floor(Math.random() * 7));
        penaltyDate.setHours(0, 0, 0, 0);

        const reasons = [
          "Missed daily submission",
          "Failed to meet minimum submissions",
          "Late submission",
          "Inactivity penalty",
        ];

        const penalty = await prisma.penaltyLedger.create({
          data: {
            memberId: membership.id,
            amount: Math.random() * 20 + 5,
            reason: reasons[Math.floor(Math.random() * reasons.length)],
            date: penaltyDate,
          },
        });
        penaltyLedgerEntries.push(penalty);
      }
    }
    console.log(`✅ Created ${penaltyLedgerEntries.length} penalty ledger entries`);

    // Summary
    console.log("\n✅ Database seed completed successfully!");
    console.log("\n📊 Summary:");
    console.log(`   • Users: ${users.length}`);
    console.log(`   • Problems: ${problems.length}`);
    console.log(`   • Challenges: ${createdChallenges.length}`);
    console.log(`   • Challenge Members: ${memberships.length}`);
    console.log(`   • Daily Results: ${dailyResults.length}`);
    console.log(`   • Penalty Ledger Entries: ${penaltyLedgerEntries.length}`);

    console.log("\n📝 Sample Credentials for Testing:");
    console.log(`   🔑 ADMIN: ${ADMIN_USER.username} / ${ADMIN_USER.password}`);
    users.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.username} / ${USERS[index].password}`);
    });
  } catch (error) {
    console.error("❌ Error during seeding:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute seeding
main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
