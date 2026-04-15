import Groq from "groq-sdk";

const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const hasGroq = Boolean(process.env.GROQ_API_KEY);
const groq = hasGroq ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;

function buildFallbackNarrative({ summary, laggedPatterns, streakEffects }) {
  const strongestPattern = laggedPatterns[0];
  const strongestStreak = streakEffects.find((item) => item.streakLength >= 2);

  const lines = [
    "Weekly personal health insight report:",
    `You logged ${summary.focus.samples} focus samples, ${summary.mood.samples} mood samples, and ${summary.sleepHours.samples} sleep entries.`,
  ];

  if (strongestPattern) {
    lines.push(
      `Strongest time-lagged signal: ${strongestPattern.sourceMetric} shows a ${strongestPattern.direction} relationship with ${strongestPattern.targetMetric} after ${strongestPattern.lagDays} day(s) (corr ${strongestPattern.correlation}).`,
    );
  }

  if (strongestStreak && strongestStreak.moodAvg) {
    lines.push(
      `Exercise streak effect: around ${strongestStreak.streakLength}+ day streaks, average mood rises to ${strongestStreak.moodAvg.toFixed(1)}.`,
    );
  }

  lines.push(
    "Small experiment for next week: keep sleep schedule steady for 3 days and log focus in the afternoon to validate lag effects.",
  );

  return lines.join(" ");
}

function parseJsonFromModel(content) {
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}

export async function generateWeeklyNarrative(input) {
  if (!groq) {
    return {
      narrative: buildFallbackNarrative(input),
      actionItems: [
        "Log sleep and focus at consistent times for 7 days.",
        "Aim for two consecutive exercise days and compare mood/focus shifts.",
        "Increase water intake by 0.5L on low-energy days and track impact.",
      ],
      confidence: "low",
      source: "fallback",
    };
  }

  const systemPrompt =
    "You are a health-habit intelligence assistant. Use ONLY provided data. Be specific, conservative, and non-diagnostic. Return strict JSON.";
  const userPrompt = JSON.stringify({
    instruction:
      "Generate a weekly narrative insight report with trend interpretation, lag effects, and 3 small evidence-aware habit experiments.",
    data: input,
    outputSchema: {
      narrative: "string",
      actionItems: ["string", "string", "string"],
      confidence: "low|medium|high",
    },
  });

  const completion = await groq.chat.completions.create({
    model: GROQ_MODEL,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  const content = completion.choices?.[0]?.message?.content?.trim();
  const parsed = content ? parseJsonFromModel(content) : null;

  if (parsed?.narrative && Array.isArray(parsed?.actionItems)) {
    return {
      narrative: parsed.narrative,
      actionItems: parsed.actionItems.slice(0, 3),
      confidence: parsed.confidence || "medium",
      source: "groq",
    };
  }

  return {
    narrative: buildFallbackNarrative(input),
    actionItems: [
      "Track sleep consistency for 7 days.",
      "Try 2-day exercise streaks and monitor mood.",
      "Log hydration changes on low-energy days.",
    ],
    confidence: "low",
    source: "fallback",
  };
}
