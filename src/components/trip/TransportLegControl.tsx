"use client";

import { CarFront, Plane } from "lucide-react";
import type {
  TransportMode,
  TripLeg,
  TripStop,
} from "@/features/trips/types";
import { formatCurrency } from "@/utils/trip-calculations";

type TransportLegControlProps = {
  from: TripStop;
  to: TripStop;
  leg: TripLeg | undefined;
  currency: string;
  disabled: boolean;
  onUpdate: (
    changes: Pick<TripLeg, "transport_mode" | "transport_cost">,
  ) => Promise<void>;
};

export function TransportLegControl({
  from,
  to,
  leg,
  currency,
  disabled,
  onUpdate,
}: TransportLegControlProps) {
  const mode: TransportMode = leg?.transport_mode ?? "road";
  const cost = Number(leg?.transport_cost ?? 0);

  function selectMode(nextMode: TransportMode) {
    if (nextMode === mode) return;
    void onUpdate({
      transport_mode: nextMode,
      transport_cost: nextMode === "flight" ? cost : 0,
    });
  }

  return (
    <section
      className={`transport-leg is-${mode}`}
      aria-label={`Transporte de ${from.place_name} para ${to.place_name}`}
    >
      <span className="transport-line" aria-hidden="true" />
      <div className="transport-bubble">
        <div className="transport-options" role="group" aria-label="Meio de transporte">
          <button
            type="button"
            className={mode === "road" ? "is-active" : ""}
            aria-pressed={mode === "road"}
            disabled={disabled}
            onClick={() => selectMode("road")}
          >
            <CarFront size={14} /> Rodoviário
          </button>
          <button
            type="button"
            className={mode === "flight" ? "is-active" : ""}
            aria-pressed={mode === "flight"}
            disabled={disabled}
            onClick={() => selectMode("flight")}
          >
            <Plane size={14} /> Avião
          </button>
        </div>
        {mode === "flight" && (
          <label className="flight-cost">
            Passagem
            <input
              key={`${leg?.id ?? "new"}-${cost}`}
              type="number"
              min="0"
              step="0.01"
              defaultValue={cost}
              aria-label={`Valor da passagem de ${from.place_name} para ${to.place_name}`}
              onBlur={(event) =>
                void onUpdate({
                  transport_mode: "flight",
                  transport_cost: Number(event.currentTarget.value),
                })
              }
            />
            <span>{formatCurrency(cost, currency)}</span>
          </label>
        )}
      </div>
    </section>
  );
}
