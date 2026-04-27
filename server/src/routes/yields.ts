import { Router } from "express";
import { getYieldData } from "../services/yieldService";
import { sendError } from "../utils/errorResponse";
import {
  CURRENT_YIELDS_TTL_SECONDS,
  getYieldDataWithCacheStatus,
} from "../services/yieldService";

const yieldsRouter = Router();

yieldsRouter.get("/", async (_req, res) => {
  try {
    const { data: yields, cacheStatus } = await getYieldDataWithCacheStatus();
    res.setHeader(
      "Cache-Control",
      `public, max-age=${CURRENT_YIELDS_TTL_SECONDS}, stale-while-revalidate=30`,
    );
    res.setHeader("X-Cache-Status", cacheStatus);
    res.json(yields);
  } catch (error) {
    console.error("Failed to serve /api/yields.", error);
    sendError(res, 500, "YIELD_FETCH_FAILED", "Unable to fetch yield data right now.");
    res.status(500).json({
      error: "Unable to fetch yield data right now.",
      requestId: (_req as unknown as { requestId?: string }).requestId,
    });
  }
});

export default yieldsRouter;
