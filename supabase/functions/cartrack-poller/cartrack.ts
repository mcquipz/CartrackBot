export interface VehicleStatus {
  vehicle_id: number;
  registration: string;
  event_ts: string;
  speed: number;
  ignition: boolean;
  bearing: number;
  odometer: number;

  location: {
    latitude: number;
    longitude: number;
    position_description: string;
    updated: string;
  };

  fuel?: {
    level?: number;
    precentage_left?: number;
  };
}

export interface CartrackResponse {
  data: VehicleStatus[];
}

const CARTRACK_USER = Deno.env.get("CARTRACK_USER")!;
const CARTRACK_PASS = Deno.env.get("CARTRACK_PASS")!;

const API_URL =
  "https://fleetapi-ph.cartrack.com/rest/vehicles/status";

export async function fetchVehicles(): Promise<VehicleStatus[]> {
  if (!CARTRACK_USER || !CARTRACK_PASS) {
    throw new Error("Missing CARTRACK_USER or CARTRACK_PASS secret.");
  }

  const auth = btoa(`${CARTRACK_USER}:${CARTRACK_PASS}`);

  const response = await fetch(API_URL, {
    method: "GET",
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const text = await response.text();

    throw new Error(
      `Cartrack API Error (${response.status}): ${text}`,
    );
  }

  const json = (await response.json()) as CartrackResponse;

  if (!json.data) {
    return [];
  }

  return json.data;
}