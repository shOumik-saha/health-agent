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

  const totalDays = 28;
  const sleepPattern = [
    7.6, 7.2, 6.9, 6.1, 5.9, 7.8, 8.0,
    7.1, 6.5, 6.0, 5.7, 7.4, 7.9, 8.1,
    7.3, 6.8, 6.2, 5.8, 7.5, 7.7, 8.2,
    7.0, 6.4, 6.1, 5.9, 7.6, 7.8, 8.0,
  ];

  let exerciseStreak = 0;

  for (let i = totalDays - 1; i >= 0; i -= 1) {
    const dayIndex = totalDays - 1 - i;
    const date = daysAgo(i);
    const sleepHours = sleepPattern[dayIndex];
    const exercisedToday = [1, 2, 4, 5, 8, 9, 12, 13, 16, 17, 20, 21, 24, 25].includes(dayIndex);
    const exerciseMinutes = exercisedToday ? 25 + (dayIndex % 3) * 10 : 0;
    exerciseStreak = exercisedToday ? exerciseStreak + 1 : 0;

    // Intentionally encode a 2-day delayed focus effect from sleep.
    const twoDaysAgoSleep = dayIndex >= 2 ? sleepPattern[dayIndex - 2] : sleepHours;
    const focusRaw = 1.5 + twoDaysAgoSleep * 0.95 + (dayIndex % 2 === 0 ? 0.3 : -0.3);
    const energyRaw = 2.0 + sleepHours * 0.85 + (exercisedToday ? 0.4 : -0.2);
    const moodRaw = 3.8 + sleepHours * 0.45 + Math.min(exerciseStreak, 3) * 0.55;

    const focus = Math.max(1, Math.min(10, Math.round(focusRaw)));
    const energy = Math.max(1, Math.min(10, Math.round(energyRaw)));
    const mood = Math.max(1, Math.min(10, Math.round(moodRaw)));
    const waterLiters = Number((1.6 + (dayIndex % 4) * 0.25).toFixed(2));
    const symptoms = sleepHours < 6.2 ? ["headache"] : [];
    const foodNotes = dayIndex % 5 === 0 ? "Late dinner and low vegetables" : "Balanced meals with protein";

    const data = {
      sleepHours,
      mood,
      energy,
      focus,
      waterLiters,
      exerciseMinutes,
      symptoms,
      foodNotes,
      notes: exercisedToday ? "Workout completed" : "Rest day",
    };

    await prisma.dailyLog.upsert({
      where: {
        userId_date: {
          userId: user.id,
          date,
        },
      },
      update: data,
      create: {
        userId: user.id,
        date,
        ...data,
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
