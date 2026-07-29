import type { TripLeg, TripStop } from "@/features/trips/types";

export type TripKpis = {
  lodgingTotal: number;
  totalNights: number;
  destinationCount: number;
  averageNightlyCost: number;
  lodgingPerPerson: number;
  transportTotal: number;
  estimatedTotal: number;
  totalPerPerson: number;
};

export function stopSubtotal(
  stop: Pick<TripStop, "nightly_cost" | "nights">,
) {
  return Number(stop.nightly_cost) * stop.nights;
}

export function calculateTripKpis(
  stops: Array<Pick<TripStop, "nightly_cost" | "nights">>,
  travelersCount: number,
  legs: Array<Pick<TripLeg, "transport_mode" | "transport_cost">> = [],
): TripKpis {
  const lodgingTotal = stops.reduce(
    (total, stop) => total + stopSubtotal(stop),
    0,
  );
  const totalNights = stops.reduce((total, stop) => total + stop.nights, 0);
  const transportTotal = legs.reduce(
    (total, leg) =>
      total +
      (leg.transport_mode === "flight" ? Number(leg.transport_cost) : 0),
    0,
  );
  const estimatedTotal = lodgingTotal + transportTotal;

  return {
    lodgingTotal,
    totalNights,
    destinationCount: stops.length,
    averageNightlyCost: totalNights > 0 ? lodgingTotal / totalNights : 0,
    lodgingPerPerson:
      travelersCount > 0 ? lodgingTotal / travelersCount : lodgingTotal,
    transportTotal,
    estimatedTotal,
    totalPerPerson:
      travelersCount > 0 ? estimatedTotal / travelersCount : estimatedTotal,
  };
}

export function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}
