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

    console.log(
      "Incoming Update:",
      JSON.stringify(update, null, 2),
    );

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

    const text = message.text?.trim();

    console.log("Chat ID:", chatId);
    console.log("Text:", text);

    if (!text) {
      console.log("Message has no text.");
      return new Response("OK");
    }

    // Supports:
/*
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

      const vehicles =
        await getAllVehicleStatus();

      console.log(
        `Loaded ${vehicles.length} vehicles.`,
      );

      let response =
`🚗 *Vehicle Status*

`;

      for (const vehicle of vehicles) {

        const moving =
          vehicle.speed > 5;

        response +=
`
🚘 *${vehicle.registration}*

${moving ? "🟢 Moving" : "🔴 Stopped"}

Speed: ${vehicle.speed ?? 0} km/h

Ignition: ${vehicle.ignition ? "ON 🟢" : "OFF 🔴"}

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

      const trips =
        await getTodayTrips();

      console.log(
        `Loaded ${trips.length} trips.`,
      );

      let response =
`📋 *Today's Trips*

`;

      if (trips.length === 0) {

        response +=
          "No trips today.";

      } else {

        for (const trip of trips) {

          response +=
`
🚗 *${trip.registration}*

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

    console.log("Unknown command.");

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