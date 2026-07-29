import { expect, test, type Route } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

type MockStop = {
  id: string;
  trip_id: string;
  position: number;
  place_name: string;
  country: string | null;
  region: string | null;
  formatted_address: string | null;
  latitude: number;
  longitude: number;
  nightly_cost: number;
  nights: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};
type MockLeg = {
  id: string;
  trip_id: string;
  from_stop_id: string;
  to_stop_id: string;
  transport_mode: "road" | "flight";
  transport_cost: number;
  created_at: string;
  updated_at: string;
};

const now = "2026-07-28T12:00:00.000Z";
const tripId = "a773d8f0-04bd-4778-8e8b-12c404f01995";
const shareToken = "public-share-token-with-more-than-32-characters";

test("cria, edita, reordena, salva e compartilha uma viagem", async ({
  page,
  context,
}) => {
  const stops: MockStop[] = [];
  const legs: MockLeg[] = [];
  const reverseCoordinates: Array<{
    latitude: number;
    longitude: number;
  }> = [];
  const trip = {
    id: tripId,
    name: "Europa central",
    slug: "europa-central",
    currency: "EUR",
    travelers_count: 2,
    visibility: "private",
    share_token: null as string | null,
    created_at: now,
    updated_at: now,
  };

  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await context.route("https://tiles.openfreemap.org/styles/positron", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        version: 8,
        sources: {
          openmaptiles: {
            type: "vector",
            url: "https://tiles.openfreemap.org/planet",
          },
        },
        layers: [
          {
            id: "background",
            type: "background",
            paint: { "background-color": "#dce5df" },
          },
        ],
      }),
    }),
  );
  await context.route("https://tiles.openfreemap.org/planet", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        tilejson: "3.0.0",
        tiles: [
          "https://tiles.openfreemap.org/test/{z}/{x}/{y}.pbf",
        ],
        minzoom: 0,
        maxzoom: 14,
        attribution: "OpenStreetMap contributors",
      }),
    }),
  );
  await context.route("**/api/**", async (route) => {
    await mockApi(route, trip, stops, legs, reverseCoordinates);
  });

  const homeResponse = await page.goto("/");
  expect(homeResponse?.headers()["content-security-policy"]).toContain(
    "frame-ancestors 'none'",
  );
  expect(homeResponse?.headers()["x-content-type-options"]).toBe("nosniff");
  expect(homeResponse?.headers()["x-frame-options"]).toBe("DENY");
  expect(homeResponse?.headers()["strict-transport-security"]).toBe(
    "max-age=31536000",
  );
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Para onde você quer ir?",
  );
  await expect(
    page.getByRole("region", {
      name: "Mapa para escolher o primeiro destino",
    }),
  ).toBeVisible();
  await expectNoSeriousAccessibilityViolations(page);

  const mapCanvas = page.locator(".landing-map-stage canvas");
  await expect(mapCanvas).toBeVisible();
  await mapCanvas.click({ position: { x: 900, y: 300 } });

  await expect(page).toHaveURL(`/trips/${tripId}`);
  await expect(page.getByLabel("Nome da viagem")).toHaveValue(trip.name);
  await expect(
    page.locator(".destination-card").filter({ hasText: "Lisboa" }),
  ).toBeVisible();

  await addDestination(page, "Berlim");
  await addDestination(page, "Budapeste");
  await expect(page.locator(".destination-card")).toHaveCount(3);
  await expect
    .poll(() =>
      page.locator(".destination-list").evaluate((element) => ({
        overflowY: getComputedStyle(element).overflowY,
        gutter: getComputedStyle(element).scrollbarGutter,
      })),
    )
    .toEqual({ overflowY: "scroll", gutter: "stable" });

  const editorMapRegion = page.getByRole("region", { name: "Mapa da viagem" });
  await expect
    .poll(() => editorMapRegion.getAttribute("data-map-center"))
    .not.toBeNull();
  const viewportBefore = await editorMapRegion.evaluate((element) => ({
    center: element.getAttribute("data-map-center"),
    zoom: element.getAttribute("data-map-zoom"),
  }));
  await addDestination(page, "Tóquio");
  const editorMap = page.locator(".map-area canvas");
  await editorMap.click({ position: { x: 700, y: 250 } });
  await expect(
    page.locator(".destination-card").filter({ hasText: "Ponto 2" }),
  ).toBeVisible();
  const stopList = page.locator(".destination-list");
  await expect
    .poll(() =>
      stopList.evaluate(
        (element) => element.scrollHeight > element.clientHeight,
      ),
    )
    .toBe(true);
  const scrollPosition = await stopList.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
    return element.scrollTop;
  });
  expect(scrollPosition).toBeGreaterThan(0);
  await expect
    .poll(() =>
      editorMapRegion.evaluate((element) => ({
        center: element.getAttribute("data-map-center"),
        zoom: element.getAttribute("data-map-zoom"),
      })),
    )
    .toEqual(viewportBefore);
  await page.getByRole("button", { name: "Remover Ponto 2" }).click();
  await page.getByRole("button", { name: "Remover Tóquio" }).click();

  await page.getByRole("button", { name: "Remover Berlim" }).click();
  await expect(
    page.locator(".destination-card").filter({ hasText: "Berlim" }),
  ).toHaveCount(0);
  await addDestination(page, "Berlim");
  await expect(page.locator(".destination-card")).toHaveCount(3);
  const lisbonToBudapest = page.getByRole("region", {
    name: "Transporte de Lisboa para Budapeste",
  });
  await lisbonToBudapest.getByRole("button", { name: "Avião" }).click();
  await lisbonToBudapest
    .getByLabel("Valor da passagem de Lisboa para Budapeste")
    .fill("250");
  await lisbonToBudapest
    .getByLabel("Valor da passagem de Lisboa para Budapeste")
    .press("Tab");
  await expect(lisbonToBudapest).toContainText("€ 250");
  await expect(page.locator(".map-kpis")).toContainText("€ 250");
  await expect(editorMapRegion).toHaveAttribute("data-flight-segments", "1");
  await expect(editorMapRegion).toHaveAttribute("data-road-segments", "1");

  const berlinCard = page.locator(".destination-card").filter({
    hasText: "Berlim",
  });
  await berlinCard.getByLabel("Diária").fill("120");
  await berlinCard.getByLabel("Noites").fill("3");
  await berlinCard.getByLabel("Noites").press("Tab");
  await expect(berlinCard).toContainText("€ 360");
  await expect(page.getByText("Salvo", { exact: true })).toBeVisible();

  await page.reload();
  await expect(
    page.getByRole("region", {
      name: "Transporte de Lisboa para Budapeste",
    }),
  ).toContainText("€ 250");
  const persistedBerlinCard = page.locator(".destination-card").filter({
    hasText: "Berlim",
  });
  await expect(persistedBerlinCard.getByLabel("Diária")).toHaveValue("120");
  await expect(persistedBerlinCard.getByLabel("Noites")).toHaveValue("3");
  await expect(persistedBerlinCard).toContainText("€ 360");

  const dragHandle = page.getByRole("button", {
    name: "Reordenar Berlim",
  });
  await dragHandle.focus();
  await dragHandle.press("Space");
  await page.waitForTimeout(150);
  await dragHandle.press("ArrowUp");
  await page.waitForTimeout(150);
  await dragHandle.press("Space");
  await expect(page.locator(".destination-heading strong").nth(1)).toHaveText(
    "Berlim",
  );

  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("Salvo", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Compartilhar" }).click();
  await expect(page.locator(".share-toast")).toContainText("Link copiado");
  const publicUrl = await page
    .getByLabel("Link público da viagem")
    .inputValue();
  expect(publicUrl).toContain(
    `/trip/${trip.slug}#share=${encodeURIComponent(shareToken)}`,
  );
  expect(publicUrl).not.toContain("?share=");

  await page.goto(publicUrl);
  await expect(page.getByText("Somente leitura")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(trip.name);
  await expect(page.getByText("Berlim", { exact: true })).toBeVisible();
  await expect(page.getByText("Budapeste", { exact: true })).toBeVisible();
  await expectNoSeriousAccessibilityViolations(page);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".public-map-area")).toBeVisible();
  await expect(page.locator(".public-stop-list")).toBeVisible();
  await expectNoSeriousAccessibilityViolations(page);
});

