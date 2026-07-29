"use client";

import { useEffect, useRef } from "react";
import {
  AttributionControl,
  LngLatBounds,
  Map as MapLibreMap,
  Marker as MapLibreMarker,
  NavigationControl,
  Popup,
  type GeoJSONSource,
  type StyleSpecification,
} from "maplibre-gl";
import type { TripStop } from "@/features/trips/types";
import type { RouteResult } from "@/features/routing/types";
import { formatCurrency, stopSubtotal } from "@/utils/trip-calculations";

const osmStyle: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
      maxzoom: 19,
    },
  },
  layers: [{ id: "osm", type: "raster", source: "osm" }],
};

type TripMapProps = {
  stops: Array<
    Pick<
      TripStop,
      | "id"
      | "place_name"
      | "country"
      | "latitude"
      | "longitude"
      | "nightly_cost"
      | "nights"
    >
  >;
  currency: string;
  selectedStopId: string | null;
  onSelectStop: (stopId: string) => void;
  onAddPoint: (coordinates: { latitude: number; longitude: number }) => void;
  route?: RouteResult | null;
  routeLoading?: boolean;
  readOnly?: boolean;
};

export function TripMap({
  stops,
  currency,
  selectedStopId,
  onSelectStop,
  onAddPoint,
  route = null,
  routeLoading = false,
  readOnly = false,
}: TripMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<MapLibreMarker[]>([]);
  const addPointRef = useRef(onAddPoint);

  useEffect(() => {
    addPointRef.current = onAddPoint;
  }, [onAddPoint]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new MapLibreMap({
      container: containerRef.current,
      style: osmStyle,
      center: [12.5, 46.5],
      zoom: 4,
      attributionControl: false,
    });
    map.addControl(new NavigationControl(), "top-right");
    map.addControl(
      new AttributionControl({ compact: true }),
      "bottom-left",
    );
    if (!readOnly) {
      map.getCanvas().style.cursor = "crosshair";
      map.on("click", (event) => {
        addPointRef.current({
          latitude: event.lngLat.lat,
          longitude: event.lngLat.lng,
        });
      });
    }
    mapRef.current = map;

    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [readOnly]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const draw = () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = stops.map((stop, index) => {
        const element = document.createElement("button");
        element.type = "button";
        element.className = `map-marker${stop.id === selectedStopId ? " is-selected" : ""}`;
        const label = document.createElement("span");
        label.textContent = String(index + 1);
        element.append(label);
        element.setAttribute("aria-label", `Selecionar ${stop.place_name}`);
        element.addEventListener("click", (event) => {
          event.stopPropagation();
          onSelectStop(stop.id);
        });

        const popup = new Popup({ offset: 22 }).setHTML(
          `<strong>${escapeHtml(stop.place_name)}</strong><span>${formatCurrency(stopSubtotal(stop), currency)}</span>`,
        );

        return new MapLibreMarker({ element })
          .setLngLat([stop.longitude, stop.latitude])
          .setPopup(popup)
          .addTo(map);
      });

      const stopCoordinates = stops.map((stop) => [
        stop.longitude,
        stop.latitude,
      ]);
      const routeCoordinates =
        route?.geometry.coordinates.length && stops.length >= 2
          ? route.geometry.coordinates
          : stopCoordinates;
      const routeFeature = {
        type: "Feature" as const,
        properties: {},
        geometry: {
          type: "LineString" as const,
          coordinates: routeCoordinates,
        },
      };
      const source = map.getSource<GeoJSONSource>("trip-route");
      if (source) {
        source.setData(routeFeature);
      } else if (map.isStyleLoaded()) {
        map.addSource("trip-route", { type: "geojson", data: routeFeature });
        map.addLayer({
          id: "trip-route-line",
          type: "line",
          source: "trip-route",
          paint: {
            "line-color": "#f05d3d",
            "line-width": 4,
            "line-opacity": 0.82,
          },
        });
      }

      if (routeCoordinates.length === 1) {
        map.easeTo({
          center: routeCoordinates[0] as [number, number],
          zoom: 10,
        });
      } else if (routeCoordinates.length > 1) {
        const bounds = routeCoordinates.reduce(
          (current, coordinate) =>
            current.extend(coordinate as [number, number]),
          new LngLatBounds(
            routeCoordinates[0] as [number, number],
            routeCoordinates[0] as [number, number],
          ),
        );
        map.fitBounds(bounds, { padding: 90, maxZoom: 10, duration: 600 });
      }
    };

    if (map.isStyleLoaded()) draw();
    else map.once("load", draw);
  }, [currency, onSelectStop, route, selectedStopId, stops]);

  return (
    <div className="map-shell">
      <div
        ref={containerRef}
        className="trip-map"
        role="region"
        aria-label="Mapa da viagem"
      />
      {!readOnly && (
        <div className="map-hint">Clique no mapa para adicionar um ponto</div>
      )}
      {routeLoading && stops.length >= 2 && (
        <div className="route-status is-loading" role="status">
          Calculando rota rodoviária…
        </div>
      )}
      {route?.warning && !routeLoading && (
        <div className="route-status is-warning" role="status">
          {route.warning}
        </div>
      )}
      {route && !routeLoading && !route.isFallback && (
        <div className="route-status">
          Rota OSRM · {(route.distanceMeters / 1000).toLocaleString("pt-BR", {
            maximumFractionDigits: 0,
          })} km
        </div>
      )}
      {stops.length < 2 && (
        <div className="map-empty">
          <strong>Monte sua rota</strong>
          <span>Adicione ao menos dois destinos para ligar os pontos.</span>
        </div>
      )}
    </div>
  );
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[character] ?? character,
  );
}
