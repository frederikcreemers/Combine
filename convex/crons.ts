import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.daily(
  "delete old AI cost logs",
  { hourUTC: 4, minuteUTC: 17 },
  internal.aiCostLogs.deleteOldLogs
);

export default crons;
