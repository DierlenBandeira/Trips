import type { Trip, TripStop } from "@/features/trips/types";

export type TripState = {
  trip: Trip;
  selectedStopId: string | null;
};

export type TripAction =
  | { type: "replace"; trip: Trip }
  | { type: "update-trip"; changes: Partial<Trip> }
  | { type: "add-stop"; stop: TripStop }
  | { type: "update-stop"; stopId: string; changes: Partial<TripStop> }
  | { type: "remove-stop"; stopId: string }
  | { type: "reorder-stops"; stopIds: string[] }
  | { type: "select-stop"; stopId: string | null };

export function reorderStops(stops: TripStop[], stopIds: string[]) {
  const byId = new Map(stops.map((stop) => [stop.id, stop]));
  return stopIds
    .map((id, position) => {
      const stop = byId.get(id);
      return stop ? { ...stop, position } : null;
    })
    .filter((stop): stop is TripStop => stop !== null);
}

export function tripReducer(state: TripState, action: TripAction): TripState {
  switch (action.type) {
    case "replace":
      return { ...state, trip: action.trip };
    case "update-trip":
      return { ...state, trip: { ...state.trip, ...action.changes } };
    case "add-stop":
      return {
        trip: { ...state.trip, stops: [...state.trip.stops, action.stop] },
        selectedStopId: action.stop.id,
      };
    case "update-stop":
      return {
        ...state,
        trip: {
          ...state.trip,
          stops: state.trip.stops.map((stop) =>
            stop.id === action.stopId ? { ...stop, ...action.changes } : stop,
          ),
        },
      };
    case "remove-stop":
      return {
        trip: {
          ...state.trip,
          stops: state.trip.stops
            .filter((stop) => stop.id !== action.stopId)
            .map((stop, position) => ({ ...stop, position })),
        },
        selectedStopId:
          state.selectedStopId === action.stopId ? null : state.selectedStopId,
      };
    case "reorder-stops":
      return {
        ...state,
        trip: {
          ...state.trip,
          stops: reorderStops(state.trip.stops, action.stopIds),
        },
      };
    case "select-stop":
      return { ...state, selectedStopId: action.stopId };
  }
}
