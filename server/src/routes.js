import express from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import {
  createOrUpdateDailyLog,
  getDailyLogs,
  summarizeTimeSeries,
  findLaggedPatterns,
  findExerciseStreakEffects,
  buildChartSeries,
  saveWeeklyInsightSnapshot,
  prisma,
} from "./services.js";
import { generateWeeklyNarrative } from "./agent.js";
import { requireAuth, signAuthToken } from "./middleware.js";

const router = express.Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(100).optional(),
  timezone: z.string().min(2).max(100).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const logSchema = z.object({
  date: z.coerce.date().optional(),
  sleepHours: z.number().min(0).max(24).optional(),
  mood: z.number().int().min(1).max(10).optional(),
  energy: z.number().int().min(1).max(10).optional(),
  focus: z.number().int().min(1).max(10).optional(),
  waterLiters: z.number().min(0).max(10).optional(),
  exerciseMinutes: z.number().int().min(0).max(300).optional(),
  symptoms: z.array(z.string().min(1).max(80)).max(20).optional(),
  foodNotes: z.string().max(500).optional(),
  notes: z.string().max(1000).optional(),
});

const listLogsSchema = z.object({
  days: z.coerce.number().int().min(7).max(365).default(90),
});

router.get("/health", (req, res) => {
  res.json({ status: "ok", service: "health-agent-server" });
});

router.post("/auth/register", async (req, res, next) => {
  try {
    const body = registerSchema.parse(req.body);
    const passwordHash = await bcrypt.hash(body.password, 10);

    const user = await prisma.user.create({
      data: {
        email: body.email.toLowerCase(),
        passwordHash,
        name: body.name,
        timezone: body.timezone || "UTC",
      },
      select: {
        id: true,
        email: true,
        name: true,
        timezone: true,
      },
    });

    const token = signAuthToken(user);
    res.status(201).json({ user, token });
  } catch (error) {
    next(error);
  }
});

router.post("/auth/login", async (req, res, next) => {
  try {
    const body = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({
      where: { email: body.email.toLowerCase() },
    });

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    const passwordOk = await bcrypt.compare(body.password, user.passwordHash);
    if (!passwordOk) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    const token = signAuthToken(user);
    return res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        timezone: user.timezone,
      },
      token,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        email: true,
        name: true,
        timezone: true,
        createdAt: true,
      },
    });
    if (!user) return res.status(404).json({ error: "User not found." });
    return res.json({ user });
  } catch (error) {
    next(error);
  }
});

router.post("/logs", requireAuth, async (req, res, next) => {
  try {
    const body = logSchema.parse(req.body);
    const log = await createOrUpdateDailyLog(req.user.userId, body);
    res.status(201).json({ log });
  } catch (error) {
    next(error);
  }
});

router.get("/logs", requireAuth, async (req, res, next) => {
  try {
    const { days } = listLogsSchema.parse(req.query);
    const logs = await getDailyLogs(req.user.userId, days);
    res.json({ logs });
  } catch (error) {
    next(error);
  }
});

router.get("/insights/trends", requireAuth, async (req, res, next) => {
  try {
    const { days } = listLogsSchema.parse(req.query);
    const logs = await getDailyLogs(req.user.userId, days);
    const summary = summarizeTimeSeries(logs);
    const laggedPatterns = findLaggedPatterns(logs, 3);
    const streakEffects = findExerciseStreakEffects(logs);

    res.json({
      windowDays: days,
      points: logs.length,
      summary,
      laggedPatterns,
      streakEffects,
      chartSeries: buildChartSeries(logs),
    });
  } catch (error) {
    next(error);
  }
});

router.post("/insights/weekly", requireAuth, async (req, res, next) => {
  try {
    const { days } = listLogsSchema.parse(req.query);
    const logs = await getDailyLogs(req.user.userId, days);

    if (logs.length < 7) {
      return res.status(400).json({
        error: "At least 7 logged days are required to generate weekly insights.",
      });
    }

    const summary = summarizeTimeSeries(logs);
    const laggedPatterns = findLaggedPatterns(logs, 3);
    const streakEffects = findExerciseStreakEffects(logs);
    const chartSeries = buildChartSeries(logs);

    const aiResult = await generateWeeklyNarrative({
      summary,
      laggedPatterns,
      streakEffects,
      chartSeries,
      dateRange: {
        start: logs[0].date.toISOString().slice(0, 10),
        end: logs[logs.length - 1].date.toISOString().slice(0, 10),
      },
    });

    const lastLogDate = new Date(logs[logs.length - 1].date);
    const weekStartDate = new Date(lastLogDate);
    weekStartDate.setUTCDate(lastLogDate.getUTCDate() - 6);
    weekStartDate.setUTCHours(0, 0, 0, 0);

    const snapshot = await saveWeeklyInsightSnapshot({
      userId: req.user.userId,
      weekStartDate,
      weekEndDate: lastLogDate,
      narrative: aiResult.narrative,
      structuredInsights: {
        actionItems: aiResult.actionItems,
        confidence: aiResult.confidence,
        source: aiResult.source,
        laggedPatterns,
        streakEffects,
      },
    });

    return res.json({
      report: {
        narrative: aiResult.narrative,
        actionItems: aiResult.actionItems,
        confidence: aiResult.confidence,
        source: aiResult.source,
      },
      analytics: {
        summary,
        laggedPatterns,
        streakEffects,
        chartSeries,
      },
      snapshotId: snapshot.id,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/insights/history", requireAuth, async (req, res, next) => {
  try {
    const reports = await prisma.weeklyInsight.findMany({
      where: { userId: req.user.userId },
      orderBy: { createdAt: "desc" },
      take: 12,
    });
    res.json({ reports });
  } catch (error) {
    next(error);
  }
});

export default router;
