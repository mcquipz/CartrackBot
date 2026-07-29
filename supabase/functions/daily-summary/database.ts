import { createClient } from "jsr:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

export async function getVehicles() {
  const { data, error } = await supabase
    .from("latest_vehicle_status")
    .select("vehicle_id, registration")
    .order("registration");

  if (error) throw error;

  return data;
}

export async function getTodayTrips(
  vehicleId: number,
) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("vehicle_trips")
    .select("*")
    .eq("vehicle_id", vehicleId)
    .gte("start_time", start.toISOString())
    .order("start_time");

  if (error) throw error;

  return data ?? [];
}

export async function getTrackingPoints(
  vehicleId: number,
) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("vehicle_tracking_points")
    .select("latitude, longitude")
    .eq("vehicle_id", vehicleId)
    .gte("recorded_at", start.toISOString())
    .order("recorded_at");

  if (error) throw error;

  return data ?? [];
}