const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const TELEGRAM_CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID")!;

const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

export async function sendTelegramMessage(message: string) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    throw new Error("Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID");
  }

  const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text: message,
      parse_mode: "Markdown",
      disable_web_page_preview: true,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Telegram Error: ${error}`);
  }

  return await response.json();
}

export async function sendLocation(
  latitude: number,
  longitude: number,
) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    throw new Error("Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID");
  }

  const response = await fetch(`${TELEGRAM_API}/sendLocation`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      latitude,
      longitude,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Telegram Location Error: ${error}`);
  }

  return await response.json();
}

export function createGoogleMapsLink(
  latitude: number,
  longitude: number,
) {
  return `https://maps.google.com/?q=${latitude},${longitude}`;
}

export async function notifyVehicleStarted(
  registration: string,
  speed: number,
  latitude: number,
  longitude: number,
  address: string,
) {
  // Send interactive Telegram map first
  await sendLocation(latitude, longitude);

  const map = createGoogleMapsLink(latitude, longitude);

  await sendTelegramMessage(
`🚗 *Vehicle Started*

*Vehicle:* ${registration}
*Speed:* ${speed} km/h

📍 ${address}

🗺️ ${map}`
  );
}

export async function notifyVehicleStopped(
  registration: string,
  latitude: number,
  longitude: number,
  address: string,
) {
  // Send interactive Telegram map first
  await sendLocation(latitude, longitude);

  const map = createGoogleMapsLink(latitude, longitude);

  await sendTelegramMessage(
`🛑 *Vehicle Stopped*

*Vehicle:* ${registration}

📍 ${address}

🗺️ ${map}`
  );
}
export async function notifyIgnitionOn(
  registration: string,
  latitude: number,
  longitude: number,
  address: string,
) {
  await sendLocation(latitude, longitude);

  const map = createGoogleMapsLink(latitude, longitude);

  await sendTelegramMessage(
`🟢 *Ignition ON*

*Vehicle:* ${registration}

📍 ${address}

🗺️ ${map}`
  );
}

export async function notifyIgnitionOff(
  registration: string,
  latitude: number,
  longitude: number,
  address: string,
) {
  await sendLocation(latitude, longitude);

  const map = createGoogleMapsLink(latitude, longitude);

  await sendTelegramMessage(
`🔴 *Ignition OFF*

*Vehicle:* ${registration}

📍 ${address}

🗺️ ${map}`
  );
}
export async function notifyLowFuel(
  registration: string,
  fuel: number,
  latitude: number,
  longitude: number,
  address: string,
) {
  await sendLocation(latitude, longitude);

  const map = createGoogleMapsLink(latitude, longitude);

  await sendTelegramMessage(
`⛽ *Low Fuel Warning*

*Vehicle:* ${registration}
*Fuel Remaining:* ${fuel}%

📍 ${address}

🗺️ ${map}`
  );
}
export async function notifyVehicleOffline(
  registration: string,
  latitude: number,
  longitude: number,
  address: string,
  lastUpdate: string,
) {
  await sendLocation(latitude, longitude);

  const map = createGoogleMapsLink(
    latitude,
    longitude,
  );

  await sendTelegramMessage(
`📴 *Vehicle Offline*

*Vehicle:* ${registration}

*Last Update:*
${lastUpdate}

📍 ${address}

🗺️ ${map}`
  );
}


export async function notifyVehicleOnline(
  registration: string,
) {
  await sendTelegramMessage(
`🟢 *Vehicle Online Again*

*Vehicle:* ${registration}`
  );
}
export async function notifyOverspeed(
  registration: string,
  speed: number,
  latitude: number,
  longitude: number,
  address: string,
) {

  await sendLocation(
    latitude,
    longitude,
  );

  const map = createGoogleMapsLink(
    latitude,
    longitude,
  );


  await sendTelegramMessage(
`🚨 *Overspeed Alert*

*Vehicle:* ${registration}

*Speed:* ${speed} km/h

📍 ${address}

🗺️ ${map}`
  );
}