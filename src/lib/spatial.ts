export type BoundingBox = {
  south: number;
  west: number;
  north: number;
  east: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function normalizeLongitude(value: number) {
  let longitude = value;

  while (longitude < -180) {
    longitude += 360;
  }

  while (longitude > 180) {
    longitude -= 360;
  }

  return longitude;
}

export function normalizeCoordinates(latitude: number, longitude: number) {
  return {
    latitude: clamp(latitude, -90, 90),
    longitude: normalizeLongitude(longitude),
  };
}

export function cellKey(latitude: number, longitude: number, cellSize: number) {
  const { latitude: lat, longitude: lng } = normalizeCoordinates(latitude, longitude);
  const latBucket = Math.floor((lat + 90) / cellSize);
  const lngBucket = Math.floor((lng + 180) / cellSize);

  return `${cellSize}:${latBucket}:${lngBucket}`;
}

export function buildSpatialTokens(latitude: number, longitude: number) {
  const tokens = [
    cellKey(latitude, longitude, 1),
    cellKey(latitude, longitude, 0.25),
    cellKey(latitude, longitude, 0.05),
  ];

  return Array.from(new Set(tokens));
}

export function buildSpatialIndex(latitude: number, longitude: number) {
  const normalized = normalizeCoordinates(latitude, longitude);
  const tokens = buildSpatialTokens(normalized.latitude, normalized.longitude);

  return {
    ...normalized,
    tokens,
    cell1: tokens[0],
    cell025: tokens[1],
    cell005: tokens[2],
  };
}

export function isPointInBoundingBox(
  latitude: number,
  longitude: number,
  bbox: BoundingBox
) {
  const { latitude: lat, longitude: lng } = normalizeCoordinates(latitude, longitude);

  return (
    lat >= bbox.south &&
    lat <= bbox.north &&
    lng >= bbox.west &&
    lng <= bbox.east
  );
}

export function parseBoundingBox(raw: string | null): BoundingBox | null {
  if (!raw) {
    return null;
  }

  const [southRaw, westRaw, northRaw, eastRaw] = raw.split(",").map((part) => Number(part));

  if (
    [southRaw, westRaw, northRaw, eastRaw].some(
      (value) => Number.isNaN(value) || !Number.isFinite(value)
    )
  ) {
    return null;
  }

  const south = clamp(Math.min(southRaw, northRaw), -90, 90);
  const north = clamp(Math.max(southRaw, northRaw), -90, 90);
  const west = clamp(Math.min(westRaw, eastRaw), -180, 180);
  const east = clamp(Math.max(westRaw, eastRaw), -180, 180);

  return { south, west, north, east };
}

export function bboxToTokens(
  bbox: BoundingBox,
  cellSize: number,
  limit = 30
): string[] {
  const tokens: string[] = [];

  const southBucket = Math.floor((bbox.south + 90) / cellSize);
  const northBucket = Math.floor((bbox.north + 90) / cellSize);
  const westBucket = Math.floor((bbox.west + 180) / cellSize);
  const eastBucket = Math.floor((bbox.east + 180) / cellSize);

  for (let latBucket = southBucket; latBucket <= northBucket; latBucket += 1) {
    for (let lngBucket = westBucket; lngBucket <= eastBucket; lngBucket += 1) {
      tokens.push(`${cellSize}:${latBucket}:${lngBucket}`);

      if (tokens.length >= limit) {
        return tokens;
      }
    }
  }

  return tokens;
}
