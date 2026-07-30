import {createClient}
from "@supabase/supabase-js";


const supabase =
createClient(
 Deno.env.get("SUPABASE_URL")!,
 Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);


export async function getAllVehicleStatus() {

  const { data, error } =
    await supabase
      .from("latest_vehicle_status")
      .select("*")
      .order(
        "registration",
        {
          ascending: true,
        },
      );


  console.log(
    "Vehicle Status Query Result:",
    JSON.stringify(data, null, 2)
  );


  if (error)
    throw error;


  return data ?? [];
}
export async function getTodayTrips() {
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("vehicle_trips")
    .select("*")
    .gte("start_time", `${today}T00:00:00`)
    .order("start_time", { ascending: false });

  if (error) throw error;

  return data ?? [];
}