"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Stop = {
  id: string;
  position: number;
  place_name: string;
  country: string | null;
  latitude: number;
  longitude: number;
  nightly_cost: number;
  nights: number;
  notes: string | null;
};

type Trip = {
  id: string;
  name: string;
  currency: string;
  travelers_count: number;
  visibility: string;
  share_token: string | null;
  stops: Stop[];
};

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const result = await response.json();
  if (!response.ok) throw new Error(result.error?.message || "A operação falhou.");
  return result.data;
}

export function TripPlanner({ tripId }: { tripId: string }) {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setTrip(await api<Trip>(`/api/trips/${tripId}`));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Acesso não autorizado.");
    }
  }, [tripId]);

  useEffect(() => {
    let active = true;
    api<Trip>(`/api/trips/${tripId}`)
      .then((nextTrip) => {
        if (active) setTrip(nextTrip);
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(cause instanceof Error ? cause.message : "Acesso não autorizado.");
        }
      });
    return () => {
      active = false;
    };
  }, [tripId]);

  const totals = useMemo(() => {
    const nights = trip?.stops.reduce((sum, stop) => sum + stop.nights, 0) || 0;
    const lodging = trip?.stops.reduce(
      (sum, stop) => sum + Number(stop.nightly_cost) * stop.nights,
      0,
    ) || 0;
    return { nights, lodging };
  }, [trip]);

  async function addStop(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!trip) return;
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      await api(`/api/trips/${tripId}/stops`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          position: trip.stops.length,
          placeName: form.get("placeName"),
          country: form.get("country") || null,
          latitude: Number(form.get("latitude")),
          longitude: Number(form.get("longitude")),
          nightlyCost: Number(form.get("nightlyCost")),
          nights: Number(form.get("nights")),
          notes: form.get("notes") || null,
        }),
      });
      event.currentTarget.reset();
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível adicionar.");
    } finally {
      setBusy(false);
    }
  }

  async function removeStop(stopId: string) {
    setBusy(true);
    try {
      await api(`/api/trips/${tripId}/stops/${stopId}`, { method: "DELETE" });
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível remover.");
    } finally {
      setBusy(false);
    }
  }

  async function move(stopId: string, direction: -1 | 1) {
    if (!trip) return;
    const current = trip.stops.findIndex((stop) => stop.id === stopId);
    const target = current + direction;
    if (target < 0 || target >= trip.stops.length) return;
    const ids = trip.stops.map((stop) => stop.id);
    [ids[current], ids[target]] = [ids[target], ids[current]];
    setBusy(true);
    try {
      await api(`/api/trips/${tripId}/stops/reorder`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ stopIds: ids }),
      });
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível reordenar.");
    } finally {
      setBusy(false);
    }
  }

  async function share() {
    setBusy(true);
    try {
      const updated = await api<Trip>(`/api/trips/${tripId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ visibility: "unlisted", regenerateShareToken: !trip?.share_token }),
      });
      setTrip((current) => current ? { ...current, ...updated } : current);
      if (updated.share_token) {
        const url = `${window.location.origin}/share/${updated.share_token}`;
        await navigator.clipboard.writeText(url);
        window.alert("Link público copiado.");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível compartilhar.");
    } finally {
      setBusy(false);
    }
  }

  if (error && !trip) {
    return <main><section className="panel empty"><h1>Acesso indisponível</h1><p>{error}</p><Link href="/">Criar outra viagem</Link></section></main>;
  }
  if (!trip) return <main><p className="loading">Carregando roteiro…</p></main>;

  return (
    <main className="planner">
      <header className="planner-header">
        <div><p className="eyebrow">SEU ROTEIRO</p><h1>{trip.name}</h1></div>
        <button className="secondary" disabled={busy} onClick={share}>Compartilhar</button>
      </header>

      <section className="kpis" aria-label="Resumo da viagem">
        <article><span>Destinos</span><strong>{trip.stops.length}</strong></article>
        <article><span>Noites</span><strong>{totals.nights}</strong></article>
        <article><span>Hospedagem</span><strong>{new Intl.NumberFormat("pt-BR", { style: "currency", currency: trip.currency }).format(totals.lodging)}</strong></article>
        <article><span>Por viajante</span><strong>{new Intl.NumberFormat("pt-BR", { style: "currency", currency: trip.currency }).format(totals.lodging / trip.travelers_count)}</strong></article>
      </section>

      {error && <p className="error" role="alert">{error}</p>}
      <section className="planner-grid">
        <div className="stops panel">
          <h2>Destinos</h2>
          {trip.stops.length === 0 && <p className="muted">Adicione o primeiro destino ao roteiro.</p>}
          {trip.stops.map((stop, index) => (
            <article className="stop" key={stop.id}>
              <span className="stop-number">{index + 1}</span>
              <div>
                <strong>{stop.place_name}</strong>
                <p>{stop.country || "País não informado"} · {stop.nights} noites · {trip.currency} {Number(stop.nightly_cost).toFixed(2)}/noite</p>
              </div>
              <div className="stop-actions">
                <button aria-label="Mover para cima" disabled={busy || index === 0} onClick={() => move(stop.id, -1)}>↑</button>
                <button aria-label="Mover para baixo" disabled={busy || index === trip.stops.length - 1} onClick={() => move(stop.id, 1)}>↓</button>
                <button aria-label="Remover" disabled={busy} onClick={() => removeStop(stop.id)}>×</button>
              </div>
            </article>
          ))}
        </div>

        <form className="panel stop-form" onSubmit={addStop}>
          <h2>Novo destino</h2>
          <label>Local<input name="placeName" required placeholder="Florença" /></label>
          <label>País<input name="country" placeholder="Itália" /></label>
          <div className="form-row">
            <label>Latitude<input name="latitude" type="number" step="any" min="-90" max="90" required /></label>
            <label>Longitude<input name="longitude" type="number" step="any" min="-180" max="180" required /></label>
          </div>
          <div className="form-row">
            <label>Noites<input name="nights" type="number" min="0" defaultValue="1" required /></label>
            <label>Custo/noite<input name="nightlyCost" type="number" min="0" step="0.01" defaultValue="0" required /></label>
          </div>
          <label>Observações<textarea name="notes" rows={3} /></label>
          <button disabled={busy}>{busy ? "Salvando…" : "Adicionar destino"}</button>
        </form>
      </section>
    </main>
  );
}
