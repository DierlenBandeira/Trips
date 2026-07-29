"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  LoaderCircle,
  MapPin,
  MousePointer2,
  Route,
  Sparkles,
} from "lucide-react";
import { TripMap } from "@/components/map/TripMap";
import type { GeocodingResult } from "@/features/geocoding/types";
import { demoTrip } from "@/features/trips/demo-data";
import { apiRequest, jsonRequest } from "@/lib/api/client";

type CreatedTrip = { id: string };
type Coordinates = { latitude: number; longitude: number };

export default function Home() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pendingAction, setPendingAction] = useState<
    "map" | "blank" | "demo" | null
  >(null);

  async function createBaseTrip() {
    return apiRequest<CreatedTrip>(
      "/api/trips",
      jsonRequest("POST", {
        name: "Minha viagem",
        slug: `minha-viagem-${Date.now().toString(36)}-${Math.random()
          .toString(36)
          .slice(2, 7)}`,
        currency: "EUR",
        travelersCount: 1,
      }),
    );
  }

  async function createFromMap(coordinates: Coordinates) {
    if (pendingAction) return;
    setPendingAction("map");
    setError("");

    try {
      const trip = await createBaseTrip();
      let place: GeocodingResult | null = null;

      try {
        const params = new URLSearchParams({
          tripId: trip.id,
          lat: String(coordinates.latitude),
          lon: String(coordinates.longitude),
        });
        place = await apiRequest<GeocodingResult | null>(
          `/api/geocoding/reverse?${params}`,
        );
      } catch {
        // A coordenada ainda é útil quando a geocodificação falha.
      }

      try {
        await apiRequest(
          `/api/trips/${trip.id}/stops`,
          jsonRequest("POST", {
            position: 0,
            placeName: place?.placeName ?? "Primeiro destino",
            country: place?.country ?? null,
            region: place?.region ?? null,
            formattedAddress:
              place?.formattedAddress ??
              `${coordinates.latitude.toFixed(5)}, ${coordinates.longitude.toFixed(5)}`,
            latitude: place?.latitude ?? coordinates.latitude,
            longitude: place?.longitude ?? coordinates.longitude,
            nightlyCost: 0,
            nights: 0,
            notes: null,
          }),
        );
        if (place?.placeName) {
          await apiRequest(
            `/api/trips/${trip.id}`,
            jsonRequest("PATCH", {
              name: `Viagem para ${place.placeName}`,
            }),
          ).catch(() => undefined);
        }
      } catch {
        // O editor permite concluir a parada caso a inclusão inicial falhe.
      }

      router.push(`/trips/${trip.id}`);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível começar a viagem.",
      );
      setPendingAction(null);
    }
  }

  async function createBlankTrip() {
    if (pendingAction) return;
    setPendingAction("blank");
    setError("");
    try {
      const trip = await createBaseTrip();
      router.push(`/trips/${trip.id}`);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível começar a viagem.",
      );
      setPendingAction(null);
    }
  }

  async function createDemoTrip() {
    if (pendingAction) return;
    setPendingAction("demo");
    setError("");
    try {
      const trip = await apiRequest<CreatedTrip>(
        "/api/trips",
        jsonRequest("POST", {
          name: demoTrip.name,
          slug: `europa-demo-${Date.now().toString(36)}`,
          currency: demoTrip.currency,
          travelersCount: demoTrip.travelersCount,
        }),
      );
      for (const [position, stop] of demoTrip.stops.entries()) {
        await apiRequest(
          `/api/trips/${trip.id}/stops`,
          jsonRequest("POST", { ...stop, position }),
        );
      }
      router.push(`/trips/${trip.id}`);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível criar a demonstração.",
      );
      setPendingAction(null);
    }
  }

  const pending = pendingAction !== null;

  return (
    <main id="main-content" className="landing-map-page">
      <div className="landing-map-stage">
        <TripMap
          stops={[]}
          currency="EUR"
          selectedStopId={null}
          onSelectStop={() => undefined}
          onAddPoint={createFromMap}
          hint={false}
          emptyState={false}
          ariaLabel="Mapa para escolher o primeiro destino"
        />
      </div>

      <header className="landing-topbar" aria-label="Trip Planner">
        <span className="landing-brand-icon">
          <Route size={20} aria-hidden="true" />
        </span>
        <span>
          <strong>TRIPS</strong>
          <small>Planejador de viagens</small>
        </span>
      </header>

      <section className="landing-intro" aria-labelledby="landing-title">
        <p className="eyebrow">SUA VIAGEM COMEÇA AQUI</p>
        <h1 id="landing-title">Para onde você quer ir?</h1>
        <p className="landing-copy">
          Clique em qualquer lugar do mapa. Nós criamos o roteiro e você
          ajusta destinos, noites e custos na próxima tela.
        </p>
        <div className="landing-steps" aria-label="Como funciona">
          <span><b>1</b> Escolha no mapa</span>
          <span><b>2</b> Monte sua rota</span>
          <span><b>3</b> Compartilhe</span>
        </div>
        <div className="landing-actions">
          <button
            type="button"
            className="landing-demo-button"
            disabled={pending}
            onClick={createDemoTrip}
          >
            {pendingAction === "demo" ? (
              <LoaderCircle className="spin" size={17} />
            ) : (
              <Sparkles size={17} />
            )}
            Ver uma viagem pronta
          </button>
          <button
            type="button"
            className="landing-blank-button"
            disabled={pending}
            onClick={createBlankTrip}
          >
            {pendingAction === "blank" ? (
              <LoaderCircle className="spin" size={16} />
            ) : (
              <ArrowRight size={16} />
            )}
            Criar sem escolher no mapa
          </button>
        </div>
        {error && (
          <p className="landing-error" role="alert">
            {error}
          </p>
        )}
      </section>

      {!pending && (
        <div className="landing-click-cue" aria-hidden="true">
          <span><MousePointer2 size={19} /></span>
          Clique no mapa para começar
        </div>
      )}

      {pendingAction === "map" && (
        <div className="landing-loading" role="status">
          <span><MapPin size={20} /></span>
          <div>
            <strong>Criando sua viagem…</strong>
            <small>Identificando o primeiro destino</small>
          </div>
          <LoaderCircle className="spin" size={22} />
        </div>
      )}
      <p className="sr-only" aria-live="polite">
        {pending ? "Criando viagem, aguarde." : ""}
      </p>
    </main>
  );
}
