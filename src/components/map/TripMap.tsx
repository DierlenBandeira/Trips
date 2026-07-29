"use client";

import { useEffect, useRef, useState } from "react";
import {
  AttributionControl,
  LngLatBounds,
  Map as MapLibreMap,
  Marker as MapLibreMarker,
  NavigationControl,
  Popup,
  type ExpressionSpecification,
  type StyleSpecification,
} from "maplibre-gl";
import type { TripLeg, TripStop } from "@/features/trips/types";
import type { RouteResult } from "@/features/routing/types";
import { createMapSegments } from "@/features/routing/map-segments";
import { formatCurrency, stopSubtotal } from "@/utils/trip-calculations";

const mapStyleUrl = "https://tiles.openfreemap.org/styles/positron";
const vectorTileJsonUrl = "https://tiles.openfreemap.org/planet";
const portugueseNameExpression: ExpressionSpecification = [
  "coalesce",
  ["get", "name:pt"],
  ["get", "name:latin"],
  ["get", "name_en"],
  ["get", "name"],
];
const rasterFallbackStyle: StyleSpecification = {
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
  legs?: TripLeg[];
  currency: string;
  selectedStopId: string | null;
  onSelectStop: (stopId: string) => void;
  onAddPoint: (coordinates: { latitude: number; longitude: number }) => void;
  route?: RouteResult | null;
  routeLoading?: boolean;
  readOnly?: boolean;
  hint?: string | false;
  emptyState?: { title: string; description: string } | false;
  ariaLabel?: string;
};

