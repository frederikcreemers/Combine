/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as ai from "../ai.js";
import type * as aiCostLogs from "../aiCostLogs.js";
import type * as auth from "../auth.js";
import type * as crons from "../crons.js";
import type * as elements from "../elements.js";
import type * as energy from "../energy.js";
import type * as game from "../game.js";
import type * as http from "../http.js";
import type * as initialElements from "../initialElements.js";
import type * as recipes from "../recipes.js";
import type * as tracer from "../tracer.js";
import type * as traces from "../traces.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  ai: typeof ai;
  aiCostLogs: typeof aiCostLogs;
  auth: typeof auth;
  crons: typeof crons;
  elements: typeof elements;
  energy: typeof energy;
  game: typeof game;
  http: typeof http;
  initialElements: typeof initialElements;
  recipes: typeof recipes;
  tracer: typeof tracer;
  traces: typeof traces;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  rateLimiter: {
    lib: {
      checkRateLimit: FunctionReference<
        "query",
        "internal",
        {
          config:
            | {
                capacity?: number;
                kind: "token bucket";
                maxReserved?: number;
                period: number;
                rate: number;
                shards?: number;
                start?: null;
              }
            | {
                capacity?: number;
                kind: "fixed window";
                maxReserved?: number;
                period: number;
                rate: number;
                shards?: number;
                start?: number;
              };
          count?: number;
          key?: string;
          name: string;
          reserve?: boolean;
          throws?: boolean;
        },
        { ok: true; retryAfter?: number } | { ok: false; retryAfter: number }
      >;
      clearAll: FunctionReference<
        "mutation",
        "internal",
        { before?: number },
        null
      >;
      getServerTime: FunctionReference<"mutation", "internal", {}, number>;
      getValue: FunctionReference<
        "query",
        "internal",
        {
          config:
            | {
                capacity?: number;
                kind: "token bucket";
                maxReserved?: number;
                period: number;
                rate: number;
                shards?: number;
                start?: null;
              }
            | {
                capacity?: number;
                kind: "fixed window";
                maxReserved?: number;
                period: number;
                rate: number;
                shards?: number;
                start?: number;
              };
          key?: string;
          name: string;
          sampleShards?: number;
        },
        {
          config:
            | {
                capacity?: number;
                kind: "token bucket";
                maxReserved?: number;
                period: number;
                rate: number;
                shards?: number;
                start?: null;
              }
            | {
                capacity?: number;
                kind: "fixed window";
                maxReserved?: number;
                period: number;
                rate: number;
                shards?: number;
                start?: number;
              };
          shard: number;
          ts: number;
          value: number;
        }
      >;
      rateLimit: FunctionReference<
        "mutation",
        "internal",
        {
          config:
            | {
                capacity?: number;
                kind: "token bucket";
                maxReserved?: number;
                period: number;
                rate: number;
                shards?: number;
                start?: null;
              }
            | {
                capacity?: number;
                kind: "fixed window";
                maxReserved?: number;
                period: number;
                rate: number;
                shards?: number;
                start?: number;
              };
          count?: number;
          key?: string;
          name: string;
          reserve?: boolean;
          throws?: boolean;
        },
        { ok: true; retryAfter?: number } | { ok: false; retryAfter: number }
      >;
      resetRateLimit: FunctionReference<
        "mutation",
        "internal",
        { key?: string; name: string },
        null
      >;
    };
    time: {
      getServerTime: FunctionReference<"mutation", "internal", {}, number>;
    };
  };
  tracer: {
    lib: {
      addLog: FunctionReference<
        "mutation",
        "internal",
        {
          log: {
            message: string;
            metadata?: Record<string, any>;
            severity: "info" | "warn" | "error";
            timestamp: number;
          };
          spanId: string;
        },
        string
      >;
      cleanupTrace: FunctionReference<
        "mutation",
        "internal",
        { traceId: string },
        null
      >;
      completeSpan: FunctionReference<
        "mutation",
        "internal",
        {
          duration: number;
          endTime: number;
          error?: string;
          result?: any;
          spanId: string;
          status: "success" | "error";
        },
        null
      >;
      createSpan: FunctionReference<
        "mutation",
        "internal",
        {
          span: {
            args?: any;
            functionName?: string;
            parentSpanId?: string;
            source: "frontend" | "backend";
            spanName: string;
            startTime: number;
            status: "pending" | "success" | "error";
          };
          traceId: string;
        },
        string
      >;
      createTrace: FunctionReference<
        "mutation",
        "internal",
        {
          metadata?: Record<string, any>;
          sampleRate: number;
          source: "frontend" | "backend";
          status: "pending" | "success" | "error";
          userId: "anonymous" | string;
        },
        string
      >;
      getTrace: FunctionReference<
        "query",
        "internal",
        { traceId: string },
        null | {
          _creationTime: number;
          _id: string;
          functionName?: string;
          metadata?: Record<string, any>;
          preserve?: boolean;
          sampleRate: number;
          spans: Array<{
            _creationTime: number;
            _id: string;
            args?: any;
            children?: Array<any>;
            duration?: number;
            endTime?: number;
            error?: string;
            functionName?: string;
            logs?: Array<{
              _creationTime: number;
              _id: string;
              message: string;
              metadata?: Record<string, any>;
              severity: "info" | "warn" | "error";
              spanId: string;
              timestamp: number;
            }>;
            metadata?: Record<string, any>;
            parentSpanId?: string;
            result?: any;
            source: "frontend" | "backend";
            spanName: string;
            startTime: number;
            status: "pending" | "success" | "error";
            traceId: string;
          }>;
          status: "pending" | "success" | "error";
          updatedAt: number;
          userId?: string;
        }
      >;
      listTraces: FunctionReference<
        "query",
        "internal",
        {
          limit?: number;
          status?: "pending" | "success" | "error";
          userId?: string;
        },
        Array<{
          _creationTime: number;
          _id: string;
          functionName?: string;
          metadata?: Record<string, any>;
          preserve?: boolean;
          sampleRate: number;
          status: "pending" | "success" | "error";
          updatedAt: number;
          userId?: string;
        }>
      >;
      searchTraces: FunctionReference<
        "query",
        "internal",
        {
          functionName: string;
          limit?: number;
          status?: "pending" | "success" | "error";
          userId?: string;
        },
        Array<{
          _creationTime: number;
          _id: string;
          functionName?: string;
          metadata?: Record<string, any>;
          preserve?: boolean;
          sampleRate: number;
          status: "pending" | "success" | "error";
          updatedAt: number;
          userId?: string;
        }>
      >;
      updateSpanMetadata: FunctionReference<
        "mutation",
        "internal",
        { metadata: Record<string, any>; spanId: string },
        null
      >;
      updateTraceMetadata: FunctionReference<
        "mutation",
        "internal",
        { metadata: Record<string, any>; traceId: string },
        null
      >;
      updateTracePreserve: FunctionReference<
        "mutation",
        "internal",
        { preserve?: boolean; sampleRate?: number; traceId: string },
        null
      >;
      updateTraceStatus: FunctionReference<
        "mutation",
        "internal",
        { status: "pending" | "success" | "error"; traceId: string },
        null
      >;
      verifySpan: FunctionReference<
        "query",
        "internal",
        { spanId: string },
        boolean
      >;
      verifyTrace: FunctionReference<
        "query",
        "internal",
        { traceId: string },
        boolean
      >;
    };
  };
};
