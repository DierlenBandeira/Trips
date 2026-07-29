"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createStopsHash,
} from "@/features/routing/route-utils";
import type { RouteResult } from "@/features/routing/types";
import type { TripStop } from "@/features/trips/types";
import { apiRequest, jsonRequest } from "@/lib/api/client";

const routeCache = new Map<string, RouteResult>();

export function useTripRoute(
  tripId: string,
  stops: TripStop[],
  delayMs = 550,
) {
  const routePoints = useMemo(
    () =>
      stops.map(({ latitude, longitude }) => ({ latitude, longitude })),
    [stops],
  );
  const stopsHash = useMemo(() => createStopsHash(routePoints), [routePoints]);
  const [state, setState] = useState<{
    hash: string;
    route: RouteResult | null;
    loading: boolean;
    error: string;
  }>({ hash: "", route: null, loading: false, error: "" });

  useEffect(() => {
    if (routePoints.length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      const cached = routeCache.get(stopsHash);
      if (cached) {
        setState({ hash: stopsHash, route: cached, loading: false, error: "" });
        return;
      }

      setState((current) => ({
        ...current,
        hash: stopsHash,
        loading: true,
        error: "",
      }));
      apiRequest<RouteResult>(
        "/api/routing",
        {
          ...jsonRequest("POST", { tripId, stops: routePoints }),
          signal: controller.signal,
        },
      )
        .then((route) => {
          routeCache.set(stopsHash, route);
          setState({ hash: stopsHash, route, loading: false, error: "" });
        })
        .catch((cause: unknown) => {
          if (controller.signal.aborted) return;
          setState({
            hash: stopsHash,
            route: null,
            loading: false,
            error:
              cause instanceof Error
                ? cause.message
                : "Não foi possível calcular a rota.",
          });
        });
    }, delayMs);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [delayMs, routePoints, stopsHash, tripId]);

  if (routePoints.length < 2) {
    return { route: null, loading: false, error: "" };
  }
  if (state.hash !== stopsHash) {
    return { route: null, loading: true, error: "" };
  }
  return state;
}
