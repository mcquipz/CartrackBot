import {
  createClient,
} from "@supabase/supabase-js";


const supabase =
  createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get(
      "SUPABASE_SERVICE_ROLE_KEY",
    )!,
  );


// ------------------------------------
// GET TODAY'S DATE
// ------------------------------------

function getTodayDate() {

  return new Intl
    .DateTimeFormat(
      "en-CA",
      {
        timeZone:
          "Asia/Manila",

        year:
          "numeric",

        month:
          "2-digit",

        day:
          "2-digit",
      },
    )
    .format(
      new Date(),
    );

}


// ------------------------------------
// SAVE DRIVER ASSIGNMENT
// ------------------------------------

export async function assignDriver(
  driverName: string,
  vehicleRegistration: string,
) {

  const assignmentDate =
    getTodayDate();


  const {
    data,
    error,
  } =
    await supabase
      .from(
        "driver_assignments",
      )
 .upsert(
{
  assignment_date:
    assignmentDate,

  driver_name:
    driverName,

  vehicle_registration:
    vehicleRegistration
      .toUpperCase(),

  updated_at:
    new Date().toISOString(),
},
        {
          onConflict:
            "assignment_date,vehicle_registration",
        },
      )
      .select()
      .single();


  if (error) {

    console.error(
      "Driver assignment error:",
      error,
    );

    throw error;

  }


  console.log(
    "Driver assignment saved:",
    JSON.stringify(
      data,
      null,
      2,
    ),
  );


  return data;

}

// ------------------------------------
// TEMPORARY TELEGRAM DRIVER SELECTION
// ------------------------------------

export async function saveSelectedDriver(
  chatId: string | number,
  driverName: string,
) {
  const { error } = await supabase
    .from("telegram_driver_selection")
    .upsert(
      {
        chat_id: String(chatId),
        driver_name: driverName,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "chat_id",
      },
    );

  if (error) {
    console.error(
      "Failed to save selected driver:",
      error,
    );

    throw error;
  }
}


export async function getSelectedDriver(
  chatId: string | number,
) {
  const { data, error } = await supabase
    .from("telegram_driver_selection")
    .select("driver_name")
    .eq(
      "chat_id",
      String(chatId),
    )
    .maybeSingle();

  if (error) {
    console.error(
      "Failed to get selected driver:",
      error,
    );

    throw error;
  }

  return data?.driver_name ?? null;
}


export async function clearSelectedDriver(
  chatId: string | number,
) {
  const { error } = await supabase
    .from("telegram_driver_selection")
    .delete()
    .eq(
      "chat_id",
      String(chatId),
    );

  if (error) {
    console.error(
      "Failed to clear selected driver:",
      error,
    );

    throw error;
  }
}


// ------------------------------------
// GET TODAY'S DRIVER ASSIGNMENTS
// ------------------------------------

export async function
getTodayDriverAssignments() {

  const assignmentDate =
    getTodayDate();


  const {
    data,
    error,
  } =
    await supabase
      .from(
        "driver_assignments",
      )
      .select(
        "*",
      )
      .eq(
        "assignment_date",
        assignmentDate,
      );


  if (error) {

    console.error(
      "Driver assignments query error:",
      error,
    );

    throw error;

  }


  return data ?? [];

}


// ------------------------------------
// GET ALL VEHICLE STATUS
// INCLUDING TODAY'S DRIVER
// ------------------------------------

export async function
getAllVehicleStatus() {

  const {
    data:
      vehicleData,

    error:
      vehicleError,

  } =
    await supabase
      .from(
        "latest_vehicle_status",
      )
      .select(
        "*",
      )
      .order(
        "registration",
        {
          ascending:
            true,
        },
      );


  if (
    vehicleError
  ) {

    throw vehicleError;

  }


  const assignments =
    await getTodayDriverAssignments();


  const driverMap =
    new Map(
      assignments.map(
        (
          assignment,
        ) => [

          assignment
            .vehicle_registration
            .toUpperCase(),

          assignment
            .driver_name,

        ],
      ),
    );


  const vehicles =
    (
      vehicleData ?? []
    ).map(
      (
        vehicle,
      ) => ({

        ...vehicle,

        driver_name:

          driverMap.get(

            vehicle
              .registration
              .toUpperCase(),

          )

          ??

          "No driver assigned",

      }),
    );


  console.log(
    "Vehicle Status With Drivers:",
    JSON.stringify(
      vehicles,
      null,
      2,
    ),
  );


  return vehicles;

}


// ------------------------------------
// GET TODAY'S TRIPS
// ------------------------------------

export async function getTodayTrips() {

  const today =
    getTodayDate();


  const {
    data: trips,
    error,
  } =
    await supabase
      .from("vehicle_trips")
      .select("*")
      .gte(
        "start_time",
        `${today}T00:00:00`,
      )
      .order(
        "start_time",
        {
          ascending:false,
        },
      );


  if(error)
    throw error;


  const assignments =
    await getTodayDriverAssignments();


  const driverMap =
    new Map(
      assignments.map(
        assignment => [

          assignment
            .vehicle_registration
            .toUpperCase(),

          assignment
            .driver_name,

        ],
      ),
    );


  return (
    trips ?? []
  ).map(
    trip => {

      let fuelUsed =
        trip.fuel_used;


      let fuelEconomy =
        trip.fuel_economy;


      // Calculate if values are missing
      if (
        fuelUsed == null &&
        trip.start_fuel != null &&
        trip.end_fuel != null
      ) {

        fuelUsed =
          trip.start_fuel -
          trip.end_fuel;

      }


      if (
        fuelEconomy == null &&
        fuelUsed > 0 &&
        trip.distance_km > 0
      ) {

        fuelEconomy =
          trip.distance_km /
          fuelUsed;

      }


      return {

        ...trip,


        driver_name:
          driverMap.get(
            trip.registration
              .toUpperCase(),
          )
          ??
          "No driver assigned",


        fuel_used:
          fuelUsed,


        fuel_economy:
          fuelEconomy
          ?
          Number(
            fuelEconomy.toFixed(2),
          )
          :
          null,

      };

    },
  );

}
// ------------------------------------
// GET TODAY'S VEHICLE EVENTS
// ------------------------------------

export async function getTodayVehicleEvents(
  registration?: string
) {

  const today =
    getTodayDate();


  const {
    data,
    error,
  } =
    await supabase
      .from("vehicle_logs")
      .select(`
        id,
        created_at,
        vehicle_registration,
        status_event,
        location_address,
        latitude,
        longitude
      `)
      .gte(
        "created_at",
        `${today}T00:00:00+08:00`,
      )
      .order(
        "created_at",
        {
          ascending: false,
        },
      );


  if(error){

    console.error(
      "Vehicle event query error:",
      error,
    );

    return [];

  }


  let events =
    data ?? [];


  // Filter selected vehicle
  if(
    registration &&
    registration !== "ALL"
  ){

    events =
      events.filter(
        event =>
          event.vehicle_registration
            .toUpperCase()
          ===
          registration.toUpperCase()
      );

  }


  // Get today's driver assignments
  const assignments =
    await getTodayDriverAssignments();


  const driverMap =
    new Map(
      assignments.map(
        assignment => [
          assignment.vehicle_registration
            .toUpperCase(),

          assignment.driver_name,

        ],
      ),
    );


  // Attach driver name to events
  events =
    events.map(
      event => ({

        ...event,

        driver_name:
          driverMap.get(
            event.vehicle_registration
              .toUpperCase(),
          )
          ??
          "No driver assigned",

      }),
    );


  return events;

}