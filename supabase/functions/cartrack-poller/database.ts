import { createClient } from "@supabase/supabase-js";
import type { VehicleStatus } from "./cartrack.ts";
import { notifyTripCompleted } from "./telegram.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
);

export async function getLatestStatus(vehicleId: number): Promise<any> {
  const { data, error } = await supabase
    .from("latest_vehicle_status")
    .select("*")
    .eq("vehicle_id", vehicleId)
    .maybeSingle();

  if (error) throw error;

  return data;
}

export async function updateLatestStatus(vehicle: VehicleStatus) {
  const { error } = await supabase
    .from("latest_vehicle_status")
    .upsert(
  {
    vehicle_id: vehicle.vehicle_id,
    registration: vehicle.registration,
    ignition: vehicle.ignition,
    speed: vehicle.speed,

    latitude: vehicle.location.latitude,
    longitude: vehicle.location.longitude,
    address: vehicle.location.position_description,

    odometer: vehicle.odometer,
    fuel_level: vehicle.fuel?.level ?? null,
    fuel_percentage: vehicle.fuel?.precentage_left ?? null,

    road_speed: vehicle.road_speed ?? null,

    battery_voltage: vehicle.vext
      ? Number(vehicle.vext)
      : null,

    tcu_percentage: vehicle.tcu_percentage ?? null,

    gps_fix_type:
      vehicle.location.gps_fix_type ?? null,

    last_event: vehicle.event_ts,
    updated_at: new Date().toISOString(),
  },   // <-- comma here
  {
    onConflict: "vehicle_id",
  },
);

  if (error) throw error;
}

export async function insertVehicleLog(
  vehicle: VehicleStatus,
  eventType: string,
) {
  const { error } = await supabase
    .from("vehicle_logs")
    .insert({
      vehicle_id: vehicle.vehicle_id,
      registration: vehicle.registration,

      event_type: eventType,

      ignition: vehicle.ignition,
      moving: vehicle.speed > 0,
      speed: vehicle.speed,

      latitude: vehicle.location.latitude,
      longitude: vehicle.location.longitude,

      address: vehicle.location.position_description,

      google_maps_url:
        `https://www.google.com/maps?q=${vehicle.location.latitude},${vehicle.location.longitude}`,

      fuel_level: vehicle.fuel?.level ?? null,

      battery_percentage: null,

      raw_payload: vehicle,
    });

  if (error) throw error;
}
export async function updateLowFuelNotification(
  vehicleId: number,
  value: boolean,
) {
  const { error } = await supabase
    .from("latest_vehicle_status")
    .update({
      low_fuel_notified: value,
    })
    .eq("vehicle_id", vehicleId);

  if (error) throw error;
}
export async function updateOfflineNotification(
  vehicleId: number,
  value: boolean,
) {
  const { error } = await supabase
    .from("latest_vehicle_status")
    .update({
      offline_notified: value,
    })
    .eq("vehicle_id", vehicleId);

  if (error) throw error;
}

export async function getTodayTrackingPoints(
  vehicleId:number
) {

  const today =
    new Date()
      .toISOString()
      .split("T")[0];


  const {data,error} =
    await supabase
      .from(
        "vehicle_tracking_points"
      )
      .select("*")
      .eq(
        "vehicle_id",
        vehicleId
      )
      .gte(
        "recorded_at",
        `${today}T00:00:00`
      )
      .order(
        "recorded_at",
        {
          ascending:true
        }
      );


  if(error)
    throw error;


  return data;
}
export async function insertTrackingPoint(vehicle: VehicleStatus) {
  const { error } = await supabase
    .from("vehicle_tracking_points")
    .insert({
      vehicle_id: vehicle.vehicle_id,
      registration: vehicle.registration,

      latitude: vehicle.location.latitude,
      longitude: vehicle.location.longitude,

      speed: vehicle.speed,
      ignition: vehicle.ignition,

      address: vehicle.location.position_description,

      bearing: vehicle.bearing,
      odometer: vehicle.odometer,
      cartrack_time: vehicle.event_ts,
    });

  if (error) throw error;
}



