export type RoutePoint = {
  latitude: number;
  longitude: number;
};

export type RouteGeometry = {
  type: "LineString";
  coordinates: number[][];
};

export type RouteResult = {
  geometry: RouteGeometry;
  distanceMeters: number;
  provider: string;
  stopsHash: string;
  isFallback: boolean;
  warning?: string;
};

export interface RouteProvider {
  calculateRoute(
    stops: RoutePoint[],
    signal?: AbortSignal,
  ): Promise<Omit<RouteResult, "stopsHash" | "isFallback">>;
}
