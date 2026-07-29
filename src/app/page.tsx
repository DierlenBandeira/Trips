"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LoaderCircle, Sparkles } from "lucide-react";
import { demoTrip } from "@/features/trips/demo-data";
import { apiRequest, jsonRequest } from "@/lib/api/client";

type CreatedTrip = { id: string };

export default function Home() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pendingAction, setPendingAction] = useState<
    "trip" | "demo" | null
  >(null);

  async function createTrip(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPendingAction("trip");
    setError("");
    const form = new FormData(event.currentTarget);

    try {
      const trip = await apiRequest<CreatedTrip>(
        "/api/trips",
        jsonRequest("POST", {
          name: form.get("name"),
          slug: form.get("slug"),
          currency: form.get("currency"),
          travelersCount: Number(form.get("travelersCount")),
        }),
      );
      router.push(`/trips/${trip.id}`);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Não foi possível criar.",
      );
      setPendingAction(null);
    }
  }

  async function createDemoTrip() {
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
    <main id="main-content">
      <section className="hero">
        <p className="eyebrow">TRIP PLANNER</p>
        <h1>Uma viagem clara começa com um roteiro simples.</h1>
        <p>
          Organize destinos, noites e custos. Depois compartilhe uma versão
          somente leitura com quem vai viajar.
        </p>
      </section>

      <form className="create-form panel" onSubmit={createTrip}>
        <div>
          <p className="eyebrow">COMECE AGORA</p>
          <h2>Crie seu roteiro</h2>
        </div>
        <label>
          Nome da viagem
          <input
            name="name"
            required
            maxLength={200}
            placeholder="Itália no verão"
          />
        </label>
        <label>
          Identificador
          <input
            name="slug"
            required
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            placeholder="italia-2026"
          />
        </label>
        <div className="form-row">
          <label>
            Moeda
            <select name="currency" defaultValue="EUR">
              <option>EUR</option>
              <option>BRL</option>
              <option>USD</option>
              <option>GBP</option>
            </select>
          </label>
          <label>
            Viajantes
            <input
              name="travelersCount"
              type="number"
              min="1"
              defaultValue="1"
              required
            />
          </label>
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="create-actions">
          <button disabled={pending}>
            {pendingAction === "trip" ? (
              <LoaderCircle className="spin" size={17} />
            ) : (
              <ArrowRight size={17} />
            )}
            Criar viagem
          </button>
          <button
            type="button"
            className="demo-button"
            disabled={pending}
            onClick={createDemoTrip}
          >
            {pendingAction === "demo" ? (
              <LoaderCircle className="spin" size={17} />
            ) : (
              <Sparkles size={17} />
            )}
            Explorar demonstração
          </button>
        </div>
        <p className="form-status sr-only" aria-live="polite">
          {pending ? "Criando viagem, aguarde." : ""}
        </p>
      </form>
    </main>
  );
}
