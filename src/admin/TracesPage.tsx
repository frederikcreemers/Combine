import { useQuery } from "convex/react";
import { useEffect, useMemo, useState } from "preact/hooks";
import { api } from "../../convex/_generated/api";

type TraceStatus = "pending" | "success" | "error";

type TraceLog = {
  _id: string;
  timestamp: number;
  severity: "info" | "warn" | "error";
  message: string;
  metadata?: Record<string, unknown>;
};

type TraceSpan = {
  _id: string;
  spanName: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: TraceStatus;
  error?: string;
  metadata?: Record<string, unknown>;
  logs?: TraceLog[];
  children?: TraceSpan[];
};

type FlatSpan = TraceSpan & { depth: number };

function formatDateTime(timestamp: number) {
  return new Date(timestamp).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatDuration(duration?: number) {
  if (duration === undefined) return "Running";
  if (duration < 1_000) return `${Math.round(duration)} ms`;
  if (duration < 60_000) return `${(duration / 1_000).toFixed(2)} s`;
  return `${(duration / 60_000).toFixed(1)} min`;
}

function flattenSpans(spans: TraceSpan[], depth = 0): FlatSpan[] {
  return spans.flatMap((span) => [
    { ...span, depth },
    ...flattenSpans(span.children ?? [], depth + 1),
  ]);
}

function statusClasses(status: TraceStatus) {
  if (status === "error") return "bg-red-100 text-red-700";
  if (status === "pending") return "bg-amber-100 text-amber-700";
  return "bg-emerald-100 text-emerald-700";
}

function barClasses(status: TraceStatus, depth: number) {
  if (status === "error") return "bg-red-500";
  if (status === "pending") return "bg-amber-400 animate-pulse";
  return depth === 0 ? "bg-blue-600" : "bg-indigo-400";
}

export function TracesPage() {
  const traces = useQuery(api.traces.listGenerationTraces, { limit: 100 });
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);

  useEffect(() => {
    if (!traces?.length) {
      setSelectedTraceId(null);
      return;
    }
    if (!selectedTraceId || !traces.some((trace) => trace._id === selectedTraceId)) {
      setSelectedTraceId(traces[0]._id);
    }
  }, [traces, selectedTraceId]);

  const trace = useQuery(
    api.traces.getGenerationTrace,
    selectedTraceId ? { traceId: selectedTraceId } : "skip",
  );

  const rows = useMemo(
    () => flattenSpans((trace?.spans ?? []) as TraceSpan[]),
    [trace],
  );
  const timeline = useMemo(() => {
    if (!rows.length) return { start: 0, duration: 1 };
    const start = Math.min(...rows.map((span) => span.startTime));
    const end = Math.max(
      ...rows.map((span) => span.endTime ?? span.startTime + (span.duration ?? 0)),
    );
    return { start, duration: Math.max(end - start, 1) };
  }, [rows]);

  if (traces === undefined) return <div>Loading traces...</div>;

  return (
    <div class="space-y-6">
      <div>
        <h2 class="text-xl font-semibold text-gray-900">Generation traces</h2>
        <p class="mt-1 text-sm text-gray-600">
          Recipe and element-generation actions from the last 24 hours. SVG and
          description spans appear side by side when they run in parallel.
        </p>
      </div>

      {traces.length === 0 ? (
        <div class="rounded-lg bg-white p-8 text-center text-sm text-gray-500 shadow">
          No generation traces yet. Combine two elements to record one.
        </div>
      ) : (
        <div class="grid min-h-[36rem] grid-cols-1 gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <aside class="overflow-hidden rounded-lg bg-white shadow">
            <div class="border-b border-gray-200 px-4 py-3 text-xs font-medium uppercase tracking-wide text-gray-500">
              Recent traces
            </div>
            <div class="max-h-[42rem] overflow-y-auto">
              {traces.map((item) => (
                <button
                  key={item._id}
                  type="button"
                  onClick={() => setSelectedTraceId(item._id)}
                  class={`block w-full border-b border-gray-100 px-4 py-3 text-left hover:bg-gray-50 ${
                    selectedTraceId === item._id ? "bg-blue-50" : "bg-white"
                  }`}
                >
                  <div class="flex items-center justify-between gap-2">
                    <span class="truncate text-sm font-medium text-gray-900">
                      {typeof item.metadata?.ingredient1 === "string" &&
                      typeof item.metadata?.ingredient2 === "string"
                        ? `${item.metadata.ingredient1} + ${item.metadata.ingredient2}`
                        : "Element combination"}
                    </span>
                    <span class={`rounded-full px-2 py-0.5 text-xs ${statusClasses(item.status)}`}>
                      {item.status}
                    </span>
                  </div>
                  {typeof item.metadata?.result === "string" && (
                    <div class="mt-1 truncate text-xs text-gray-600">
                      → {item.metadata.result}
                    </div>
                  )}
                  <div class="mt-1 text-xs text-gray-500">
                    {formatDateTime(item._creationTime)}
                  </div>
                  <div class="mt-1 truncate font-mono text-[10px] text-gray-400" title={item._id}>
                    {item._id}
                  </div>
                </button>
              ))}
            </div>
          </aside>

          <section class="min-w-0 rounded-lg bg-white shadow">
            {trace === undefined ? (
              <div class="p-8 text-sm text-gray-500">Loading trace...</div>
            ) : trace === null ? (
              <div class="p-8 text-sm text-gray-500">This trace has expired.</div>
            ) : (
              <div>
                <div class="border-b border-gray-200 px-5 py-4">
                  <div class="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 class="font-semibold text-gray-900">
                        {typeof trace.metadata?.ingredient1 === "string" &&
                        typeof trace.metadata?.ingredient2 === "string"
                          ? `${trace.metadata.ingredient1} + ${trace.metadata.ingredient2}`
                          : formatDateTime(trace._creationTime)}
                      </h3>
                      <p class="mt-1 text-xs text-gray-500">
                        {typeof trace.metadata?.result === "string" && `→ ${trace.metadata.result} · `}
                        {formatDateTime(trace._creationTime)}
                      </p>
                      <p class="mt-1 font-mono text-[10px] text-gray-400">{trace._id}</p>
                    </div>
                    <span class={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClasses(trace.status)}`}>
                      {trace.status}
                    </span>
                  </div>
                </div>

                <div class="overflow-x-auto p-5">
                  <div class="min-w-[48rem]">
                    <div class="mb-2 grid grid-cols-[18rem_minmax(28rem,1fr)_5rem] gap-3 text-xs font-medium uppercase tracking-wide text-gray-400">
                      <div>Operation</div>
                      <div>Timeline</div>
                      <div class="text-right">Duration</div>
                    </div>
                    <div class="divide-y divide-gray-100 border-y border-gray-100">
                      {rows.map((span) => {
                        const left = ((span.startTime - timeline.start) / timeline.duration) * 100;
                        const spanDuration = span.duration ?? Math.max(Date.now() - span.startTime, 1);
                        const width = Math.max((spanDuration / timeline.duration) * 100, 0.4);
                        return (
                          <div key={span._id} class="grid grid-cols-[18rem_minmax(28rem,1fr)_5rem] items-center gap-3 py-2">
                            <div class="min-w-0" style={{ paddingLeft: `${span.depth * 16}px` }}>
                              <div class="truncate text-sm text-gray-900" title={span.spanName}>
                                {span.spanName}
                              </div>
                              {span.error && (
                                <div class="truncate text-xs text-red-600" title={span.error}>{span.error}</div>
                              )}
                            </div>
                            <div class="relative h-7 overflow-hidden rounded bg-gray-100">
                              <div
                                class={`absolute top-1 h-5 min-w-px rounded ${barClasses(span.status, span.depth)}`}
                                style={{ left: `${left}%`, width: `${Math.min(width, 100 - left)}%` }}
                                title={`${span.spanName}: ${formatDuration(span.duration)}`}
                              />
                            </div>
                            <div class="text-right text-xs tabular-nums text-gray-600">
                              {formatDuration(span.duration)}
                            </div>
                          </div>
                        );
                      })}
                      {rows.length === 0 && (
                        <div class="py-8 text-center text-sm text-gray-500">No spans recorded.</div>
                      )}
                    </div>
                  </div>
                </div>

                {rows.some((span) => (span.logs?.length ?? 0) > 0) && (
                  <div class="border-t border-gray-200 px-5 py-4">
                    <h4 class="mb-3 text-sm font-semibold text-gray-900">Logs</h4>
                    <div class="space-y-2">
                      {rows.flatMap((span) =>
                        (span.logs ?? []).map((log) => (
                          <div key={log._id} class="flex gap-3 text-xs">
                            <span class="w-20 shrink-0 text-gray-400">
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </span>
                            <span class={log.severity === "error" ? "text-red-600" : log.severity === "warn" ? "text-amber-700" : "text-gray-700"}>
                              <strong>{span.spanName}:</strong> {log.message}
                            </span>
                          </div>
                        )),
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