export async function getTripState(
  vehicleId: number,
) {
  const { data, error } = await supabase
    .from("vehicle_trip_state")
    .select("*")
    .eq("vehicle_id", vehicleId)
    .maybeSingle();

  if (error) throw error;

  return data;
}

export async function startTrip(
  vehicle: VehicleStatus,
) {

  const { error } =
    await supabase
      .from(
        "vehicle_trip_state",
      )
      .upsert(
        {

          vehicle_id:
            vehicle.vehicle_id,

          registration:
            vehicle.registration,


          active:
            true,


          start_time:
            vehicle.event_ts,

          last_movement_time:
            vehicle.event_ts,


          start_latitude:
            vehicle.location.latitude,

          start_longitude:
            vehicle.location.longitude,

          start_address:
            vehicle.location
              .position_description,


          start_odometer:
            vehicle.odometer,


          // CORRECT FUEL PROPERTY
          start_fuel:
            vehicle.fuel?.level
            ?? null,


          updated_at:
            new Date()
              .toISOString(),

        },
        {

          onConflict:
            "vehicle_id",

        },
      );


  if (error) {

    console.error(
      "Failed to start trip:",
      error,
    );

    throw error;

  }


  console.log(
    "Trip started:",
    {

      registration:
        vehicle.registration,

      startTime:
        vehicle.event_ts,

      startOdometer:
        vehicle.odometer,

      startFuel:
        vehicle.fuel?.level
        ?? null,

    },
  );

}

