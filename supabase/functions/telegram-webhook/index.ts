import {
  sendTelegramMessage,
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
    const command =
      text
        .split(" ")[0]
        .split("@")[0];

    console.log("Command:", command);

    // -------------------------
    // HELP
    // -------------------------
    if (command === "/help") {

      console.log("Executing HELP");

      await sendTelegramMessage(
        chatId,
`Available Commands:

/status - vehicle status
/trips - today's trips
/help - show commands`
      );

      console.log("HELP sent.");

      return new Response("OK");
    }

// -------------------------
// STATUS
// -------------------------
if (command === "/status") {

  console.log("Loading vehicle status...");

  const vehicles = await getAllVehicleStatus();

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