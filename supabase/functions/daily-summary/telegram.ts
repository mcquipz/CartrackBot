const BOT_TOKEN =
  Deno.env.get("TELEGRAM_BOT_TOKEN")!;

const CHAT_ID =
  Deno.env.get("TELEGRAM_CHAT_ID")!;

export async function sendDailySummary(
  vehicle: {
    registration: string;
  },
  trips: any[],
  routeUrl: string | null,
) {
  const totalDistance = trips.reduce(
    (sum, trip) =>
      sum + (trip.distance_km ?? 0),
    0,
  );

  const totalDuration = trips.reduce(
    (sum, trip) =>
      sum + (trip.duration_minutes ?? 0),
    0,
  );

  const hours = Math.floor(
    totalDuration / 60,
  );

  const minutes =
    totalDuration % 60;

  let message =
`📊 Daily Trip Summary

🚗 ${vehicle.registration}

Trips: ${trips.length}
Distance: ${totalDistance.toFixed(2)} km
Driving Time: ${hours}h ${minutes}m

`;

  if (trips.length === 0) {

    message +=
`No trips recorded today.
`;

  } else {

    for (const trip of trips) {

      const start =
        new Date(
          trip.start_time,
        ).toLocaleTimeString(
          "en-PH",
          {
            hour: "2-digit",
            minute: "2-digit",
          },
        );

      const end =
        new Date(
          trip.end_time,
        ).toLocaleTimeString(
          "en-PH",
          {
            hour: "2-digit",
            minute: "2-digit",
          },
        );

      message +=
`${start} → ${end}
${trip.start_address}
↓
${trip.end_address}

`;

    }

  }

  if (routeUrl) {

    message +=
`🗺️ Today's Route

${routeUrl}
`;

  }

  await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: message,
      }),
    },
  );
}