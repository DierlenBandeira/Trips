"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  LoaderCircle,
  MapPinPlus,
  Navigation,
  Plus,
  Search,
} from "lucide-react";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import type { GeocodingResult } from "@/features/geocoding/types";
import type { TripStop } from "@/features/trips/types";
import { useGeocoding } from "@/hooks/use-geocoding";
import { SortableStopCard } from "@/components/trip/SortableStopCard";

type AddStopForm = {
  placeName: string;
  country: string;
  region?: string;
  formattedAddress?: string;
  latitude: number;
  longitude: number;
};

type DestinationPanelProps = {
  stops: TripStop[];
  currency: string;
  selectedStopId: string | null;
  busy: boolean;
  onAdd: (input: AddStopForm) => Promise<void>;
  onRemove: (stopId: string) => Promise<void>;
  onChange: (stopId: string, changes: Partial<TripStop>) => void;
  onUpdate: (stopId: string, changes: Partial<TripStop>) => Promise<void>;
  onSelect: (stopId: string) => void;
  onReorder: (stopIds: string[]) => Promise<void>;
};

export function DestinationPanel({
  stops,
  currency,
  selectedStopId,
  busy,
  onAdd,
  onRemove,
  onChange,
  onUpdate,
  onSelect,
  onReorder,
}: DestinationPanelProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const [selectedResult, setSelectedResult] =
    useState<GeocodingResult | null>(null);
  const { register, handleSubmit, reset, setValue, control, formState } =
    useForm<AddStopForm>({
    defaultValues: { country: "", latitude: 0, longitude: 0 },
  });
  const searchQuery = useWatch({ control, name: "placeName" }) || "";
  const geocoding = useGeocoding(searchQuery);

  async function submit(values: AddStopForm) {
    await onAdd(values);
    reset();
    setSelectedResult(null);
  }

  function selectResult(result: GeocodingResult) {
    setSelectedResult(result);
    setValue("placeName", result.placeName);
    setValue("country", result.country || "");
    setValue("region", result.region || "");
    setValue("formattedAddress", result.formattedAddress);
    setValue("latitude", result.latitude);
    setValue("longitude", result.longitude);
  }

  function dragEnd(event: DragEndEvent) {
    if (!event.over || event.active.id === event.over.id) return;
    const from = stops.findIndex((stop) => stop.id === event.active.id);
    const to = stops.findIndex((stop) => stop.id === event.over?.id);
    const ids = stops.map((stop) => stop.id);
    const [moved] = ids.splice(from, 1);
    ids.splice(to, 0, moved);
    void onReorder(ids);
  }

  return (
    <aside className="destination-panel">
      <div className="drawer-handle" aria-hidden="true" />
      <div className="panel-title">
        <div><span>ROTEIRO</span><strong>{stops.length} destinos</strong></div>
        <MapPinPlus size={20} />
      </div>

      <form className="destination-search" onSubmit={handleSubmit(submit)}>
        <label className="search-input">
          <Search size={17} aria-hidden="true" />
          <span className="sr-only">Nome da cidade ou endereço</span>
          <input
            {...register("placeName", {
              required: true,
              onChange: () => {
                setSelectedResult(null);
                setValue("latitude", Number.NaN);
                setValue("longitude", Number.NaN);
              },
            })}
            placeholder="Cidade ou endereço"
            autoComplete="off"
            role="combobox"
            aria-autocomplete="list"
            aria-controls="geocoding-suggestions"
            aria-expanded={
              searchQuery.length >= 2 && !selectedResult
            }
          />
          {geocoding.loading && (
            <LoaderCircle className="spin search-spinner" size={16} />
          )}
        </label>
        {!selectedResult && searchQuery.length >= 2 && (
          <div
            id="geocoding-suggestions"
            className="geocoding-results"
            role="listbox"
            aria-label="Sugestões de locais"
          >
            {geocoding.results.map((result) => (
              <button
                key={result.id}
                type="button"
                role="option"
                aria-selected="false"
                onClick={() => selectResult(result)}
              >
                <Navigation size={15} />
                <span>
                  <strong>{result.placeName}</strong>
                  <small>
                    {[result.region, result.country].filter(Boolean).join(", ")}
                  </small>
                </span>
              </button>
            ))}
            {!geocoding.loading &&
              !geocoding.error &&
              geocoding.results.length === 0 && (
                <p>Nenhum local encontrado.</p>
              )}
            {geocoding.error && <p role="alert">{geocoding.error}</p>}
          </div>
        )}
        {selectedResult && (
          <div className="selected-place">
            <Navigation size={14} />
            <span>{selectedResult.formattedAddress}</span>
          </div>
        )}
        <details className="coordinate-details">
          <summary>Informar coordenadas manualmente</summary>
          <div className="coordinate-row">
            <label>
              País
              <input {...register("country")} placeholder="País" />
            </label>
            <label>
              Latitude
              <input
                type="number"
                step="any"
                {...register("latitude", {
                  valueAsNumber: true,
                  min: -90,
                  max: 90,
                })}
              />
            </label>
            <label>
              Longitude
              <input
                type="number"
                step="any"
                {...register("longitude", {
                  valueAsNumber: true,
                  min: -180,
                  max: 180,
                })}
              />
            </label>
          </div>
        </details>
        <button
          className="add-destination"
          disabled={busy || formState.isSubmitting}
        >
          <Plus size={17} /> Adicionar destino
        </button>
        {Object.keys(formState.errors).length > 0 && (
          <p className="form-error" role="alert">
            Selecione uma sugestão ou informe coordenadas válidas.
          </p>
        )}
      </form>

      <div className="destination-list">
        {stops.length === 0 && (
          <div className="panel-empty">
            <MapPinPlus size={28} />
            <strong>Nenhum destino ainda</strong>
            <span>Use a busca acima ou clique diretamente no mapa.</span>
          </div>
        )}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={dragEnd}
        >
          <SortableContext
            items={stops.map((stop) => stop.id)}
            strategy={verticalListSortingStrategy}
          >
            {stops.map((stop, index) => (
              <SortableStopCard
                key={stop.id}
                stop={stop}
                index={index}
                currency={currency}
                selected={stop.id === selectedStopId}
                disabled={busy}
                onSelect={() => onSelect(stop.id)}
                onRemove={() => onRemove(stop.id)}
                onChange={(changes) => onChange(stop.id, changes)}
                onUpdate={(changes) => onUpdate(stop.id, changes)}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>
    </aside>
  );
}
