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

const now = "2026-07-28T12:00:00.000Z";
const tripId = "a773d8f0-04bd-4778-8e8b-12c404f01995";
const shareToken = "public-share-token-with-more-than-32-characters";

test("cria, edita, reordena, salva e compartilha uma viagem", async ({
  page,
  context,
}) => {
  const stops: MockStop[] = [];
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
  await context.route("https://tile.openstreetmap.org/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "image/png",
      body: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
        "base64",
      ),
    }),
  );
  await context.route("**/api/**", async (route) => {
    await mockApi(route, trip, stops);
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
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Uma viagem clara",
  );
  await expectNoSeriousAccessibilityViolations(page);

  await page.getByLabel("Nome da viagem").fill(trip.name);
  await page.getByLabel("Identificador").fill(trip.slug);
  await page.getByLabel("Viajantes").fill("2");
  await page.getByRole("button", { name: "Criar viagem" }).click();

  await expect(page).toHaveURL(`/trips/${tripId}`);
  await expect(page.getByLabel("Nome da viagem")).toHaveValue(trip.name);

  await addDestination(page, "Berlim");
  await addDestination(page, "Budapeste");
  await expect(page.locator(".destination-card")).toHaveCount(2);

  const berlinCard = page.locator(".destination-card").filter({
    hasText: "Berlim",
  });
  await berlinCard.getByLabel("Diária").fill("120");
  await berlinCard.getByLabel("Noites").fill("3");
  await berlinCard.getByLabel("Noites").press("Tab");
  await expect(berlinCard).toContainText("€ 360");

  const dragHandle = page.getByRole("button", {
    name: "Reordenar Berlim",
  });
  await dragHandle.focus();
  await dragHandle.press("Space");
  await page.waitForTimeout(150);
  await dragHandle.press("ArrowDown");
  await page.waitForTimeout(150);
  await dragHandle.press("Space");
  await expect(page.locator(".destination-heading strong").first()).toHaveText(
    "Budapeste",
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
  name: "Berlim" | "Budapeste",
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
      "set-cookie": `trip_edit_${tripId}=test-token; Path=/api/trips/${tripId}; HttpOnly; SameSite=Lax`,
    });
  }
  if (path === `/api/trips/${tripId}` && method === "GET") {
    return fulfill(route, { ...trip, stops });
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
    const stop: MockStop = {
      id: `00000000-0000-4000-8000-${String(stops.length + 1).padStart(12, "0")}`,
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
    };
    const result = query === "Berlim" || query === "Budapeste"
      ? [places[query]]
      : [];
    return fulfill(route, result);
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
