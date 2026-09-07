import express from "express";
import cors from "cors";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "./router";
import "./db/seed";

const app = express();
app.use(cors());
app.use("/trpc", createExpressMiddleware({ router: appRouter }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Parking Finder API running on port ${PORT}`);
});