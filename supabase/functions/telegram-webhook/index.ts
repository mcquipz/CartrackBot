import {
  sendTelegramMessage,
  sendLocation,
  sendMenu,
  vehicleMenu,
} from "./telegram.ts";

import {
  getAllVehicleStatus,
  getTodayTrips,
} from "./database.ts";

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

  await sendMenu(chatId);

  return new Response("OK");

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


const trips =
 await getTodayTrips();


let filtered =
 trips;


if(
 selectedVehicle &&
 selectedVehicle !== "ALL"
){

 filtered =
 trips.filter(
 t =>
 t.registration.toUpperCase()
 === selectedVehicle.toUpperCase()
 );

}


let response =
`📋 *Daily Trip Report*

`;


if(filtered.length===0){

response += "No trips today.";

}
else {


for(const trip of filtered){

response +=
`
🚘 *${trip.registration}*

📍 From:
${trip.start_address}

➡️ To:
${trip.end_address}

📏 Distance:
${trip.distance_km} km

⏱ Duration:
${trip.duration_minutes} minutes

`;

}

}


await sendTelegramMessage(
chatId,
response
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

      console.log("Loading today's trips...");

      const trips = await getTodayTrips();

      console.log(`Loaded ${trips.length} trips.`);

      let response = `📋 *Today's Trips*\n\n`;

      if (trips.length === 0) {
        response += "No trips today.";
      } else {

        for (const trip of trips) {

          response +=
`🚗 *${trip.registration}*

📍 ${trip.start_address}

➡️ ${trip.end_address}

📏 ${trip.distance_km} km

⏱ ${trip.duration_minutes} minutes

`;
        }
      }

      console.log("Sending TRIPS response...");

      await sendTelegramMessage(
        chatId,
        response,
      );

      console.log("TRIPS sent.");

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