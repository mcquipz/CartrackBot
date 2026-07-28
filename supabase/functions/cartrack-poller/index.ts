import "@supabase/functions-js/edge-runtime.d.ts";

import { fetchVehicles } from "./cartrack.ts";
import {
  getLatestStatus,
  updateLatestStatus,
  insertVehicleLog,
} from "./database.ts";

import {
  notifyVehicleStarted,
  notifyVehicleStopped,
} from "./telegram.ts";

Deno.serve(async (_req) => {
  try {
    const vehicles = await fetchVehicles();

    let processed = 0;
    let notifications = 0;

    for (const vehicle of vehicles) {
      processed++;

      const previous = await getLatestStatus(vehicle.vehicle_id);
      // First time seeing this vehicle
      if (!previous) {
        await updateLatestStatus(vehicle);

        await insertVehicleLog(
          vehicle,
          vehicle.ignition ? "IGNITION ON" : "IGNITION OFF",
        );

        continue;
      }

      const previousSpeed = previous?.speed ?? 0;
      const previousIgnition = previous?.ignition ?? false;

      const ignitionChanged =
        previousIgnition !== vehicle.ignition;

      const startedMoving =
        previousSpeed === 0 &&
        vehicle.speed > 0;

      const stoppedMoving =
        previousSpeed > 0 &&
        vehicle.speed === 0;

      if (ignitionChanged) {
        await insertVehicleLog(
          vehicle,
          vehicle.ignition
            ? "IGNITION ON"
            : "IGNITION OFF",
        );
      }

      if (startedMoving) {
        await notifyVehicleStarted(
          vehicle.registration,
          vehicle.speed,
          vehicle.location.latitude,
          vehicle.location.longitude,
          vehicle.location.position_description,
        );

        await insertVehicleLog(
          vehicle,
          "MOTION STARTED",
        );

        notifications++;
      }

      if (stoppedMoving) {
        await notifyVehicleStopped(
          vehicle.registration,
          vehicle.location.latitude,
          vehicle.location.longitude,
          vehicle.location.position_description,
        );

        await insertVehicleLog(
          vehicle,
          "MOTION STOPPED",
        );

        notifications++;
      }

      await updateLatestStatus(vehicle);
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed,
        notifications,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  } catch (err) {
    console.error(err);

    return new Response(
      JSON.stringify({
        success: false,
        error: err instanceof Error
          ? err.message
          : String(err),
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  }
});