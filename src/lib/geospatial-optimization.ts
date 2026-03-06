/**
 * Geospatial Query Optimization Module
 * 
 * Provides advanced spatial query optimization techniques for efficient
 * retrieval of large environmental datasets:
 * - Hierarchical spatial indexing
 * - Adaptive query strategies based on viewport size
 * - Client-side filtering optimization
 * - Query result caching
 */

import { BoundingBox } from "./spatial";

/**
 * Query optimization strategy based on viewport characteristics
 */
export type QueryStrategy = "cell-index" | "direct-filter" | "hybrid";

export interface QueryOptimization {
  strategy: QueryStrategy;
  estimatedResults: number;
  recommendedLimit: number;
  useCache: boolean;
}

/**
 * Determine optimal query strategy based on bounding box
 */
export function determineQueryStrategy(bbox: BoundingBox, cacheSize: number = 1000): QueryOptimization {
  const latDiff = bbox.north - bbox.south;
  const lngDiff = bbox.east - bbox.west;
  const area = latDiff * lngDiff;

  // Very large viewport - use cell index for efficiency
  if (area > 50) {
    return {
      strategy: "cell-index",
      estimatedResults: 5000,
      recommendedLimit: 500,
      useCache: true,
    };
  }

  // Medium viewport - use hybrid approach
  if (area > 5) {
    return {
      strategy: "hybrid",
      estimatedResults: 2000,
      recommendedLimit: 250,
      useCache: true,
    };
  }

  // Small viewport - use direct filter
  return {
    strategy: "direct-filter",
    estimatedResults: 500,
    recommendedLimit: 100,
    useCache: false,
  };
}

/**
 * Cache key generator for spatial queries
 */
export function getCacheKey(
  bbox: BoundingBox,
  filters: Record<string, any>,
  version: string = "v1"
): string {
  const bbox_str = `${bbox.south.toFixed(4)}-${bbox.west.toFixed(4)}-${bbox.north.toFixed(4)}-${bbox.east.toFixed(4)}`;
  const filters_str = JSON.stringify(filters);
  return `${version}:${bbox_str}:${Buffer.from(filters_str).toString("base64").slice(0, 32)}`;
}

/**
 * Spatial query result with cache metadata
 */
export interface CachedQueryResult {
  key: string;
  data: any[];
  timestamp: number;
  ttl: number; // milliseconds
  strategy: QueryStrategy;
  scanned: number;
  returned: number;
}

/**
 * LRU Cache for spatial queries
 */
export class SpatialQueryCache {
  private cache = new Map<string, CachedQueryResult>();
  private accessOrder: string[] = [];
  private maxSize: number;
  private defaultTTL: number;

  constructor(maxSize: number = 50, defaultTTL: number = 5 * 60 * 1000) {
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
  }

  get(key: string): any[] | null {
    const result = this.cache.get(key);
    if (!result) return null;

    // Check if expired
    if (Date.now() - result.timestamp > result.ttl) {
      this.cache.delete(key);
      return null;
    }

    // Update access order (LRU)
    this.accessOrder = this.accessOrder.filter((k) => k !== key);
    this.accessOrder.push(key);

    return result.data;
  }

  set(key: string, data: any[], scanned: number, returned: number, strategy: QueryStrategy): void {
    // Evict oldest if cache is full
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const oldestKey = this.accessOrder.shift();
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      key,
      data,
      timestamp: Date.now(),
      ttl: this.defaultTTL,
      strategy,
      scanned,
      returned,
    });

    if (!this.accessOrder.includes(key)) {
      this.accessOrder.push(key);
    }
  }

  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
  }

  getStats(): { size: number; maxSize: number } {
    return { size: this.cache.size, maxSize: this.maxSize };
  }
}

/**
 * Adaptive query limiter that adjusts limits based on query characteristics
 */
export class AdaptiveQueryLimiter {
  private baseLimit: number;
  private maxLimit: number;
  private minLimit: number;

  constructor(baseLimit: number = 250, minLimit: number = 50, maxLimit: number = 1000) {
    this.baseLimit = baseLimit;
    this.minLimit = minLimit;
    this.maxLimit = maxLimit;
  }

  /**
   * Calculate recommended limit based on area and previous results
   */
  calculateLimit(
    area: number,
    previousScanned: number,
    previousReturned: number,
    filterRatio: number = 0.5
  ): number {
    // If we got many results relative to what we scanned, reduce the limit
    if (previousReturned > 0) {
      const density = previousReturned / previousScanned;
      const adjustedLimit = Math.ceil(this.baseLimit / Math.max(density, 0.1));
      return Math.min(this.maxLimit, Math.max(this.minLimit, adjustedLimit));
    }

    // Use area-based heuristic
    if (area > 50) return this.minLimit;
    if (area > 10) return Math.ceil(this.baseLimit * 0.7);
    if (area > 1) return this.baseLimit;
    return this.maxLimit;
  }
}

/**
 * Geospatial filter optimizer
 * Determines which filters can be applied server-side vs client-side
 */
export interface FilterOptimization {
  serverSide: string[];
  clientSide: string[];
  indexed: string[];
}

export function optimizeFilters(availableIndexes: string[]): FilterOptimization {
  const allFilters = ["status", "category", "severity", "district", "dateRange"];
  const indexed = allFilters.filter((f) => availableIndexes.includes(f));
  const serverSide = indexed;
  const clientSide = allFilters.filter((f) => !indexed.includes(f));

  return { serverSide, clientSide, indexed };
}

/**
 * Estimate query result count based on historical data
 */
export class QueryEstimator {
  private historyWindow = 100;
  private history: Array<{ area: number; scanned: number; returned: number }> = [];

  record(area: number, scanned: number, returned: number): void {
    this.history.push({ area, scanned, returned });
    if (this.history.length > this.historyWindow) {
      this.history.shift();
    }
  }

  estimate(area: number): number {
    if (this.history.length === 0) {
      // Default estimate: ~5 reports per square degree
      return Math.max(50, area * 5);
    }

    // Find similar areas in history
    const similarities = this.history.map((h) => ({
      ...h,
      similarity: 1 / (1 + Math.abs(Math.log(h.area / area))),
    }));

    // Weight by similarity and calculate average density
    const totalWeight = similarities.reduce((sum, s) => sum + s.similarity, 0);
    const avgDensity =
      similarities.reduce((sum, s) => sum + (s.returned / s.scanned) * s.similarity, 0) / totalWeight;

    return Math.max(50, Math.ceil(area * avgDensity * 100));
  }
}

/**
 * Proximity-aware result filtering
 * Groups nearby results to reduce redundancy
 */
export function deduplicateByProximity(
  results: Array<{ id: string; latitude: number; longitude: number; data: any }>,
  radiusKm: number = 0.5
): typeof results {
  const deduplicated: typeof results = [];
  const processed = new Set<string>();

  for (const result of results) {
    if (processed.has(result.id)) continue;

    deduplicated.push(result);
    processed.add(result.id);

    for (const other of results) {
      if (processed.has(other.id)) continue;

      const dist = calculateDistance(
        result.latitude,
        result.longitude,
        other.latitude,
        other.longitude
      );

      if (dist <= radiusKm) {
        processed.add(other.id);
      }
    }
  }

  return deduplicated;
}

/**
 * Calculate great circle distance in kilometers
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
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