async function addDestination(
  page: import("@playwright/test").Page,
  name: "Berlim" | "Budapeste" | "Tóquio",
) {
  await page.getByPlaceholder("Cidade ou endereço").fill(name);
  await page.getByRole("option", { name: new RegExp(name) }).click();
  await page.getByRole("button", { name: "Adicionar destino" }).click();
  await expect(page.locator(".destination-card").filter({ hasText: name }))
    .toBeVisible();
}

async function mockApi(
  route: Route,
  trip: {
    id: string;
    name: string;
    slug: string;
    currency: string;
    travelers_count: number;
    visibility: string;
    share_token: string | null;
    created_at: string;
    updated_at: string;
  },
  stops: MockStop[],
  legs: MockLeg[],
  reverseCoordinates: Array<{
    latitude: number;
    longitude: number;
  }>,
) {
  const request = route.request();
  const url = new URL(request.url());
  const path = url.pathname;
  const method = request.method();

  if (path === "/api/health") {
    return fulfill(route, { ok: true });
  }
  if (path === "/api/trips" && method === "POST") {
    return fulfill(route, trip, 201, {
      "set-cookie": `trip_edit_${tripId}=test-token; Path=/api; HttpOnly; SameSite=Lax`,
    });
  }
  if (path === `/api/trips/${tripId}` && method === "GET") {
    return fulfill(route, { ...trip, stops, legs });
  }
  if (path === `/api/trips/${tripId}` && method === "PATCH") {
    const body = request.postDataJSON();
    if (body.name !== undefined) trip.name = body.name;
    if (body.currency !== undefined) trip.currency = body.currency;
    if (body.travelersCount !== undefined) {
      trip.travelers_count = body.travelersCount;
    }
    if (body.visibility !== undefined) trip.visibility = body.visibility;
    if (body.regenerateShareToken || trip.visibility === "unlisted") {
      trip.share_token = shareToken;
    }
    return fulfill(route, trip);
  }
  if (path === `/api/trips/${tripId}/stops` && method === "POST") {
    const body = request.postDataJSON();
    if (stops.some((stop) => stop.position === body.position)) {
      return fulfillError(route, 409);
    }
    const stop: MockStop = {
      id: crypto.randomUUID(),
      trip_id: tripId,
      position: body.position,
      place_name: body.placeName,
      country: body.country,
      region: body.region ?? null,
      formatted_address: body.formattedAddress ?? null,
      latitude: body.latitude,
      longitude: body.longitude,
      nightly_cost: body.nightlyCost,
      nights: body.nights,
      notes: body.notes ?? null,
      created_at: now,
      updated_at: now,
    };
    stops.push(stop);
    return fulfill(route, stop, 201);
  }
  if (
    path.startsWith(`/api/trips/${tripId}/stops/`) &&
    method === "DELETE"
  ) {
    const index = stops.findIndex((stop) => path.endsWith(stop.id));
    if (index < 0) return fulfillError(route, 404);
    stops.splice(index, 1);
    stops.forEach((stop, position) => {
      stop.position = position;
    });
    return fulfill(route, { deleted: true });
  }
  if (path === `/api/trips/${tripId}/legs` && method === "PUT") {
    const body = request.postDataJSON();
    let leg = legs.find(
      (item) =>
        item.from_stop_id === body.fromStopId &&
        item.to_stop_id === body.toStopId,
    );
    if (!leg) {
      leg = {
        id: crypto.randomUUID(),
        trip_id: tripId,
        from_stop_id: body.fromStopId,
        to_stop_id: body.toStopId,
        transport_mode: body.transportMode,
        transport_cost: body.transportCost,
        created_at: now,
        updated_at: now,
      };
      legs.push(leg);
    } else {
      leg.transport_mode = body.transportMode;
      leg.transport_cost =
        body.transportMode === "flight" ? body.transportCost : 0;
    }
    return fulfill(route, leg);
  }
  if (
    path.startsWith(`/api/trips/${tripId}/stops/`) &&
    path.endsWith("/reorder") &&
    method === "PUT"
  ) {
    const ids = request.postDataJSON().stopIds as string[];
    stops.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
    stops.forEach((stop, position) => {
      stop.position = position;
    });
    return fulfill(route, stops);
  }
  if (
    path.startsWith(`/api/trips/${tripId}/stops/`) &&
    method === "PATCH"
  ) {
    const stop = stops.find((item) => path.endsWith(item.id));
    if (!stop) return fulfillError(route, 404);
    const body = request.postDataJSON();
    if (body.nightlyCost !== undefined) stop.nightly_cost = body.nightlyCost;
    if (body.nights !== undefined) stop.nights = body.nights;
    if (body.notes !== undefined) stop.notes = body.notes;
    return fulfill(route, stop);
  }
  if (path === "/api/geocoding/search") {
    const query = url.searchParams.get("q");
    const places = {
      Berlim: place("Berlim", "Alemanha", 52.52, 13.405),
      Budapeste: place("Budapeste", "Hungria", 47.4979, 19.0402),
      Tóquio: place("Tóquio", "Japão", 35.6762, 139.6503),
    };
    const result =
      query === "Berlim" || query === "Budapeste" || query === "Tóquio"
      ? [places[query]]
      : [];
    return fulfill(route, result);
  }
  if (path === "/api/geocoding/reverse") {
    reverseCoordinates.push({
      latitude: Number(url.searchParams.get("lat")),
      longitude: Number(url.searchParams.get("lon")),
    });
    const requestNumber = reverseCoordinates.length;
    return fulfill(
      route,
      requestNumber === 1
        ? place("Lisboa", "Portugal", 38.7223, -9.1393)
        : place(
            `Ponto ${requestNumber}`,
            "Local de teste",
            reverseCoordinates.at(-1)?.latitude ?? 0,
            reverseCoordinates.at(-1)?.longitude ?? 0,
          ),
    );
  }
  if (path === "/api/routing") {
    return fulfill(route, {
      geometry: {
        type: "LineString",
        coordinates: stops.map((stop) => [stop.longitude, stop.latitude]),
      },
      distanceMeters: 860000,
      provider: "osrm",
      stopsHash: "e2e-route",
      isFallback: false,
    });
  }
  if (path === `/api/public/trips/by-slug/${trip.slug}`) {
    if (request.headers().authorization !== `Bearer ${shareToken}`) {
      return fulfillError(route, 404);
    }
    return fulfill(route, {
      name: trip.name,
      slug: trip.slug,
      currency: trip.currency,
      travelers_count: trip.travelers_count,
      visibility: trip.visibility,
      stops,
      legs,
      route: null,
    });
  }
  return fulfillError(route, 404);
}

function place(
  name: string,
  country: string,
  latitude: number,
  longitude: number,
) {
  return {
    id: name.toLowerCase(),
    placeName: name,
    country,
    region: name,
    formattedAddress: `${name}, ${country}`,
    latitude,
    longitude,
  };
}

async function fulfill(
  route: Route,
  data: unknown,
  status = 200,
  headers?: Record<string, string>,
) {
  await route.fulfill({
    status,
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify({ ok: true, data }),
  });
}

async function fulfillError(route: Route, status: number) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify({
      ok: false,
      error: { code: "NOT_FOUND", message: "Não encontrado." },
    }),
  });
}

async function expectNoSeriousAccessibilityViolations(
  page: import("@playwright/test").Page,
) {
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter(
    (violation) =>
      violation.impact === "serious" || violation.impact === "critical",
  );
  expect(
    serious,
    serious.map((violation) => `${violation.id}: ${violation.help}`).join("\n"),
  ).toEqual([]);
}
