"use client";

import { useEffect, useState } from "react";
import type { GeocodingResult } from "@/features/geocoding/types";
import { apiRequest } from "@/lib/api/client";

const searchCache = new Map<string, GeocodingResult[]>();

export function useGeocoding(tripId: string, query: string, delayMs = 450) {
  const normalizedQuery = query.trim();
  const [state, setState] = useState<{
    query: string;
    results: GeocodingResult[];
    loading: boolean;
    error: string;
  }>({ query: "", results: [], loading: false, error: "" });

  useEffect(() => {
    if (normalizedQuery.length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      const cacheKey = normalizedQuery.toLocaleLowerCase("pt-BR");
      const cached = searchCache.get(cacheKey);
      if (cached) {
        setState({
          query: normalizedQuery,
          results: cached,
          loading: false,
          error: "",
        });
        return;
      }

      setState((current) => ({
        ...current,
        query: normalizedQuery,
        loading: true,
        error: "",
      }));
      apiRequest<GeocodingResult[]>(
        `/api/geocoding/search?tripId=${encodeURIComponent(tripId)}&q=${encodeURIComponent(normalizedQuery)}`,
        { signal: controller.signal },
      )
        .then((results) => {
          searchCache.set(cacheKey, results);
          setState({
            query: normalizedQuery,
            results,
            loading: false,
            error: "",
          });
        })
        .catch((cause: unknown) => {
          if (controller.signal.aborted) return;
          setState({
            query: normalizedQuery,
            results: [],
            loading: false,
            error:
              cause instanceof Error
                ? cause.message
                : "Não foi possível buscar locais.",
          });
        });
    }, delayMs);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [delayMs, normalizedQuery, tripId]);

  if (normalizedQuery.length < 2) {
    return { results: [], loading: false, error: "" };
  }
  if (state.query !== normalizedQuery) {
    return { results: [], loading: true, error: "" };
  }
  return state;
}
