import { defineApp } from "convex/server";
import rateLimiter from "@convex-dev/rate-limiter/convex.config";
import tracer from "convex-tracer/convex.config";

const app = defineApp();
app.use(rateLimiter);
app.use(tracer);

export default app;
