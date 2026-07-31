import {
  sendTelegramMessage,
  sendLocation,
  sendMenu,
  vehicleMenu,
  driverMenu,
  driverVehicleMenu,
} from "./telegram.ts";

import {
  assignDriver,
  getAllVehicleStatus,
  getTodayTrips,
  getTodayVehicleEvents,
  saveSelectedDriver,
  getSelectedDriver,
  clearSelectedDriver,
} from "./database.ts";

async function sendTripReport(
  chatId: string | number,
  registration?: string,
) {

  console.log("Loading today's trips...");

  let trips = await getTodayTrips();


  // Filter selected vehicle
  if (
    registration &&
    registration !== "ALL"
  ) {

    trips =
      trips.filter(
        trip =>
          trip.registration.toUpperCase()
          === registration.toUpperCase()
      );

  }


  let response =
`📋 *Today's Trips*

`;


  if(trips.length === 0){

    response += "No trips today.";

  }
  else {


    for(const trip of trips){


      const distance =
        trip.distance_km != null
          ? Number(trip.distance_km).toFixed(1)
          : "0";


      const fuel =
        trip.fuel_used != null
          ? Math.round(trip.fuel_used)
          : 0;


      response +=
`
🚘 *${trip.registration}*

👤 Driver:
${trip.driver_name ?? "No driver assigned"}

📍 From:
${trip.start_address}

➡️ To:
${trip.end_address}

📏 Distance:
${distance} km

⛽ Fuel Used:
${fuel} L

📊 Economy:
${
trip.fuel_economy
?
Number(trip.fuel_economy).toFixed(1)
:
"N/A"
} km/L

⏱ Duration:
${trip.duration_minutes} minutes

✅ Trip Completed

`;

    }

  }


await sendTelegramMessage(
  chatId,
  response
);

}

async function sendVehicleEventsReport(
  chatId: string | number,
  registration?: string,
){

  console.log(
    "Loading vehicle events..."
  );


  const events =
    await getTodayVehicleEvents(
      registration
    );


  let response =
`📋 *Today's Vehicle Events*

`;


  if(events.length === 0){

    response +=
    "No vehicle events today.";

  }
  else {


    for(
      const event of events
    ){

      const eventTime =
        new Date(
          event.created_at
        )
        .toLocaleTimeString(
          "en-PH",
          {
            timeZone:
              "Asia/Manila",

            hour:
              "2-digit",

            minute:
              "2-digit",

          }
        );


      let eventText =
        event.status_event;


      switch(event.status_event){

        case "IGNITION ON":
          eventText =
            "🔑 Ignition ON";
          break;


        case "IGNITION OFF":
          eventText =
            "🔑 Ignition OFF";
          break;


        case "MOTION STARTED":
          eventText =
            "🟢 Vehicle Started";
          break;


        case "MOTION STOPPED":
          eventText =
            "🔴 Vehicle Stopped";
          break;


        case "TRIP COMPLETED":
          eventText =
            "✅ Trip Completed";
          break;

      }



      response +=
`
🚘 *${event.vehicle_registration}*

👤 Driver:
${event.driver_name ?? "No driver assigned"}

🕒 Time:
${eventTime}

📌 Event:
${eventText}

📍 Location:
${event.location_address ?? "N/A"}

🗺 https://maps.google.com/?q=${event.latitude},${event.longitude}

`;

    }

  }


  await sendTelegramMessage(
    chatId,
    response
  );

}

