"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, MapPin, Trash2 } from "lucide-react";
import type { TripStop } from "@/features/trips/types";
import { formatCurrency, stopSubtotal } from "@/utils/trip-calculations";

type SortableStopCardProps = {
  stop: TripStop;
  index: number;
  currency: string;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onChange: (changes: Partial<TripStop>) => void;
  onUpdate: (changes: Partial<TripStop>) => void;
};

export function SortableStopCard({
  stop,
  index,
  currency,
  selected,
  disabled,
  onSelect,
  onRemove,
  onChange,
  onUpdate,
}: SortableStopCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stop.id, disabled });

  return (
    <article
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`destination-card${selected ? " is-selected" : ""}${isDragging ? " is-dragging" : ""}`}
      onClick={onSelect}
    >
      <button
        className="drag-handle"
        type="button"
        aria-label={`Reordenar ${stop.place_name}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical size={18} />
      </button>
      <span className="destination-index">{index + 1}</span>
      <div className="destination-content">
        <div className="destination-heading">
          <div>
            <strong>{stop.place_name}</strong>
            <span><MapPin size={12} /> {stop.country || "Local no mapa"}</span>
          </div>
          <button
            type="button"
            className="icon-button danger"
            aria-label={`Remover ${stop.place_name}`}
            onClick={(event) => {
              event.stopPropagation();
              onRemove();
            }}
          >
            <Trash2 size={16} />
          </button>
        </div>
        <div className="destination-fields">
          <label>
            Diária
            <input
              type="number"
              min="0"
              step="0.01"
              defaultValue={stop.nightly_cost}
              onChange={(event) =>
                onChange({ nightly_cost: Number(event.currentTarget.value) })
              }
              onBlur={(event) =>
                onUpdate({ nightly_cost: Number(event.currentTarget.value) })
              }
            />
          </label>
          <label>
            Noites
            <input
              type="number"
              min="0"
              defaultValue={stop.nights}
              onChange={(event) =>
                onChange({ nights: Number(event.currentTarget.value) })
              }
              onBlur={(event) =>
                onUpdate({ nights: Number(event.currentTarget.value) })
              }
            />
          </label>
          <div className="destination-subtotal">
            <span>Subtotal</span>
            <strong>{formatCurrency(stopSubtotal(stop), currency)}</strong>
          </div>
        </div>
        <label className="notes-field">
          <span className="sr-only">Observações de {stop.place_name}</span>
          <input
            defaultValue={stop.notes || ""}
            placeholder="Adicionar observação…"
            onChange={(event) =>
              onChange({ notes: event.currentTarget.value || null })
            }
            onBlur={(event) =>
              onUpdate({ notes: event.currentTarget.value || null })
            }
          />
        </label>
      </div>
    </article>
  );
}
