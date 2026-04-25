import { Router } from "express";
import { getYieldData } from "../services/yieldService";
import { sendError } from "../utils/errorResponse";

const yieldsRouter = Router();

yieldsRouter.get("/", async (_req, res) => {
  try {
    const yields = await getYieldData();
    res.json(yields);
  } catch (error) {
    console.error("Failed to serve /api/yields.", error);
    sendError(res, 500, "YIELD_FETCH_FAILED", "Unable to fetch yield data right now.");
  }
});

export default yieldsRouter;
