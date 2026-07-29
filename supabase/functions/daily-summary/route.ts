export function buildRouteUrl(
  points: {
    latitude: number;
    longitude: number;
  }[],
): string | null {

  if (points.length < 2) {
    return null;
  }

  // Keep approximately 20 points maximum
  const step = Math.max(
    1,
    Math.floor(points.length / 20),
  );

  const sampled = points.filter(
    (_, index) => index % step === 0,
  );

  // Always include the final point
  const last = points[points.length - 1];

  if (
    sampled[sampled.length - 1] !== last
  ) {
    sampled.push(last);
  }

  const route = sampled
    .map(
      (p) => `${p.latitude},${p.longitude}`,
    )
    .join("/");

  return `https://www.google.com/maps/dir/${route}`;
}