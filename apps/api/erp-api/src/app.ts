import express from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { env } from "./config/env.js";
import { errorHandler, notFound } from "./lib/http.js";
import { authRouter } from "./features/auth/routes.js";
import { authenticate } from "./features/auth/middleware.js";
import { brandsRouter, categoriesRouter, productsRouter } from "./features/catalog/routes.js";
import { partiesRouter } from "./features/parties/routes.js";
import { salesRouter } from "./features/sales/routes.js";
import { dashboardRouter } from "./features/dashboard/routes.js";
import { rolesRouter } from "./features/auth/roles-routes.js";
import { aiRouter } from "./features/ai/routes.js";
import { requestContext } from "./lib/observability.js";
import { auditRouter } from "./features/audit/routes.js";
import { masterDataRouter } from "./features/master-data/routes.js";
import { purchasingRouter } from "./features/purchasing/routes.js";
import { accountingRouter } from "./features/accounting/routes.js";
import { financeRouter } from "./features/finance/routes.js";
import { selfServiceRouter } from "./features/auth/self-service-routes.js";
import { crmRouter } from "./features/crm/routes.js";
import { storefrontRouter } from "./features/storefront/routes.js";
import { publicStorefrontRouter } from "./features/storefront/public-routes.js";
import { commerceRouter } from "./features/commerce/routes.js";
import { jobsRouter } from "./features/jobs/routes.js";
import { storefrontSeoRouter } from "./features/storefront/seo-routes.js";
import { attendanceRouter } from "./features/attendance/routes.js";
import { hrRouter } from "./features/hr/routes.js";
import { reportsRouter } from "./features/reports/routes.js";
import { payrollRouter } from "./features/payroll/routes.js";
import { platformRouter } from "./features/platform/routes.js";
import { pool } from "./db/client.js";

let acceptingTraffic = true;
export function setAcceptingTraffic(value: boolean) {
  acceptingTraffic = value;
}

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  if (env.TRUST_PROXY > 0) app.set("trust proxy", env.TRUST_PROXY);
  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN.split(",").map((origin) => origin.trim()),
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(requestContext);

  app.get("/api/health", (_request, response) =>
    response.json({ data: { status: "ok", service: "erp-api" } }),
  );
  app.get("/api/ready", async (_request, response) => {
    if (!acceptingTraffic)
      return response
        .status(503)
        .json({ error: { code: "DRAINING", message: "Service is draining" } });
    try {
      await pool.query("SELECT 1");
      return response.json({ data: { status: "ready", service: "erp-api" } });
    } catch {
      return response
        .status(503)
        .json({
          error: { code: "NOT_READY", message: "Database unavailable" },
        });
    }
  });
  app.use(
    "/api/auth",
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 20,
      standardHeaders: "draft-8",
      legacyHeaders: false,
    }),
  );
  app.use(storefrontSeoRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/storefront/ai", storefrontRouter);
  app.use("/api/storefront", publicStorefrontRouter);
  app.use("/api", authenticate);
  app.use("/api/products", productsRouter);
  app.use("/api/commerce", commerceRouter);
  app.use("/api/jobs", jobsRouter);
  app.use("/api/attendance", attendanceRouter);
  app.use("/api/hr", hrRouter);
  app.use("/api/reports", reportsRouter);
  app.use("/api/payroll", payrollRouter);
  app.use("/api/platform", platformRouter);
  app.use("/api/categories", categoriesRouter);
  app.use("/api/brands", brandsRouter);
  app.use("/api", partiesRouter);
  app.use("/api/sales", salesRouter);
  app.use("/api/dashboard", dashboardRouter);
  app.use("/api/roles", rolesRouter);
  app.use("/api/self-service", selfServiceRouter);
  app.use("/api/ai", aiRouter);
  app.use("/api/audit", auditRouter);
  app.use("/api/master-data", masterDataRouter);
  app.use("/api", purchasingRouter);
  app.use("/api/accounting", accountingRouter);
  app.use("/api/finance", financeRouter);
  app.use("/api/crm", crmRouter);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
