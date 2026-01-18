import { RateLimiter } from "@convex-dev/rate-limiter";
import { components } from "./_generated/api";

// Calculate milliseconds for a day
const DAY = 24 * 60 * 60 * 1000;

// Calculate start time for midnight UTC today
function getMidnightUTC(): number {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setUTCHours(0, 0, 0, 0);
  return midnight.getTime();
}

export const rateLimiter = new RateLimiter(components.rateLimiter, {
  // 20 new element discoveries per day, resetting at midnight UTC
  newElements: {
    kind: "fixed window",
    rate: 20,
    period: DAY,
    start: getMidnightUTC(),
  },
});
