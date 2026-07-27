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
  statusEvent: string,
) {
  const { error } = await supabase
    .from("vehicle_logs")
    .insert({
      vehicle_registration: vehicle.registration,
      status_event: statusEvent,
      location_address: vehicle.location.position_description,
      latitude: vehicle.location.latitude,
      longitude: vehicle.location.longitude,
      google_maps_url: `https://www.google.com/maps?q=${vehicle.location.latitude},${vehicle.location.longitude}`,
    });

  if (error) throw error;
}