export async function finishTrip(
  vehicle: VehicleStatus,
  tripState: any,
) {

  // ------------------------------------
  // TRIP START
  // ------------------------------------

  const start =
    new Date(
      tripState.start_time,
    );


  // ------------------------------------
  // LAST KNOWN MOVEMENT
  // ------------------------------------

  const lastMovement =
    tripState.last_movement_time
      ? new Date(
          tripState.last_movement_time,
        )
      : start;


  // ------------------------------------
  // LATEST CARTRACK EVENT
  // ------------------------------------

  const latestEvent =
    new Date(
      vehicle.event_ts,
    );


  // ------------------------------------
  // USE A SAFE TRIP END TIME
  // ------------------------------------

  /*
    If the latest Cartrack event is much
    later than the last movement, do not
    make the trip duration include all
    the parked time.

    The trip ends at the last movement
    timestamp in that situation.
  */

  const minutesAfterMovement =
    (
      latestEvent.getTime() -
      lastMovement.getTime()
    )
    /
    1000
    /
    60;


  const end =
    minutesAfterMovement > 10
      ? lastMovement
      : latestEvent;


  // ------------------------------------
  // CALCULATE DISTANCE
  // ------------------------------------

  const distanceKm =
    tripState.start_odometer != null &&
    vehicle.odometer != null
      ? Number(
          (
            (
              vehicle.odometer -
              tripState.start_odometer
            )
            /
            1000
          ).toFixed(3),
        )
      : 0;


  // ------------------------------------
  // CALCULATE DURATION
  // ------------------------------------

  const duration =
    Math.max(
      0,

      Math.floor(
        (
          end.getTime() -
          start.getTime()
        )
        /
        1000
        /
        60,
      ),
    );


  // ------------------------------------
  // CHECK GPS SIGNAL GAP
  // ------------------------------------

  const gapMinutes =
    Math.max(
      0,

      Math.floor(
        (
          latestEvent.getTime() -
          lastMovement.getTime()
        )
        /
        1000
        /
        60,
      ),
    );


  const hadSignalGap =
    gapMinutes >= 10;


  // ------------------------------------
  // CREATE GOOGLE MAPS ROUTE
  // ------------------------------------

  const route =
    `https://www.google.com/maps/dir/` +
    `${tripState.start_latitude},` +
    `${tripState.start_longitude}/` +
    `${vehicle.location.latitude},` +
    `${vehicle.location.longitude}`;


  // ------------------------------------
  // GET FUEL VALUES
  // ------------------------------------

  const startFuel =
    tripState.start_fuel
    ?? null;


  const endFuel =
    vehicle.fuel?.level
    ?? null;


  // ------------------------------------
  // CALCULATE FUEL USED
  // ------------------------------------

  const rawFuelUsed =
    startFuel != null &&
    endFuel != null
      ? startFuel - endFuel
      : null;


  /*
    Ignore negative fuel usage.

    Fuel may increase because the vehicle
    was refueled, or because the sensor
    value fluctuated.
  */

  const fuelUsed =
    rawFuelUsed != null &&
    rawFuelUsed > 0
      ? Number(
          rawFuelUsed
            .toFixed(2),
        )
      : null;


  // ------------------------------------
  // CALCULATE FUEL ECONOMY
  // ------------------------------------

  const fuelEconomy =
    fuelUsed != null &&
    fuelUsed > 0 &&
    distanceKm > 0
      ? Number(
          (
            distanceKm /
            fuelUsed
          )
          .toFixed(2),
        )
      : null;


  // ------------------------------------
  // SAVE COMPLETED TRIP
  // ------------------------------------

  const {
    error,
  } =
    await supabase
      .from(
        "vehicle_trips",
      )
      .insert({

        vehicle_id:
          vehicle.vehicle_id,

        registration:
          vehicle.registration,


        start_time:
          tripState.start_time,

        end_time:
          end.toISOString(),


        start_latitude:
          tripState.start_latitude,

        start_longitude:
          tripState.start_longitude,

        start_address:
          tripState.start_address,


        end_latitude:
          vehicle.location.latitude,

        end_longitude:
          vehicle.location.longitude,

        end_address:
          vehicle.location
            .position_description,


        start_odometer:
          tripState.start_odometer,

        end_odometer:
          vehicle.odometer,


        // FUEL DATA

        start_fuel:
          startFuel,

        end_fuel:
          endFuel,

        fuel_used:
          fuelUsed,

        fuel_economy:
          fuelEconomy,


        // TRIP DATA

        distance_km:
          distanceKm,

        duration_minutes:
          duration,

        route_url:
          route,


        // GPS SIGNAL DATA

        signal_gap_minutes:
          gapMinutes,

        had_signal_gap:
          hadSignalGap,

      });


  if (error) {

    console.error(
      "Failed to save trip:",
      error,
    );

    throw error;

  }


  // ------------------------------------
  // SEND TRIP COMPLETED NOTIFICATION
  // ------------------------------------

  await notifyTripCompleted(

    vehicle.registration,

    tripState.start_address,

    vehicle.location
      .position_description,

    distanceKm,

    duration,

    route,

    hadSignalGap,

    gapMinutes,

    startFuel,

    endFuel,

  );


  // ------------------------------------
  // CLOSE ACTIVE TRIP
  // ------------------------------------

  const {
    error:
      updateError,
  } =
    await supabase
      .from(
        "vehicle_trip_state",
      )
      .update({

        active:
          false,

        updated_at:
          new Date()
            .toISOString(),

      })
      .eq(
        "vehicle_id",
        vehicle.vehicle_id,
      );


  if (updateError) {

    console.error(
      "Failed to close trip:",
      updateError,
    );

    throw updateError;

  }


  console.log(
    "Trip completed successfully:",
    {

      registration:
        vehicle.registration,

      startTime:
        tripState.start_time,

      endTime:
        end.toISOString(),

      distanceKm,

      duration,

      startFuel,

      endFuel,

      fuelUsed,

      fuelEconomy,

    },
  );

}




export async function updateTripMovement(
  vehicle: VehicleStatus,
) {
  const { error } = await supabase
    .from("vehicle_trip_state")
    .update({
      last_movement_time: vehicle.event_ts,
      updated_at: new Date().toISOString(),
    })
    .eq("vehicle_id", vehicle.vehicle_id);

  if (error) throw error;
}