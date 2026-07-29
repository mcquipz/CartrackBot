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
  const { error } = await supabase
    .from("vehicle_trip_state")
    .upsert(
      {
        vehicle_id: vehicle.vehicle_id,
        registration: vehicle.registration,

        active: true,

        start_time: vehicle.event_ts,
        last_movement_time: vehicle.event_ts,

        start_latitude: vehicle.location.latitude,
        start_longitude: vehicle.location.longitude,
        start_address: vehicle.location.position_description,

        start_odometer: vehicle.odometer,

        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "vehicle_id",
      },
    );

  if (error) throw error;
}

export async function finishTrip(
  vehicle: VehicleStatus,
  tripState: any,
) {

const distanceKm =
  tripState.start_odometer != null &&
  vehicle.odometer != null
    ? Number(
        (
          (vehicle.odometer - tripState.start_odometer) / 1000
        ).toFixed(3)
      )
    : 0;

  const start =
    new Date(tripState.start_time);

  const end =
    new Date(vehicle.event_ts);
    const lastMovement =
  tripState.last_movement_time
    ? new Date(tripState.last_movement_time)
    : end;

const gapMinutes =
  Math.floor(
    (
      end.getTime() -
      lastMovement.getTime()
    ) / 1000 / 60
  );
const hadSignalGap =
  gapMinutes >= 10;

  const duration =
    Math.floor(
      (
        end.getTime() -
        start.getTime()
      ) / 1000 / 60,
    );

  const route =
    `https://www.google.com/maps/dir/${tripState.start_latitude},${tripState.start_longitude}/${vehicle.location.latitude},${vehicle.location.longitude}`;

  const { error } = await supabase
    .from("vehicle_trips")
    .insert({

      vehicle_id:
        vehicle.vehicle_id,

      registration:
        vehicle.registration,

      start_time:
        tripState.start_time,

      end_time:
        vehicle.event_ts,

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
        vehicle.location.position_description,

      start_odometer:
        tripState.start_odometer,

      end_odometer:
        vehicle.odometer,

      distance_km:
        distanceKm,

      duration_minutes:
        duration,

      route_url:
        route,

      signal_gap_minutes:
        gapMinutes,
      had_signal_gap:
        hadSignalGap,
    });

  if (error) throw error;
  await notifyTripCompleted(
  vehicle.registration,

  tripState.start_address,

  vehicle.location.position_description,

  distanceKm,

  duration,

  route,

  false,

  0,
);

  await supabase
    .from("vehicle_trip_state")
    .update({
      active: false,
      updated_at:
        new Date().toISOString(),
    })
    .eq(
      "vehicle_id",
      vehicle.vehicle_id,
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