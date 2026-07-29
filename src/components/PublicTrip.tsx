"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BedDouble,
  Eye,
  LoaderCircle,
  MapPinned,
  MapPin,
} from "lucide-react";
import { TripMap } from "@/components/map/TripMap";
import { TripKpiCard } from "@/components/trip/TripKpiCard";
import type { RouteResult } from "@/features/routing/types";
import type { Currency } from "@/features/trips/types";
import { apiRequest } from "@/lib/api/client";
import { formatCurrency, stopSubtotal } from "@/utils/trip-calculations";

type PublicStop = {
  id: string;
  position: number;
  place_name: string;
  country: string | null;
  region: string | null;
  formatted_address: string | null;
  latitude: number;
  longitude: number;
  nightly_cost: number;
  nights: number;
  notes: string | null;
};

type PublicTripData = {
  name: string;
  slug: string;
  currency: Currency;
  travelers_count: number;
  visibility: string;
  stops: PublicStop[];
  route: RouteResult | null;
};

type PublicTripProps =
  | { mode: "slug"; slug: string; shareToken?: string }
  | { mode: "legacy"; shareToken: string };

export function PublicTrip(props: PublicTripProps) {
  const [data, setData] = useState<PublicTripData | null>(null);
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const endpoint =
    props.mode === "legacy"
      ? `/api/public/trips/${encodeURIComponent(props.shareToken)}`
      : `/api/public/trips/by-slug/${encodeURIComponent(props.slug)}${
          props.shareToken
            ? `?share=${encodeURIComponent(props.shareToken)}`
            : ""
        }`;

  useEffect(() => {
    let active = true;
    apiRequest<PublicTripData>(endpoint)
      .then((trip) => {
        if (!active) return;
        setData(trip);
        setSelectedStopId(trip.stops[0]?.id || null);
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(
            cause instanceof Error ? cause.message : "Viagem indisponível.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, [endpoint]);

  if (error) {
    return (
      <main id="main-content" className="state-page">
        <section className="state-card">
          <MapPinned size={34} />
          <h1>Link indisponível</h1>
          <p>{error}</p>
          <Link href="/">Planejar uma viagem</Link>
        </section>
      </main>
    );
  }

  if (!data) {
    return (
      <main id="main-content" className="state-page">
        <LoaderCircle className="spin" aria-label="Abrindo roteiro" />
      </main>
    );
  }

  return (
    <main id="main-content" className="public-workspace">
      <header className="public-header">
        <Link href="/" className="brand-mark" aria-label="Trip Planner — início">
          <MapPinned size={23} />
        </Link>
        <div>
          <span>ROTEIRO COMPARTILHADO</span>
          <h1>{data.name}</h1>
        </div>
        <div className="read-only-badge">
          <Eye size={15} /> Somente leitura
        </div>
        <Link href="/" className="button primary">
          Criar minha viagem
        </Link>
      </header>

      <div className="public-body">
        <aside className="public-destinations">
          <div className="public-panel-heading">
            <div>
              <span>ITINERÁRIO</span>
              <strong>{data.stops.length} destinos</strong>
            </div>
            <MapPin size={20} />
          </div>
          <div className="public-stop-list">
            {data.stops.map((stop, index) => (
              <button
                type="button"
                key={stop.id}
                className={`public-stop${selectedStopId === stop.id ? " is-selected" : ""}`}
                onClick={() => setSelectedStopId(stop.id)}
              >
                <span className="destination-index">{index + 1}</span>
                <span className="public-stop-content">
                  <strong>{stop.place_name}</strong>
                  <small>
                    {[stop.region, stop.country].filter(Boolean).join(", ") ||
                      "Destino"}
                  </small>
                  <span>
                    <BedDouble size={13} /> {stop.nights} noites
                    <b>
                      {formatCurrency(stopSubtotal(stop), data.currency)}
                    </b>
                  </span>
                  {stop.notes && <em>{stop.notes}</em>}
                </span>
              </button>
            ))}
          </div>
        </aside>

        <section className="public-map-area">
          <TripMap
            stops={data.stops}
            currency={data.currency}
            selectedStopId={selectedStopId}
            onSelectStop={setSelectedStopId}
            onAddPoint={() => undefined}
            route={data.route}
            readOnly
          />
          <TripKpiCard
            stops={data.stops}
            travelersCount={data.travelers_count}
            currency={data.currency}
          />
        </section>
      </div>
    </main>
  );
}
