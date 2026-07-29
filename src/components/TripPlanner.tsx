"use client";

import {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import {
  Check,
  CircleAlert,
  LoaderCircle,
  MapPinned,
  Menu,
  Plus,
  Save,
  Share2,
} from "lucide-react";
import { DestinationPanel } from "@/components/trip/DestinationPanel";
import { TripKpiCard } from "@/components/trip/TripKpiCard";
import { TripMap } from "@/components/map/TripMap";
import { tripReducer } from "@/features/trips/trip-state";
import type {
  Currency,
  SaveStatus,
  Trip,
  TripStop,
} from "@/features/trips/types";
import type { GeocodingResult } from "@/features/geocoding/types";
import {
  mergeStopChanges,
  stopChangesToPayload,
  tripToUpdatePayload,
} from "@/features/trips/persistence";
import { useTripRoute } from "@/hooks/use-trip-route";
import { apiRequest, jsonRequest } from "@/lib/api/client";

export function TripPlanner({ tripId }: { tripId: string }) {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    apiRequest<Trip>(`/api/trips/${tripId}`)
      .then((data) => {
        if (active) setTrip(data);
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(
            cause instanceof Error ? cause.message : "Acesso não autorizado.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, [tripId]);

  if (error && !trip) {
    return (
      <main id="main-content" className="state-page">
        <section className="state-card">
          <CircleAlert size={32} />
          <h1>Acesso indisponível</h1>
          <p>{error}</p>
          <Link href="/">Criar outra viagem</Link>
        </section>
      </main>
    );
  }

  if (!trip) {
    return (
      <main id="main-content" className="state-page">
        <LoaderCircle className="spin" aria-label="Carregando roteiro" />
      </main>
    );
  }

  return <TripWorkspace initialTrip={trip} />;
}

function TripWorkspace({ initialTrip }: { initialTrip: Trip }) {
  const [state, dispatch] = useReducer(tripReducer, {
    trip: initialTrip,
    selectedStopId: initialTrip.stops[0]?.id ?? null,
  });
  const [busy, setBusy] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [error, setError] = useState("");
  const [shareFeedback, setShareFeedback] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [panelOpen, setPanelOpen] = useState(true);
  const trip = state.trip;
  const latestTripRef = useRef(trip);
  const tripDirtyRef = useRef(false);
  const tripRevisionRef = useRef(0);
  const pendingStopChangesRef = useRef(
    new Map<string, Partial<TripStop>>(),
  );
  const stopSaveTimersRef = useRef(new Map<string, number>());
  const activeSavesRef = useRef(0);
  const saveFailedRef = useRef(false);
  useEffect(() => {
    latestTripRef.current = trip;
  }, [trip]);
  const routing = useTripRoute(trip.id, trip.stops);
  const selectStop = useCallback((stopId: string) => {
    dispatch({ type: "select-stop", stopId });
  }, []);

  const addStop = useCallback(
    async (input: {
      placeName: string;
      country: string;
      region?: string;
      formattedAddress?: string;
      latitude: number;
      longitude: number;
    }) => {
      setBusy(true);
      setError("");
      try {
        const stop = await apiRequest<TripStop>(
          `/api/trips/${trip.id}/stops`,
          jsonRequest("POST", {
            position: trip.stops.length,
            placeName: input.placeName,
            country: input.country || null,
            region: input.region || null,
            formattedAddress: input.formattedAddress || null,
            latitude: input.latitude,
            longitude: input.longitude,
            nightlyCost: 0,
            nights: 1,
          }),
        );
        dispatch({ type: "add-stop", stop });
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Não foi possível adicionar o destino.",
        );
        throw cause;
      } finally {
        setBusy(false);
      }
    },
    [trip.id, trip.stops.length],
  );

  const addMapPoint = useCallback(
    async (coordinates: { latitude: number; longitude: number }) => {
      setBusy(true);
      let result: GeocodingResult | null = null;
      try {
        result = await apiRequest<GeocodingResult | null>(
          `/api/geocoding/reverse?tripId=${encodeURIComponent(trip.id)}&lat=${coordinates.latitude}&lon=${coordinates.longitude}`,
        );
      } catch {
        // Reverse geocoding is an enhancement; coordinates remain usable.
      }
      try {
        await addStop({
          placeName:
            result?.placeName || `Ponto no mapa ${trip.stops.length + 1}`,
          country: result?.country || "",
          region: result?.region || undefined,
          formattedAddress: result?.formattedAddress,
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
        });
      } catch {
        // addStop already exposes a user-facing error.
      } finally {
        setBusy(false);
      }
    },
    [addStop, trip.id, trip.stops.length],
  );

  const beginSave = useCallback(() => {
    if (activeSavesRef.current === 0) saveFailedRef.current = false;
    activeSavesRef.current += 1;
    setSaveStatus("saving");
  }, []);

  const finishSave = useCallback((success: boolean) => {
    if (!success) saveFailedRef.current = true;
    activeSavesRef.current = Math.max(0, activeSavesRef.current - 1);
    if (activeSavesRef.current > 0) return;
    if (saveFailedRef.current) {
      setSaveStatus("error");
    } else if (
      tripDirtyRef.current ||
      pendingStopChangesRef.current.size > 0
    ) {
      setSaveStatus("dirty");
    } else {
      setSaveStatus("saved");
    }
  }, []);

  const persistStop = useCallback(
    async (stopId: string, changes: Partial<TripStop>) => {
      beginSave();
      try {
        const updated = await apiRequest<TripStop>(
          `/api/trips/${trip.id}/stops/${stopId}`,
          {
            ...jsonRequest("PATCH", stopChangesToPayload(changes)),
            keepalive: true,
          },
        );
        dispatch({
          type: "update-stop",
          stopId,
          changes: {
            updated_at: updated.updated_at,
            ...changes,
            ...pendingStopChangesRef.current.get(stopId),
          },
        });
        finishSave(true);
        return true;
      } catch (cause) {
        pendingStopChangesRef.current.set(
          stopId,
          mergeStopChanges(
            changes,
            pendingStopChangesRef.current.get(stopId) || {},
          ),
        );
        setError(
          cause instanceof Error ? cause.message : "Não foi possível salvar.",
        );
        finishSave(false);
        return false;
      }
    },
    [beginSave, finishSave, trip.id],
  );

  const queueStopSave = useCallback(
    (stopId: string, changes: Partial<TripStop>) => {
      dispatch({ type: "update-stop", stopId, changes });
      pendingStopChangesRef.current.set(
        stopId,
        mergeStopChanges(
          pendingStopChangesRef.current.get(stopId),
          changes,
        ),
      );
      const currentTimer = stopSaveTimersRef.current.get(stopId);
      if (currentTimer) window.clearTimeout(currentTimer);
      const timer = window.setTimeout(() => {
        const pending = pendingStopChangesRef.current.get(stopId);
        pendingStopChangesRef.current.delete(stopId);
        stopSaveTimersRef.current.delete(stopId);
        if (pending) void persistStop(stopId, pending);
      }, 900);
      stopSaveTimersRef.current.set(stopId, timer);
      setSaveStatus("dirty");
    },
    [persistStop],
  );

  const flushStopSave = useCallback(
    async (stopId: string, changes: Partial<TripStop>) => {
      const currentTimer = stopSaveTimersRef.current.get(stopId);
      if (currentTimer) window.clearTimeout(currentTimer);
      stopSaveTimersRef.current.delete(stopId);
      const pending = {
        ...pendingStopChangesRef.current.get(stopId),
        ...changes,
      };
      pendingStopChangesRef.current.delete(stopId);
      await persistStop(stopId, pending);
    },
    [persistStop],
  );

  async function removeStop(stopId: string) {
    const pendingTimer = stopSaveTimersRef.current.get(stopId);
    if (pendingTimer) window.clearTimeout(pendingTimer);
    stopSaveTimersRef.current.delete(stopId);
    pendingStopChangesRef.current.delete(stopId);
    setBusy(true);
    setError("");
    try {
      await apiRequest(`/api/trips/${trip.id}/stops/${stopId}`, {
        method: "DELETE",
      });
      dispatch({ type: "remove-stop", stopId });
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Não foi possível remover.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function reorder(stopIds: string[]) {
    const previousIds = trip.stops.map((stop) => stop.id);
    dispatch({ type: "reorder-stops", stopIds });
    beginSave();
    try {
      const stops = await apiRequest<TripStop[]>(
        `/api/trips/${trip.id}/stops/reorder`,
        jsonRequest("PUT", { stopIds }),
      );
      dispatch({
        type: "reorder-stops",
        stopIds: stops.map((stop) => stop.id),
      });
      finishSave(true);
    } catch (cause) {
      dispatch({ type: "reorder-stops", stopIds: previousIds });
      setError(
        cause instanceof Error ? cause.message : "Não foi possível reordenar.",
      );
      finishSave(false);
    }
  }

  const persistTrip = useCallback(async () => {
    const revision = tripRevisionRef.current;
    beginSave();
    setError("");
    try {
      const updated = await apiRequest<Trip>(
        `/api/trips/${trip.id}`,
        {
          ...jsonRequest(
            "PATCH",
            tripToUpdatePayload({
              name: trip.name,
              currency: trip.currency,
              travelers_count: trip.travelers_count,
            }),
          ),
          keepalive: true,
        },
      );
      if (tripRevisionRef.current === revision) {
        tripDirtyRef.current = false;
        dispatch({ type: "update-trip", changes: updated });
      }
      finishSave(true);
      return true;
    } catch (cause) {
      tripDirtyRef.current = true;
      setError(
        cause instanceof Error ? cause.message : "Não foi possível salvar.",
      );
      finishSave(false);
      return false;
    }
  }, [
    beginSave,
    finishSave,
    trip.currency,
    trip.id,
    trip.name,
    trip.travelers_count,
  ]);

  useEffect(() => {
    if (!tripDirtyRef.current) return;
    const timer = window.setTimeout(() => {
      void persistTrip();
    }, 1100);
    return () => window.clearTimeout(timer);
  }, [persistTrip]);

  async function saveAll() {
    const pendingStops = [...pendingStopChangesRef.current.entries()];
    pendingStopChangesRef.current.clear();
    stopSaveTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    stopSaveTimersRef.current.clear();
    await Promise.all([
      persistTrip(),
      ...pendingStops.map(([stopId, changes]) =>
        persistStop(stopId, changes),
      ),
    ]);
  }

  useEffect(() => {
    const timerMap = stopSaveTimersRef.current;
    const flushOnExit = () => {
      const currentTrip = latestTripRef.current;
      if (tripDirtyRef.current) {
        void fetch(`/api/trips/${currentTrip.id}`, {
          ...jsonRequest("PATCH", tripToUpdatePayload(currentTrip)),
          keepalive: true,
        });
      }
      pendingStopChangesRef.current.forEach((changes, stopId) => {
        void fetch(`/api/trips/${currentTrip.id}/stops/${stopId}`, {
          ...jsonRequest("PATCH", stopChangesToPayload(changes)),
          keepalive: true,
        });
      });
    };
    window.addEventListener("pagehide", flushOnExit);
    return () => {
      window.removeEventListener("pagehide", flushOnExit);
      timerMap.forEach((timer) => window.clearTimeout(timer));
      flushOnExit();
    };
  }, [trip.id]);

  async function shareTrip() {
    setBusy(true);
    setShareFeedback("");
    try {
      const updated = await apiRequest<Trip>(
        `/api/trips/${trip.id}`,
        jsonRequest("PATCH", {
          visibility: "unlisted",
          regenerateShareToken: !trip.share_token,
        }),
      );
      dispatch({ type: "update-trip", changes: updated });
      if (updated.share_token) {
        const url = `${window.location.origin}/trip/${encodeURIComponent(
          updated.slug,
        )}#share=${encodeURIComponent(updated.share_token)}`;
        setShareUrl(url);
        const copied = await copyToClipboard(url);
        setShareFeedback(
          copied ? "Link copiado" : "Link pronto — copie abaixo",
        );
        if (copied) {
          window.setTimeout(() => {
            setShareFeedback("");
            setShareUrl("");
          }, 3500);
        }
      }
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível compartilhar.",
      );
    } finally {
      setBusy(false);
    }
  }

  function changeTrip(changes: Partial<Trip>) {
    tripRevisionRef.current += 1;
    tripDirtyRef.current = true;
    dispatch({ type: "update-trip", changes });
    setSaveStatus("dirty");
  }

  return (
    <main id="main-content" className="trip-workspace">
      <header className="workspace-header">
        <Link href="/" className="brand-mark" aria-label="Trip Planner — início">
          <MapPinned size={23} />
        </Link>
        <div className="trip-name-field">
          <label htmlFor="trip-name">Nome da viagem</label>
          <input
            id="trip-name"
            value={trip.name}
            onChange={(event) => changeTrip({ name: event.target.value })}
          />
        </div>
        <div className={`save-state state-${saveStatus}`} aria-live="polite">
          <SaveStatusIcon status={saveStatus} />
          <span>{saveStatusLabel(saveStatus)}</span>
        </div>
        <div className="workspace-actions">
          <Link href="/" className="button ghost">
            <Plus size={17} /> <span>Nova viagem</span>
          </Link>
          <button
            type="button"
            className="button secondary"
            disabled={busy}
            onClick={shareTrip}
          >
            {shareFeedback ? <Check size={17} /> : <Share2 size={17} />}
            <span>{shareFeedback || "Compartilhar"}</span>
          </button>
          <button
            type="button"
            className="button primary"
            disabled={saveStatus === "saving"}
            onClick={saveAll}
          >
            <Save size={17} /> <span>Salvar</span>
          </button>
          <button
            type="button"
            className="mobile-panel-button"
            aria-label="Abrir destinos"
            aria-expanded={panelOpen}
            onClick={() => setPanelOpen((open) => !open)}
          >
            <Menu size={20} />
          </button>
        </div>
      </header>

      {error && <div className="workspace-error" role="alert">{error}</div>}
      {shareUrl && (
        <div className="share-toast" role="status" aria-live="polite">
          <Check size={17} />
          <span>{shareFeedback}</span>
          <input
            value={shareUrl}
            readOnly
            aria-label="Link público da viagem"
            onFocus={(event) => event.currentTarget.select()}
          />
          <button
            type="button"
            aria-label="Fechar"
            onClick={() => {
              setShareFeedback("");
              setShareUrl("");
            }}
          >
            ×
          </button>
        </div>
      )}

      <div className={`workspace-body${panelOpen ? " panel-open" : ""}`}>
        <DestinationPanel
          tripId={trip.id}
          stops={trip.stops}
          currency={trip.currency}
          selectedStopId={state.selectedStopId}
          busy={busy}
          onAdd={addStop}
          onRemove={removeStop}
          onChange={queueStopSave}
          onUpdate={flushStopSave}
          onSelect={selectStop}
          onReorder={reorder}
        />
        <section className="map-area">
          <TripMap
            stops={trip.stops}
            currency={trip.currency}
            selectedStopId={state.selectedStopId}
            onSelectStop={selectStop}
            onAddPoint={addMapPoint}
            route={routing.route}
            routeLoading={routing.loading}
          />
          <div className="trip-settings" aria-label="Configurações da viagem">
            <label>
              Moeda
              <select
                value={trip.currency}
                onChange={(event) =>
                  changeTrip({ currency: event.target.value as Currency })
                }
              >
                <option value="EUR">EUR</option>
                <option value="BRL">BRL</option>
                <option value="USD">USD</option>
                <option value="GBP">GBP</option>
              </select>
            </label>
            <label>
              Viajantes
              <input
                type="number"
                min="1"
                max="100"
                value={trip.travelers_count}
                onChange={(event) =>
                  changeTrip({
                    travelers_count: Math.max(1, Number(event.target.value)),
                  })
                }
              />
            </label>
          </div>
          <TripKpiCard
            stops={trip.stops}
            travelersCount={trip.travelers_count}
            currency={trip.currency}
          />
        </section>
      </div>
    </main>
  );
}

function SaveStatusIcon({ status }: { status: SaveStatus }) {
  if (status === "saving") return <LoaderCircle className="spin" size={14} />;
  if (status === "error") return <CircleAlert size={14} />;
  return <Check size={14} />;
}

function saveStatusLabel(status: SaveStatus) {
  return {
    idle: "Pronto",
    dirty: "Alterações não salvas",
    saving: "Salvando",
    saved: "Salvo",
    error: "Erro ao salvar",
  }[status];
}

async function copyToClipboard(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.append(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    textarea.remove();
    return copied;
  }
}