export function TripMap({
  stops,
  legs = [],
  currency,
  selectedStopId,
  onSelectStop,
  onAddPoint,
  route = null,
  routeLoading = false,
  readOnly = false,
  hint = "Clique no mapa para adicionar um ponto",
  emptyState = {
    title: "Monte sua rota",
    description: "Adicione ao menos dois destinos para ligar os pontos.",
  },
  ariaLabel = "Mapa da viagem",
}: TripMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const routeOverlayRef = useRef<SVGSVGElement>(null);
  const drawRouteOverlayRef = useRef<() => void>(() => undefined);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<MapLibreMarker[]>([]);
  const addPointRef = useRef(onAddPoint);
  const initialStopCoordinatesRef = useRef(
    stops.map(
      (stop) => [stop.longitude, stop.latitude] as [number, number],
    ),
  );
  const initialViewportAppliedRef = useRef(false);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    addPointRef.current = onAddPoint;
  }, [onAddPoint]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let disposed = false;
    const controller = new AbortController();

    void loadPortugueseMapStyle(controller.signal)
      .catch(() => rasterFallbackStyle)
      .then((style) => {
        if (disposed || !containerRef.current) return;
        const map = new MapLibreMap({
          container: containerRef.current,
          style,
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
        const syncViewportState = () => {
          const center = map.getCenter();
          containerRef.current?.setAttribute(
            "data-map-center",
            `${center.lng.toFixed(6)},${center.lat.toFixed(6)}`,
          );
          containerRef.current?.setAttribute(
            "data-map-zoom",
            map.getZoom().toFixed(4),
          );
        };
        map.on("moveend", syncViewportState);
        map.on("move", () => drawRouteOverlayRef.current());
        map.on("resize", () => drawRouteOverlayRef.current());
        map.once("load", syncViewportState);
        syncViewportState();
        mapRef.current = map;
        setMapReady(true);
      });

    return () => {
      disposed = true;
      controller.abort();
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
      drawRouteOverlayRef.current = () => undefined;
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

      const segments = createMapSegments(
        route?.geometry.coordinates,
        stops,
        legs,
      );
      containerRef.current?.setAttribute(
        "data-road-segments",
        String(segments.road.length),
      );
      containerRef.current?.setAttribute(
        "data-flight-segments",
        String(segments.flights.length),
      );
      drawRouteOverlayRef.current = () =>
        drawRouteOverlay(
          map,
          routeOverlayRef.current,
          segments.road,
          segments.flights,
        );
      drawRouteOverlayRef.current();

      if (!initialViewportAppliedRef.current) {
        initialViewportAppliedRef.current = true;
        const initialCoordinates = initialStopCoordinatesRef.current;
        if (initialCoordinates.length === 1) {
          map.jumpTo({
            center: initialCoordinates[0],
            zoom: 10,
          });
        } else if (initialCoordinates.length > 1) {
          const bounds = initialCoordinates.reduce(
            (current, coordinate) =>
              current.extend(coordinate),
            new LngLatBounds(
              initialCoordinates[0],
              initialCoordinates[0],
            ),
          );
          map.fitBounds(bounds, { padding: 90, maxZoom: 10, duration: 0 });
        }
      }
    };

    if (map.isStyleLoaded()) draw();
    else map.once("load", draw);
  }, [currency, legs, mapReady, onSelectStop, route, selectedStopId, stops]);

  return (
    <div className="map-shell">
      <div
        ref={containerRef}
        className="trip-map"
        role="region"
        aria-label={ariaLabel}
      />
      <svg
        ref={routeOverlayRef}
        className="route-overlay"
        aria-hidden="true"
      />
      {!readOnly && hint && (
        <div className="map-hint">{hint}</div>
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
      {stops.length < 2 && emptyState && (
        <div className="map-empty">
          <strong>{emptyState.title}</strong>
          <span>{emptyState.description}</span>
        </div>
      )}
    </div>
  );
}

async function loadPortugueseMapStyle(signal: AbortSignal) {
  const [styleResponse, tileJsonResponse] = await Promise.all([
    fetch(mapStyleUrl, { signal, cache: "force-cache" }),
    fetch(vectorTileJsonUrl, { signal, cache: "no-store" }),
  ]);
  if (!styleResponse.ok || !tileJsonResponse.ok) {
    throw new Error("Map style failed");
  }
  const style = (await styleResponse.json()) as StyleSpecification;
  const tileJson = (await tileJsonResponse.json()) as {
    tiles?: unknown;
    attribution?: unknown;
    minzoom?: unknown;
    maxzoom?: unknown;
  };
  if (
    !Array.isArray(tileJson.tiles) ||
    !tileJson.tiles.every(
      (url) =>
        typeof url === "string" &&
        url.startsWith("https://tiles.openfreemap.org/"),
    )
  ) {
    throw new Error("Vector tiles missing");
  }
  const source = style.sources.openmaptiles;
  if (source?.type !== "vector") throw new Error("Vector source missing");
  delete source.url;
  source.tiles = tileJson.tiles;
  source.minzoom =
    typeof tileJson.minzoom === "number" ? tileJson.minzoom : 0;
  source.maxzoom =
    typeof tileJson.maxzoom === "number" ? tileJson.maxzoom : 14;
  source.attribution =
    typeof tileJson.attribution === "string"
      ? tileJson.attribution
      : "© OpenFreeMap, OpenMapTiles and OpenStreetMap contributors";

  for (const layer of style.layers) {
    if (layer.type !== "symbol") continue;
    const textField = layer.layout?.["text-field"];
    if (!textField || !JSON.stringify(textField).includes("name")) continue;
    layer.layout = {
      ...layer.layout,
      "text-field": portugueseNameExpression,
    };
  }
  return style;
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

function drawRouteOverlay(
  map: MapLibreMap,
  overlay: SVGSVGElement | null,
  road: Array<Array<[number, number]>>,
  flights: Array<Array<[number, number]>>,
) {
  if (!overlay) return;
  const target = overlay;
  target.replaceChildren();
  const canvas = map.getCanvas();
  target.setAttribute("viewBox", `0 0 ${canvas.clientWidth} ${canvas.clientHeight}`);
  target.setAttribute(
    "data-visible-road-paths",
    String(road.length),
  );
  target.setAttribute(
    "data-visible-flight-paths",
    String(flights.length),
  );
  const namespace = "http://www.w3.org/2000/svg";

  function appendRoute(
    coordinates: Array<[number, number]>,
    casingClass: string,
    lineClass: string,
  ) {
    const pathData = coordinates
      .map(([longitude, latitude], index) => {
        const point = map.project([longitude, latitude]);
        return `${index === 0 ? "M" : "L"}${point.x.toFixed(1)},${point.y.toFixed(1)}`;
      })
      .join(" ");
    const casing = document.createElementNS(namespace, "path");
    casing.setAttribute("d", pathData);
    casing.setAttribute("class", casingClass);
    target.append(casing);
    const line = document.createElementNS(namespace, "path");
    line.setAttribute("d", pathData);
    line.setAttribute("class", lineClass);
    target.append(line);
  }

  for (const segment of road) {
    appendRoute(segment, "road-route-casing", "road-route-line");
  }
  for (const flight of flights) {
    appendRoute(flight, "flight-route-casing", "flight-route-line");
  }
}