Deno.serve(async (req) => {
  try {

    console.log("===== TELEGRAM WEBHOOK START =====");

    const update = await req.json();

    // Log the entire update from Telegram
    console.log("Incoming Update:");
    console.log(JSON.stringify(update, null, 2));

    const message = update.message;


    if (!message) {
      console.log("No message found.");
      return new Response("OK");
    }

    // Ignore messages sent by the bot itself
    if (message.from?.is_bot) {
      console.log("Ignoring bot message.");
      return new Response("OK");
    }

    const chatId = message.chat.id;
// console.log("========== CHAT INFO ==========");
// console.log("Chat ID:", message.chat.id);
// console.log("Chat Type:", message.chat.type);
// console.log("Chat Title:", message.chat.title);
// console.log("Username:", message.from?.username);
// console.log("===============================");
const text = message.text?.trim();

console.log("RAW BUTTON TEXT:");
console.log(JSON.stringify(text));

if (!text) {
  console.log("Message has no text. Ignoring.");
  return new Response("OK");
}

let commandText = text;

// -------------------------
// BACK TO MAIN MENU
// -------------------------

if (text === "⬅️ Back to Main Menu") {

  await clearSelectedDriver(
    chatId,
  );

  await sendMenu(
    chatId,
  );

  return new Response(
    "OK",
  );

}

// -------------------------
// DRIVER ASSIGNMENT MENU
// -------------------------

if (text === "👤 Assign Driver") {

  await sendTelegramMessage(
    chatId,
    "👤 Select a driver:",
    {
      reply_markup:
        driverMenu(),
    },
  );

  return new Response("OK");

}

// -------------------------
// DRIVER SELECTED
// -------------------------

const drivers = [

  "Reynaldo Andalay",

  "Romie Pitos",

  "Juanito Rodrigo",

];


const driverSelection =
  text.replace(
    "👤 ",
    "",
  );


if (
  drivers.includes(
    driverSelection,
  )
) {

  // Save the selected driver in Supabase.
  // This survives between Edge Function executions.
  await saveSelectedDriver(
    chatId,
    driverSelection,
  );

  console.log(
    "Driver selection saved:",
    {
      chatId,
      driver: driverSelection,
    },
  );

  const vehicles =
    await getAllVehicleStatus();


  await sendTelegramMessage(
    chatId,

`👤 Driver selected:

*${driverSelection}*

🚘 Select a vehicle:`,

    {
      reply_markup:
        driverVehicleMenu(
          vehicles,
        ),
    },
  );


  return new Response("OK");

}

// -------------------------
// DRIVER VEHICLE SELECTED
// -------------------------

if (
  text.startsWith(
    "🚘 ",
  )
) {

const selectedDriver =
  await getSelectedDriver(
    chatId,
  );


  if (!selectedDriver) {

    await sendTelegramMessage(
      chatId,

`⚠️ Please select a driver first.`,

    );


    await sendMenu(
      chatId,
    );


    return new Response(
      "OK",
    );

  }


  const registration =
    text.replace(
      "🚘 ",
      "",
    )
    .trim();


  // Driver assignment will be saved here
await assignDriver(
  selectedDriver,
  registration,
);


console.log(
  "Driver assignment saved:",
  {
    driver:
      selectedDriver,

    vehicle:
      registration,
  },
);


  await sendTelegramMessage(
    chatId,

`✅ *Driver Assigned*

👤 Driver:
*${selectedDriver}*

🚘 Vehicle:
*${registration}*

The driver has been assigned successfully.`,

  );


await clearSelectedDriver(
  chatId,
);

console.log(
  "Driver selection cleared:",
  {
    chatId,
  },
);


  // RETURN TO MAIN MENU
  await sendMenu(
    chatId,
  );


  return new Response(
    "OK",
  );

}

  // -------------------------
// BUTTON HANDLERS
// -------------------------

if(text === "🚗 Status"){

  const vehicles =
    await getAllVehicleStatus();


  await sendTelegramMessage(
    chatId,
    "🚗 Select Vehicle Status",
    {
      reply_markup:
        vehicleMenu(
          "🚗 Status",
          vehicles
        )
    }
  );


  return new Response("OK");

}

// -------------------------
// VEHICLE BUTTON PARSER
// -------------------------

let selectedCommand = "";
let selectedVehicle = "";


if (text.startsWith("🚗 Status ")) {

  selectedCommand = "status";

  selectedVehicle =
    text.replace("🚗 Status ", "")
        .trim();

}



if (text.startsWith("📍 Location ")) {

  selectedCommand = "location";

  selectedVehicle =
    text.replace("📍 Location ", "")
        .trim();

}



if (text.startsWith("📋 Trips ")) {

  selectedCommand = "trips";

  selectedVehicle =
    text.replace("📋 Trips ", "")
        .trim();

}

if (text.startsWith("📌 Events ")) {

 selectedCommand = "events";

 selectedVehicle =
 text.replace("📌 Events ","").trim();

}


console.log("Selected Command:", selectedCommand);
console.log("Selected Vehicle:", selectedVehicle);

// -------------------------
// VEHICLE BUTTON STATUS
// -------------------------

if(selectedCommand === "status") {


  let vehicles =
    await getAllVehicleStatus();


  if(
    selectedVehicle &&
    selectedVehicle !== "ALL"
  ){

    vehicles =
      vehicles.filter(
        v =>
        v.registration.toUpperCase()
        === selectedVehicle.toUpperCase()
      );

  }


  let response =
`🚗 *Vehicle Status*

`;


  for(const vehicle of vehicles){


const moving =
  (vehicle.speed ?? 0) > 5;

const odoKm =
  vehicle.odometer != null
    ? (vehicle.odometer / 1000).toLocaleString("en-US", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      })
    : "N/A";

response +=
`
🚘 *${vehicle.registration}*

👤 Driver:
${vehicle.driver_name}

${moving ? "🟢 Moving" : "🔴 Stopped"}

🚀 Speed:
${vehicle.speed ?? 0} km/h

🔑 Ignition:
${vehicle.ignition ? "ON 🟢" : "OFF 🔴"}

🛣 Odometer:
${odoKm} km

⛽ Fuel:
${vehicle.fuel_percentage ?? "N/A"}% (${vehicle.fuel_level ?? "N/A"} L)

📍 ${vehicle.address}

🗺 https://maps.google.com/?q=${vehicle.latitude},${vehicle.longitude}

`;

  }


  await sendTelegramMessage(
    chatId,
    response
  );


  return new Response("OK");

}

if(text === "📍 Location"){

  const vehicles =
    await getAllVehicleStatus();


  await sendTelegramMessage(
    chatId,
    "📍 Select Vehicle Location",
    {
      reply_markup:
        vehicleMenu(
          "📍 Location",
          vehicles
        )
    }
  );


  return new Response("OK");

}



if(text === "📋 Trips"){

  const vehicles =
    await getAllVehicleStatus();


  await sendTelegramMessage(
    chatId,
    "📋 Select Vehicle Trips",
    {
      reply_markup:
        vehicleMenu(
          "📋 Trips",
          vehicles
        )
    }
  );


  return new Response("OK");

}

if(text === "📌 Events"){

  const vehicles =
    await getAllVehicleStatus();


  await sendTelegramMessage(
    chatId,
    "📌 Select Vehicle Events",
    {
      reply_markup:
        vehicleMenu(
          "📌 Events",
          vehicles
        )
    }
  );


  return new Response("OK");

}

// -------------------------
// VEHICLE BUTTON LOCATION
// -------------------------

if(selectedCommand === "location"){


let vehicles =
 await getAllVehicleStatus();


if(
 selectedVehicle &&
 selectedVehicle !== "ALL"
){

 vehicles =
 vehicles.filter(
 v =>
 v.registration.toUpperCase()
 === selectedVehicle.toUpperCase()
 );

}


for(const vehicle of vehicles){


 await sendLocation(
   vehicle.latitude,
   vehicle.longitude,
   chatId
 );


 await sendTelegramMessage(
 chatId,
`
📍 *${vehicle.registration}*

👤 Driver:
${vehicle.driver_name}

🚀 Speed:
${vehicle.speed} km/h

🔑 Ignition:
${vehicle.ignition ? "ON 🟢":"OFF 🔴"}

📍 ${vehicle.address}

🗺 https://maps.google.com/?q=${vehicle.latitude},${vehicle.longitude}
`
 );

}


return new Response("OK");

}

// -------------------------
// VEHICLE BUTTON TRIPS
// -------------------------

if(selectedCommand === "trips"){

  await sendTripReport(
    chatId,
    selectedVehicle,
  );

  return new Response("OK");

}


// -------------------------
// VEHICLE BUTTON EVENTS
// -------------------------

if(selectedCommand === "events"){

  await sendVehicleEventsReport(
    chatId,
    selectedVehicle,
  );

  return new Response("OK");

}


if(text === "⚙ Help"){

  commandText="/help";

}


const command =
  commandText
    .split(" ")[0]
    .split("@")[0];




    // -------------------------
// LOCATION MENU
// -------------------------
if (command === "/location_menu") {

  const vehicles =
    await getAllVehicleStatus();


  let response =
`📍 Select Vehicle Location:

`;


  for (const vehicle of vehicles) {

    response +=
`${vehicle.registration}

`;
  }


  await sendTelegramMessage(
    chatId,
    response
  );


  return new Response("OK");
}


console.log("Command:", command);


    if (command === "/start") {

  await sendMenu(chatId);

  return new Response("OK");

}

    console.log("Chat ID:", chatId);
    console.log("Text:", text);

    if (!text) {
      console.log("Message has no text.");
      return new Response("OK");
    }

    /*
      Supports:
      /help
      /help@MyBot
      /status NHJ6670
    */


    // -------------------------
    // HELP
    // -------------------------
    if (command === "/help") {

      console.log("Executing HELP");

      await sendTelegramMessage(
        chatId,
`Available Commands:
registration is the vehicle registration number (e.g., KAU5031)

/status - all vehicles

/status <registration>

📍 Location - select vehicle

/trips - today's trips

/help - show commands`
      );

      console.log("HELP sent.");

      return new Response("OK");
    }

// -------------------------
// LOCATION
// -------------------------
if (command === "/loc") {

  const args = text.split(" ");

  const plate = args[1]?.toUpperCase();


  if (!plate) {

    await sendTelegramMessage(
      chatId,
`Usage:

/loc <registration>

Example:
/loc KAU5031`
    );

    return new Response("OK");
  }


  const vehicles =
    await getAllVehicleStatus();


  const vehicle =
    vehicles.find(
      (v) =>
        v.registration.toUpperCase() === plate
    );


  if (!vehicle) {

    await sendTelegramMessage(
      chatId,
`❌ Vehicle not found

Registration:
${plate}`
    );

    return new Response("OK");
  }



  // Send Telegram map pin
await sendLocation(
 vehicle.latitude,
 vehicle.longitude,
 chatId
);


  const moving =
    (vehicle.speed ?? 0) > 5;


  const odoKm =
    vehicle.odometer != null
      ? (vehicle.odometer / 1000)
          .toLocaleString("en-US", {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
          })
      : "N/A";


  await sendTelegramMessage(
chatId,
`📍 *Vehicle Location*

🚘 *${vehicle.registration}*

👤 Driver:
${vehicle.driver_name}

${moving ? "🟢 Moving" : "🔴 Stopped"}

🚀 Speed:
${vehicle.speed ?? 0} km/h

🛣 Road Speed:
${vehicle.road_speed ?? "N/A"} km/h

🔑 Ignition:
${vehicle.ignition ? "ON 🟢" : "OFF 🔴"}

🛣 Odometer:
${odoKm} km

⛽ Fuel:
${vehicle.fuel_percentage ?? "N/A"}% (${vehicle.fuel_level ?? "N/A"} L)

🔋 Battery Voltage:
${vehicle.vext ?? "N/A"} V

📶 TCU Battery:
${vehicle.tcu_percentage ?? "N/A"}%

🛰 GPS Fix:
${vehicle.gps_fix_type ?? "N/A"}

🕒 Last Update:
${vehicle.last_event}

📍 ${vehicle.address}

🗺 https://maps.google.com/?q=${vehicle.latitude},${vehicle.longitude}`
  );


  return new Response("OK");
}

// -------------------------
// STATUS
// -------------------------
if (command === "/status") {

  console.log("Loading vehicle status...");

const args = commandText.split(" ");
const plate = args[1]?.toUpperCase();

let vehicles = await getAllVehicleStatus();

if (plate) {
  vehicles = vehicles.filter(
    (v) => v.registration.toUpperCase() === plate,
  );
}

  console.log(`Loaded ${vehicles.length} vehicles.`);

  let response = `🚗 *Vehicle Status*\n\n`;

  for (const vehicle of vehicles) {

    const moving = (vehicle.speed ?? 0) > 5;

const odoKm =
  vehicle.odometer != null
    ? (vehicle.odometer / 1000).toLocaleString("en-US", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      })
    : "N/A";

response +=
`
🚘 *${vehicle.registration}*

👤 Driver:
${vehicle.driver_name}

${moving ? "🟢 Moving" : "🔴 Stopped"}

🚀 Speed: ${vehicle.speed ?? 0} km/h

🛣 Road Speed: ${vehicle.road_speed ?? "N/A"} km/h

🔑 Ignition: ${vehicle.ignition ? "ON 🟢" : "OFF 🔴"}

🛣 Odometer: ${odoKm} km

⛽ Fuel: ${vehicle.fuel_percentage ?? "N/A"}% (${vehicle.fuel_level ?? "N/A"} L)

🔋 Battery Voltage: ${vehicle.battery_voltage ?? "N/A"} V

📶 TCU Battery: ${vehicle.tcu_percentage ?? "N/A"}%

🛰 GPS Fix: ${vehicle.gps_fix_type ?? "N/A"}

🕒 Last Update:
${vehicle.last_event}

📍 ${vehicle.address}

🗺 https://maps.google.com/?q=${vehicle.latitude},${vehicle.longitude}

`;
  }

  console.log("Sending STATUS response...");

  await sendTelegramMessage(
    chatId,
    response,
  );

  console.log("STATUS sent.");

  return new Response("OK");
}

    // -------------------------
    // TRIPS
    // -------------------------
if (command === "/trips") {

  await sendTripReport(chatId);

  return new Response("OK");

}

      

    console.log("Unknown command:", command);

    return new Response("OK");

  } catch (error) {

    console.error("===== WEBHOOK ERROR =====");
    console.error(error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error
          ? error.message
          : String(error),
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