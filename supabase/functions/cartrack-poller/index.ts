import "@supabase/functions-js/edge-runtime.d.ts";

import { fetchVehicles } from "./cartrack.ts";

import {
  getLatestStatus,
  updateLatestStatus,
  insertVehicleLog,
  insertTrackingPoint,

  getTripState,
  startTrip,
  finishTrip,
  updateTripMovement,

  updateLowFuelNotification,
  updateOfflineNotification,
} from "./database.ts";

import {
  notifyVehicleStarted,
  notifyVehicleStopped,
  notifyIgnitionOn,
  notifyIgnitionOff,
  notifyLowFuel,
  notifyVehicleOffline,
  notifyVehicleOnline,
  notifyOverspeed,
  notifyTripCompleted,
} from "./telegram.ts";


const OFFLINE_MINUTES =
  Number(
    Deno.env.get("OFFLINE_MINUTES") ?? "15",
  );

const OVERSPEED_LIMIT =
  Number(
    Deno.env.get("OVERSPEED_LIMIT") ?? "90",
  );

const TRIP_IDLE_MINUTES =
  Number(
    Deno.env.get("TRIP_IDLE_MINUTES") ?? "10",
  );


Deno.serve(async (_req) => {
  try {
    const vehicles = await fetchVehicles();

    let processed = 0;
    let notifications = 0;


    for (const vehicle of vehicles) {

      processed++;

      const previous = await getLatestStatus(
        vehicle.vehicle_id,  
      );

      // First time seeing vehicle
if (!previous) {

  await insertTrackingPoint(vehicle);

  await updateLatestStatus(vehicle);

  await insertVehicleLog(
    vehicle,
    vehicle.ignition
      ? "IGNITION ON"
      : "IGNITION OFF",
  );

  continue;
}



      const previousSpeed = previous.speed ?? 0;

      const previousIgnition =
        previous.ignition ?? false;



      /*
        OFFLINE CHECK
      */

      const lastUpdate =
        new Date(vehicle.event_ts);

      const now =
        new Date();


      const minutesOffline =
        (
          now.getTime() -
          lastUpdate.getTime()
        )
        / 1000
        / 60;


      const vehicleOffline =
        minutesOffline >= OFFLINE_MINUTES &&
        !previous.offline_notified;



      if (vehicleOffline) {

        await notifyVehicleOffline(
          vehicle.registration,
          vehicle.location.latitude,
          vehicle.location.longitude,
          vehicle.location.position_description,
          vehicle.event_ts,
        );


        await updateOfflineNotification(
          vehicle.vehicle_id,
          true,
        );


        await insertVehicleLog(
          vehicle,
          "VEHICLE_OFFLINE",
        );


        notifications++;
      }



      if (
        minutesOffline < OFFLINE_MINUTES &&
        previous.offline_notified
      ) {

        await notifyVehicleOnline(
          vehicle.registration,
        );


        await updateOfflineNotification(
          vehicle.vehicle_id,
          false,
        );

      }




      /*
        IGNITION CHECK
      */

      const ignitionChanged =
        previousIgnition !== vehicle.ignition;



      if (ignitionChanged) {


        if (vehicle.ignition) {

          await notifyIgnitionOn(
            vehicle.registration,
            vehicle.location.latitude,
            vehicle.location.longitude,
            vehicle.location.position_description,
          );


        } else {


          await notifyIgnitionOff(
            vehicle.registration,
            vehicle.location.latitude,
            vehicle.location.longitude,
            vehicle.location.position_description,
          );

        }


        await insertVehicleLog(
          vehicle,
          vehicle.ignition
            ? "IGNITION ON"
            : "IGNITION OFF",
        );


        notifications++;

      }




/*
  MOVEMENT CHECK
*/

const MOVING_SPEED = 5;

const isMoving =
  (vehicle.speed ?? 0) > MOVING_SPEED;


const tripState =
  await getTripState(
    vehicle.vehicle_id,
  );


// ------------------------------------
// VEHICLE STARTED MOVING
// ------------------------------------

if (
  isMoving &&
  !tripState?.active
) {

  await startTrip(
    vehicle,
  );


  await notifyVehicleStarted(
    vehicle.registration,
    vehicle.speed ?? 0,
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


// ------------------------------------
// VEHICLE IS STILL MOVING
// ------------------------------------

else if (
  isMoving &&
  tripState?.active
) {

  await updateTripMovement(
    vehicle,
  );

}


// ------------------------------------
// VEHICLE IS STOPPED
// ------------------------------------

else if (
  !isMoving &&
  tripState?.active
) {

  const lastMovementTime =
    new Date(
      tripState.last_movement_time,
    );


  const currentEventTime =
    new Date(
      vehicle.event_ts,
    );


  const idleMinutes =
    Math.max(
      0,

      (
        currentEventTime.getTime() -
        lastMovementTime.getTime()
      )
      /
      1000
      /
      60,
    );


  console.log(
    "Trip idle check:",
    {
      registration:
        vehicle.registration,

      eventTime:
        vehicle.event_ts,

      lastMovementTime:
        tripState.last_movement_time,

      idleMinutes,

      requiredIdleMinutes:
        TRIP_IDLE_MINUTES,
    },
  );


  if (
    idleMinutes >=
    TRIP_IDLE_MINUTES
  ) {

    await finishTrip(
      vehicle,
      tripState,
    );


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

}

      /*
        LOW FUEL CHECK
      */


      const fuelLevel =
        vehicle.fuel?.level ?? null;



      const lowFuel =
        fuelLevel !== null &&
        fuelLevel <= 10 &&
        !previous.low_fuel_notified;



      if (lowFuel) {


        await notifyLowFuel(
          vehicle.registration,
          fuelLevel,
          vehicle.location.latitude,
          vehicle.location.longitude,
          vehicle.location.position_description,
        );


        await updateLowFuelNotification(
          vehicle.vehicle_id,
          true,
        );


        await insertVehicleLog(
          vehicle,
          "LOW_FUEL",
        );


        notifications++;

      }



      if (
        fuelLevel !== null &&
        fuelLevel > 10 &&
        previous.low_fuel_notified
      ) {


        await updateLowFuelNotification(
          vehicle.vehicle_id,
          false,
        );

      }




      /*
        OVERSPEED CHECK
      */

const overspeed =
  previousSpeed <= OVERSPEED_LIMIT &&
  vehicle.speed > OVERSPEED_LIMIT;


if (overspeed) {

  await notifyOverspeed(
    vehicle.registration,
    vehicle.speed,
    vehicle.location.latitude,
    vehicle.location.longitude,
    vehicle.location.position_description,
  );


  await insertVehicleLog(
    vehicle,
    "OVERSPEED",
  );


  notifications++;

}




await insertTrackingPoint(vehicle);

await updateLatestStatus(vehicle);

    }



    return new Response(
      JSON.stringify({
        success: true,
        processed,
        notifications,
        timestamp:
          new Date().toISOString(),
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
        error:
          err instanceof Error
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