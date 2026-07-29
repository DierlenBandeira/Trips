import { chromium } from "@playwright/test";

const baseUrl = process.env.PRODUCTION_URL;
if (!baseUrl) {
  throw new Error("PRODUCTION_URL is required.");
}

const browser = await chromium.launch();
const page = await browser.newPage();
const results = {
  create: false,
  privateRead: false,
  stops: false,
  route: false,
  share: false,
  publicRead: false,
  delete: false,
};

try {
  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  const slug = `security-smoke-${Date.now()}`;
  const outcome = await page.evaluate(async ({ slug }) => {
    let tripId = null;
    const state = {
      create: false,
      privateRead: false,
      stops: false,
      route: false,
      share: false,
      publicRead: false,
      delete: false,
    };

    async function api(path, init) {
      const response = await fetch(path, init);
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(`${path} returned ${response.status}`);
      }
      return payload.data;
    }

    try {
      const trip = await api("/api/trips", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "Security smoke test",
          slug,
          currency: "EUR",
          travelersCount: 2,
        }),
      });
      tripId = trip.id;
      state.create = Boolean(tripId);

      const privateTrip = await api(`/api/trips/${tripId}`);
      state.privateRead = privateTrip.id === tripId;

      const stops = [
        {
          position: 0,
          placeName: "Berlim",
          country: "Alemanha",
          region: "Berlim",
          formattedAddress: "Berlim, Alemanha",
          latitude: 52.52,
          longitude: 13.405,
          nightlyCost: 100,
          nights: 2,
          notes: "smoke",
        },
        {
          position: 1,
          placeName: "Budapeste",
          country: "Hungria",
          region: "Budapeste",
          formattedAddress: "Budapeste, Hungria",
          latitude: 47.4979,
          longitude: 19.0402,
          nightlyCost: 90,
          nights: 2,
          notes: null,
        },
      ];
      const createdStops = [];
      for (const stop of stops) {
        createdStops.push(
          await api(`/api/trips/${tripId}/stops`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(stop),
          }),
        );
      }
      state.stops = createdStops.length === 2;

      const route = await api("/api/routing", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tripId,
          stops: stops.map(({ latitude, longitude }) => ({
            latitude,
            longitude,
          })),
        }),
      });
      state.route = route.geometry?.type === "LineString";

      const shared = await api(`/api/trips/${tripId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          visibility: "unlisted",
          regenerateShareToken: true,
        }),
      });
      state.share = Boolean(shared.share_token);

      const publicTrip = await api(`/api/public/trips/by-slug/${slug}`, {
        headers: { authorization: `Bearer ${shared.share_token}` },
      });
      state.publicRead =
        publicTrip.slug === slug && publicTrip.stops.length === 2;
    } finally {
      if (tripId) {
        try {
          const deleted = await api(`/api/trips/${tripId}`, {
            method: "DELETE",
          });
          state.delete = deleted.deleted === true;
        } catch {
          state.delete = false;
        }
      }
    }
    return state;
  }, { slug });

  Object.assign(results, outcome);
} finally {
  await browser.close();
}

for (const [name, passed] of Object.entries(results)) {
  console.log(`${name.toUpperCase()}_OK=${passed}`);
}

if (Object.values(results).some((passed) => !passed)) {
  process.exitCode = 1;
}
