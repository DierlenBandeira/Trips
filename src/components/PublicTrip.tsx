"use client";

import { useEffect, useMemo, useState } from "react";

type PublicData = {
  name: string;
  currency: string;
  travelers_count: number;
  stops: Array<{
    id: string;
    place_name: string;
    country: string | null;
    nightly_cost: number;
    nights: number;
  }>;
};

export function PublicTrip({ shareToken }: { shareToken: string }) {
  const [data, setData] = useState<PublicData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/public/trips/${encodeURIComponent(shareToken)}`)
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error?.message || "Viagem indisponível.");
        setData(result.data);
      })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Viagem indisponível."));
  }, [shareToken]);

  const total = useMemo(
    () => data?.stops.reduce((sum, stop) => sum + Number(stop.nightly_cost) * stop.nights, 0) || 0,
    [data],
  );

  if (error) return <main><section className="panel empty"><h1>Link indisponível</h1><p>{error}</p></section></main>;
  if (!data) return <main><p className="loading">Abrindo roteiro…</p></main>;

  return (
    <main className="planner public-trip">
      <header className="planner-header"><div><p className="eyebrow">ROTEIRO COMPARTILHADO</p><h1>{data.name}</h1></div></header>
      <section className="kpis">
        <article><span>Destinos</span><strong>{data.stops.length}</strong></article>
        <article><span>Viajantes</span><strong>{data.travelers_count}</strong></article>
        <article><span>Hospedagem</span><strong>{new Intl.NumberFormat("pt-BR", { style: "currency", currency: data.currency }).format(total)}</strong></article>
      </section>
      <section className="stops panel">
        {data.stops.map((stop, index) => (
          <article className="stop" key={stop.id}>
            <span className="stop-number">{index + 1}</span>
            <div><strong>{stop.place_name}</strong><p>{stop.country || "Destino"} · {stop.nights} noites</p></div>
          </article>
        ))}
      </section>
    </main>
  );
}
