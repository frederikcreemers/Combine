import { Tracer } from "convex-tracer";
import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";

export const TRACE_RETENTION_MINUTES = 24 * 60;

export const generationTracer = new Tracer<DataModel>(components.tracer, {
  // Generation is relatively infrequent and these traces are specifically for
  // profiling it, so retain every trace until the cleanup cron removes it.
  sampleRate: 1,
  preserveErrors: true,
  retentionMinutes: TRACE_RETENTION_MINUTES,
});

export const { internalTracedAction } = generationTracer;

export type TracedResult<T> =
  | { success: true; data: T; error: undefined }
  | { success: false; data: undefined; error: string };

export function unwrapTracedResult<T>(result: TracedResult<T>): T {
  if (!result.success) {
    throw new Error(result.error);
  }
  return result.data;
}

export function currentTraceContext(ctx: {
  tracer: {
    getTraceId(): string;
    getSpanId(): string;
  };
}) {
  return {
    traceId: ctx.tracer.getTraceId(),
    spanId: ctx.tracer.getSpanId(),
    sampleRate: generationTracer.sampleRate,
    preserveErrors: generationTracer.preserveErrors,
    retentionMinutes: generationTracer.retentionMinutes,
  };
}
