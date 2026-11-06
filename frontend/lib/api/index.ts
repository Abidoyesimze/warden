"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { WardenApi } from "./client";
import { ApiError } from "./client";
import { createDemoApi } from "./demo";
import { createHttpApi } from "./http";

export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE !== "false";

export const api: WardenApi = DEMO_MODE
  ? createDemoApi()
  : createHttpApi("/backend"); // proxied to NEXT_PUBLIC_API_URL by next.config.ts

export interface QueryState<T> {
  data: T | undefined;
  error: { message: string; action?: string } | null;
  loading: boolean;
  reload: () => void;
}

export function toUserError(e: unknown): { message: string; action?: string } {
  if (e instanceof ApiError) return { message: e.message, action: e.action };
  if (e instanceof Error) return { message: e.message };
  return { message: "Something went wrong." };
}

/** Loads data and reloads it whenever the API signals a change (demo store events or live polling). */
export function useQuery<T>(key: string, fn: () => Promise<T>): QueryState<T> {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<QueryState<T>["error"]>(null);
  const [loading, setLoading] = useState(true);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const load = useCallback(() => {
    let alive = true;
    fnRef
      .current()
      .then((d) => {
        if (!alive) return;
        setData(d);
        setError(null);
      })
      .catch((e: unknown) => alive && setError(toUserError(e)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    setLoading(true);
    const cancel = load();
    const unsub = api.subscribe(() => load());
    return () => {
      cancel();
      unsub();
    };
  }, [key, load]);

  return { data, error, loading, reload: load };
}

export type * from "./types";
