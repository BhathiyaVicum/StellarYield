import { Router, Request, Response } from "express";
import { PROTOCOLS } from "../config/protocols";
import { calculateRiskScore } from "../utils/riskScoring";
import {
  rankStrategies,
  filterByTimeWindow,
  type StrategyInput,
  type TimeWindow,
} from "../services/riskAdjustedYieldService";

const router = Router();

const VALID_TIME_WINDOWS: TimeWindow[] = ["24h", "7d", "30d", "all"];
const CACHE_TTL = 60_000;
let cache: { data: unknown; ts: number } | null = null;

function buildStrategies(): StrategyInput[] {
  const now = new Date().toISOString();
  return PROTOCOLS.map((p) => {
    const riskResult = calculateRiskScore({
      tvlUsd: p.baseTvlUsd,
      ilVolatilityPct: p.volatilityPct,
      protocolAgeDays: p.protocolAgeDays,
    });
    return {
      id: p.protocolName.toLowerCase(),
      name: p.protocolName,
      strategyType: p.protocolType,
      apy: p.baseApyBps / 100,
      tvlUsd: p.baseTvlUsd,
      ilVolatilityPct: p.volatilityPct,
      riskScore: riskResult.score,
      fetchedAt: now,
    };
  });
}

/**
 * GET /api/strategies/leaderboard
 * Returns strategies ranked by risk-adjusted yield.
 *
 * Query params:
 *   timeWindow  — 24h | 7d | 30d | all (default: all)
 *   strategyType — blend | soroswap | defindex | all (default: all)
 */
router.get("/leaderboard", (req: Request, res: Response) => {
  const timeWindow = (req.query.timeWindow as string) || "all";
  if (!VALID_TIME_WINDOWS.includes(timeWindow as TimeWindow)) {
    res.status(400).json({ error: "timeWindow must be one of: 24h, 7d, 30d, all" });
    return;
  }

  const strategyType = (req.query.strategyType as string) || "all";

  const now = Date.now();
  if (
    cache &&
    now - cache.ts < CACHE_TTL &&
    timeWindow === "all" &&
    strategyType === "all"
  ) {
    res.json(cache.data);
    return;
  }

  let strategies = buildStrategies();
  strategies = filterByTimeWindow(strategies, timeWindow as TimeWindow);

  if (strategyType !== "all") {
    strategies = strategies.filter((s) => s.strategyType === strategyType);
  }

  const ranked = rankStrategies(strategies);

  const response = {
    items: ranked,
    filters: { timeWindow, strategyType },
    total: ranked.length,
    scoringMethodology:
      "RAY = APY × (riskScore / 10) / (1 + ilVolatility / 10). Ties resolved by TVL descending.",
  };

  if (timeWindow === "all" && strategyType === "all") {
    cache = { data: response, ts: now };
  }

  res.json(response);
});

export default router;
