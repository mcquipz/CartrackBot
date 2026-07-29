import "@supabase/functions-js/edge-runtime.d.ts";

import {
  getVehicles,
  getTodayTrips,
  getTrackingPoints,
} from "./database.ts";

import { buildRouteUrl } from "./route.ts";

import {
  sendDailySummary,
} from "./telegram.ts";

Deno.serve(async (_req) => {
  try {

    const vehicles =
      await getVehicles();

    let sent = 0;

    for (const vehicle of vehicles) {

      const trips =
        await getTodayTrips(
          vehicle.vehicle_id,
        );

      const trackingPoints =
        await getTrackingPoints(
          vehicle.vehicle_id,
        );

      const routeUrl =
        buildRouteUrl(
          trackingPoints,
        );

      await sendDailySummary(
        vehicle,
        trips,
        routeUrl,
      );

      sent++;

    }

    return new Response(
      JSON.stringify({
        success: true,
        vehicles: sent,
      }),
      {
        headers: {
          "Content-Type":
            "application/json",
        },
      },
    );

  } catch (err) {

    console.error(err);

    return new Response(
      JSON.stringify({
        success: false,
        error:
          err instanceof Error
            ? err.message
            : String(err),
      }),
      {
        status: 500,
      },
    );

  }
});