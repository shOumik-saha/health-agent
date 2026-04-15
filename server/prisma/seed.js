import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function daysAgo(n) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - n);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

async function main() {
  const passwordHash = await bcrypt.hash("demo-password-123", 10);

  const user = await prisma.user.upsert({
    where: { email: "demo@healthagent.dev" },
    update: {},
    create: {
      email: "demo@healthagent.dev",
      passwordHash,
      name: "Demo User",
      timezone: "UTC",
    },
  });

  for (let i = 0; i < 21; i += 1) {
    const sleepHours = 5.5 + Math.random() * 3;
    const exerciseMinutes = Math.random() > 0.45 ? Math.floor(Math.random() * 45) : 0;
    const mood = Math.max(1, Math.min(10, Math.round(5 + (exerciseMinutes > 0 ? 1 : -0.5) + Math.random() * 2)));
    const energy = Math.max(1, Math.min(10, Math.round(4 + sleepHours / 2 + Math.random() * 2)));
    const focus = Math.max(
      1,
      Math.min(10, Math.round(4 + sleepHours / 2 - (i > 1 ? 0.3 : 0) + Math.random() * 2)),
    );

    await prisma.dailyLog.upsert({
      where: {
        userId_date: {
          userId: user.id,
          date: daysAgo(i),
        },
      },
      update: {
        sleepHours,
        mood,
        energy,
        focus,
        waterLiters: Number((1.2 + Math.random() * 1.8).toFixed(2)),
        exerciseMinutes,
        symptoms: Math.random() > 0.8 ? ["headache"] : [],
        foodNotes: Math.random() > 0.7 ? "Late dinner" : "Mostly balanced meals",
      },
      create: {
        userId: user.id,
        date: daysAgo(i),
        sleepHours,
        mood,
        energy,
        focus,
        waterLiters: Number((1.2 + Math.random() * 1.8).toFixed(2)),
        exerciseMinutes,
        symptoms: Math.random() > 0.8 ? ["headache"] : [],
        foodNotes: Math.random() > 0.7 ? "Late dinner" : "Mostly balanced meals",
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
