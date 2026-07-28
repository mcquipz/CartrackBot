import { createClient } from "@supabase/supabase-js";
import type { VehicleStatus } from "./cartrack.ts";

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
        last_event: vehicle.event_ts,
        updated_at: new Date().toISOString(),
      },
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
export async function insertTrackingPoint(
  vehicle: VehicleStatus,
) {

  if (
    vehicle.speed <= 0 ||
    !vehicle.ignition
  ) {
    return;
  }


  const { error } = await supabase
    .from("vehicle_tracking_points")
    .insert({
      vehicle_id: vehicle.vehicle_id,

      registration:
        vehicle.registration,

      latitude:
        vehicle.location.latitude,

      longitude:
        vehicle.location.longitude,

      speed:
        vehicle.speed,

      ignition:
        vehicle.ignition,
    });


  if (error) {
    throw error;
  }
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