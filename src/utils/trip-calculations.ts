import type { TripStop } from "@/features/trips/types";

export type TripKpis = {
  lodgingTotal: number;
  totalNights: number;
  destinationCount: number;
  averageNightlyCost: number;
  lodgingPerPerson: number;
};

export function stopSubtotal(
  stop: Pick<TripStop, "nightly_cost" | "nights">,
) {
  return Number(stop.nightly_cost) * stop.nights;
}

export function calculateTripKpis(
  stops: Array<Pick<TripStop, "nightly_cost" | "nights">>,
  travelersCount: number,
): TripKpis {
  const lodgingTotal = stops.reduce(
    (total, stop) => total + stopSubtotal(stop),
    0,
  );
  const totalNights = stops.reduce((total, stop) => total + stop.nights, 0);

  return {
    lodgingTotal,
    totalNights,
    destinationCount: stops.length,
    averageNightlyCost: totalNights > 0 ? lodgingTotal / totalNights : 0,
    lodgingPerPerson:
      travelersCount > 0 ? lodgingTotal / travelersCount : lodgingTotal,
  };
}

export function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}
