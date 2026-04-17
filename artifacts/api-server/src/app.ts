import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import router from "./routes/index.js";
import { maintenanceMiddleware } from "./middleware/platform.js";

const app: Express = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({
  verify: (req: any, _res, buf) => {
    if (req.originalUrl.startsWith('/api/payments/webhook')) {
      req.rawBody = buf.toString();
    }
  }
}));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Maintenance mode blocks all user-facing routes; admin routes are exempt
app.use("/api/credits", maintenanceMiddleware);

app.use("/api", router);

export default app;
