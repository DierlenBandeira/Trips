"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function createTrip(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") || "");
    const slug = String(form.get("slug") || "");

    try {
      const response = await fetch("/api/trips", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          slug,
          currency: form.get("currency"),
          travelersCount: Number(form.get("travelersCount")),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message || "Não foi possível criar.");
      router.push(`/trips/${result.data.id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível criar.");
      setPending(false);
    }
  }

  return (
    <main>
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
          <input name="name" required maxLength={200} placeholder="Itália no verão" />
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
              <option>EUR</option><option>BRL</option><option>USD</option><option>GBP</option>
            </select>
          </label>
          <label>
            Viajantes
            <input name="travelersCount" type="number" min="1" defaultValue="1" required />
          </label>
        </div>
        {error && <p className="error" role="alert">{error}</p>}
        <button disabled={pending}>{pending ? "Criando…" : "Criar viagem"}</button>
      </form>
    </main>
  );
}
