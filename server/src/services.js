import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TRACKED_METRICS = [
  "sleepHours",
  "mood",
  "energy",
  "focus",
  "waterLiters",
  "exerciseMinutes",
];

const targetMetrics = ["mood", "energy", "focus"];

function toDateOnly(dateInput) {
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid date.");
  }
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

function average(values) {
  if (!values.length) return null;
  const sum = values.reduce((acc, value) => acc + value, 0);
  return sum / values.length;
}

function stdDev(values) {
  if (values.length < 2) return null;
  const mean = average(values);
  const variance =
    values.reduce((acc, value) => acc + (value - mean) ** 2, 0) /
    (values.length - 1);
  return Math.sqrt(variance);
}

function pearsonCorrelation(xValues, yValues) {
  if (xValues.length !== yValues.length || xValues.length < 4) return null;
  const xMean = average(xValues);
  const yMean = average(yValues);
  const xStd = stdDev(xValues);
  const yStd = stdDev(yValues);

  if (!xStd || !yStd) return null;

  let cov = 0;
  for (let i = 0; i < xValues.length; i += 1) {
    cov += (xValues[i] - xMean) * (yValues[i] - yMean);
  }

  cov /= xValues.length - 1;
  return cov / (xStd * yStd);
}

export async function createOrUpdateDailyLog(userId, payload) {
  const normalizedDate = toDateOnly(payload.date ?? new Date());

  return prisma.dailyLog.upsert({
    where: {
      userId_date: {
        userId,
        date: normalizedDate,
      },
    },
    create: {
      userId,
      date: normalizedDate,
      sleepHours: payload.sleepHours,
      mood: payload.mood,
      energy: payload.energy,
      focus: payload.focus,
      waterLiters: payload.waterLiters,
      exerciseMinutes: payload.exerciseMinutes,
      symptoms: payload.symptoms ?? [],
      foodNotes: payload.foodNotes,
      notes: payload.notes,
    },
    update: {
      sleepHours: payload.sleepHours,
      mood: payload.mood,
      energy: payload.energy,
      focus: payload.focus,
      waterLiters: payload.waterLiters,
      exerciseMinutes: payload.exerciseMinutes,
      symptoms: payload.symptoms ?? [],
      foodNotes: payload.foodNotes,
      notes: payload.notes,
    },
  });
}

export async function getDailyLogs(userId, days = 90) {
  const now = new Date();
  const start = new Date(now);
  start.setUTCDate(now.getUTCDate() - days + 1);
  start.setUTCHours(0, 0, 0, 0);

  return prisma.dailyLog.findMany({
    where: {
      userId,
      date: {
        gte: start,
        lte: now,
      },
    },
    orderBy: {
      date: "asc",
    },
  });
}

export function summarizeTimeSeries(logs) {
  const summary = {};
  TRACKED_METRICS.forEach((metric) => {
    const values = logs
      .map((log) => log[metric])
      .filter((value) => Number.isFinite(value));
    summary[metric] = {
      avg: average(values),
      min: values.length ? Math.min(...values) : null,
      max: values.length ? Math.max(...values) : null,
      samples: values.length,
    };
  });
  return summary;
}

function laggedPairs(logs, sourceKey, targetKey, lagDays) {
  const x = [];
  const y = [];

  for (let i = 0; i < logs.length - lagDays; i += 1) {
    const current = logs[i];
    const lagged = logs[i + lagDays];
    const source = current[sourceKey];
    const target = lagged[targetKey];
    if (Number.isFinite(source) && Number.isFinite(target)) {
      x.push(source);
      y.push(target);
    }
  }

  return { x, y };
}

export function findLaggedPatterns(logs, maxLagDays = 3) {
  const findings = [];

  for (const sourceMetric of TRACKED_METRICS) {
    for (const targetMetric of targetMetrics) {
      if (sourceMetric === targetMetric) continue;
      for (let lag = 0; lag <= maxLagDays; lag += 1) {
        const { x, y } = laggedPairs(logs, sourceMetric, targetMetric, lag);
        const corr = pearsonCorrelation(x, y);
        if (corr === null) continue;
        if (Math.abs(corr) < 0.3) continue;

        findings.push({
          sourceMetric,
          targetMetric,
          lagDays: lag,
          correlation: Number(corr.toFixed(3)),
          sampleSize: x.length,
          direction: corr > 0 ? "positive" : "negative",
        });
      }
    }
  }

  findings.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
  return findings.slice(0, 8);
}

export function findExerciseStreakEffects(logs) {
  const streakBuckets = new Map();
  let currentStreak = 0;

  for (const log of logs) {
    const exercised = Number.isFinite(log.exerciseMinutes) && log.exerciseMinutes > 0;
    currentStreak = exercised ? currentStreak + 1 : 0;

    const key = Math.min(currentStreak, 5);
    if (!streakBuckets.has(key)) {
      streakBuckets.set(key, { mood: [], focus: [], energy: [] });
    }

    const bucket = streakBuckets.get(key);
    for (const target of targetMetrics) {
      if (Number.isFinite(log[target])) bucket[target].push(log[target]);
    }
  }

  const effects = [];
  streakBuckets.forEach((bucket, streakLength) => {
    effects.push({
      streakLength,
      moodAvg: average(bucket.mood),
      energyAvg: average(bucket.energy),
      focusAvg: average(bucket.focus),
      samples: bucket.mood.length || bucket.energy.length || bucket.focus.length,
    });
  });

  effects.sort((a, b) => a.streakLength - b.streakLength);
  return effects;
}

export function buildChartSeries(logs) {
  return logs.map((log) => ({
    date: log.date.toISOString().slice(0, 10),
    sleepHours: log.sleepHours,
    mood: log.mood,
    energy: log.energy,
    focus: log.focus,
    waterLiters: log.waterLiters,
    exerciseMinutes: log.exerciseMinutes,
  }));
}

export async function saveWeeklyInsightSnapshot({
  userId,
  weekStartDate,
  weekEndDate,
  narrative,
  structuredInsights,
}) {
  return prisma.weeklyInsight.create({
    data: {
      userId,
      weekStartDate,
      weekEndDate,
      narrative,
      structuredInsights,
    },
  });
}

export { prisma };
