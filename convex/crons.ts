import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.daily(
  "delete old AI cost logs",
  { hourUTC: 4, minuteUTC: 17 },
  internal.aiCostLogs.deleteOldLogs
);

crons.hourly(
  "delete generation traces older than one day",
  { minuteUTC: 37 },
  internal.traces.deleteOldGenerationTraces,
);

crons.daily(
  "delete inactive anonymous users",
  { hourUTC: 4, minuteUTC: 47 },
  internal.users.cleanupInactiveAnonymousUsers,
  {},
);

export default crons;
