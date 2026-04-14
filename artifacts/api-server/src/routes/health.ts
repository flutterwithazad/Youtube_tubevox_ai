import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/healthz", async (_req, res) => {
  let dbStatus = "ok";
  try {
    const { pool } = await import("../lib/vps-db.js");
    const result = await pool.query("SELECT 1");
    if (!result.rows.length) dbStatus = "db_error";
  } catch (err: any) {
    console.error("Health check DB error:", err.message);
    dbStatus = "db_unreachable";
  }

  const data = HealthCheckResponse.parse({ status: dbStatus === "ok" ? "ok" : "error" });
  res.status(dbStatus === "ok" ? 200 : 500).json({ ...data, db: dbStatus });
});

export default router;
