import { BedDouble, MapPin, ReceiptText, Users } from "lucide-react";
import type { Currency, TripStop } from "@/features/trips/types";
import { calculateTripKpis, formatCurrency } from "@/utils/trip-calculations";

export function TripKpiCard({
  stops,
  travelersCount,
  currency,
}: {
  stops: Array<Pick<TripStop, "nightly_cost" | "nights">>;
  travelersCount: number;
  currency: Currency;
}) {
  const kpis = calculateTripKpis(stops, travelersCount);

  return (
    <aside className="map-kpis" aria-label="Resumo da viagem">
      <div className="kpi-primary">
        <span>Hospedagem</span>
        <strong>{formatCurrency(kpis.lodgingTotal, currency)}</strong>
        <small>{formatCurrency(kpis.lodgingPerPerson, currency)} por pessoa</small>
      </div>
      <div className="kpi-grid">
        <div><MapPin size={16} /><span>{kpis.destinationCount}<small>destinos</small></span></div>
        <div><BedDouble size={16} /><span>{kpis.totalNights}<small>noites</small></span></div>
        <div><ReceiptText size={16} /><span>{formatCurrency(kpis.averageNightlyCost, currency)}<small>média/noite</small></span></div>
        <div><Users size={16} /><span>{travelersCount}<small>viajantes</small></span></div>
      </div>
    </aside>
  );
}
