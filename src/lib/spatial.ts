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

/**
 * Calculate bounding box area in square degrees
 * Useful for determining query granularity
 */
export function calculateBboxArea(bbox: BoundingBox): number {
  const latDiff = bbox.north - bbox.south;
  const lngDiff = bbox.east - bbox.west;
  return latDiff * lngDiff;
}

/**
 * Determine optimal cell size based on bounding box
 * Larger bboxes use coarser grids for efficiency
 */
export function getOptimalCellSize(bbox: BoundingBox): number {
  const area = calculateBboxArea(bbox);

  if (area > 100) {
    return 1; // Very large area - use 1 degree cells
  } else if (area > 10) {
    return 0.25; // Large area - use 0.25 degree cells
  } else if (area > 1) {
    return 0.05; // Medium area - use 0.05 degree cells
  } else {
    return 0.01; // Small area - use 0.01 degree cells
  }
}

/**
 * Generate spatial tokens for a bounding box at multiple resolutions
 * This enables efficient multi-scale spatial queries
 */
export function bboxToTokens(bbox: BoundingBox, minCellSize: number = 0.05, maxTokens: number = 30): string[] {
  const tokens: string[] = [];
  const cellSize = Math.max(minCellSize, getOptimalCellSize(bbox));

  // Generate cell2 tokens (0.25 degree)
  for (let lat = Math.floor(bbox.south / 0.25); lat <= Math.ceil(bbox.north / 0.25); lat++) {
    for (let lng = Math.floor(bbox.west / 0.25); lng <= Math.ceil(bbox.east / 0.25); lng++) {
      tokens.push(cellKey(lat * 0.25 + 0.125, lng * 0.25 + 0.125, 0.25));
    }
  }

  // For fine-grained queries on smaller areas, add higher resolution tokens
  if (calculateBboxArea(bbox) < 10 && tokens.length < maxTokens) {
    for (let lat = Math.floor(bbox.south / 0.05); lat <= Math.ceil(bbox.north / 0.05); lat++) {
      for (let lng = Math.floor(bbox.west / 0.05); lng <= Math.ceil(bbox.east / 0.05); lng++) {
        tokens.push(cellKey(lat * 0.05 + 0.025, lng * 0.05 + 0.025, 0.05));
      }
    }
  }

  // Deduplicate and limit
  return Array.from(new Set(tokens)).slice(0, maxTokens);
}

/**
 * Calculate great circle distance between two points
 * Returns distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Cluster points by proximity within a specified distance
 */
export function clusterProximityPoints(
  points: Array<{ id: string; latitude: number; longitude: number; data?: any }>,
  radiusKm: number = 1
): Array<{ id: string; points: typeof points; centroid: [number, number] }> {
  const clusters: Map<
    string,
    { id: string; points: typeof points; centroid: [number, number] }
  > = new Map();
  const visited = new Set<string>();

  for (const point of points) {
    if (visited.has(point.id)) continue;

    const cluster = { id: point.id, points: [point], centroid: [point.latitude, point.longitude] as [number, number] };
    visited.add(point.id);

    for (const other of points) {
      if (visited.has(other.id)) continue;

      const distance = calculateDistance(
        point.latitude,
        point.longitude,
        other.latitude,
        other.longitude
      );

      if (distance <= radiusKm) {
        cluster.points.push(other);
        visited.add(other.id);

        // Update centroid
        const avgLat = cluster.points.reduce((sum, p) => sum + p.latitude, 0) / cluster.points.length;
        const avgLon = cluster.points.reduce((sum, p) => sum + p.longitude, 0) / cluster.points.length;
        cluster.centroid = [avgLat, avgLon];
      }
    }

    clusters.set(cluster.id, cluster);
  }

  return Array.from(clusters.values());
}
