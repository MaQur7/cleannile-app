/**
 * Temporal Analysis Module
 * Provides time-based filtering, aggregation, and visualization
 * capabilities for environmental data trends.
 */

import { ReportRecord, toDate, type ReportStatus } from "./schemas";

export type TemporalGranularity = "hour" | "day" | "week" | "month" | "quarter" | "year";

/**
 * Aggregated temporal data point
 */
export interface TemporalDataPoint {
  date: Date;
  timestamp: number;
  count: number;
  avgSeverity: number;
  reportsBySeverity: Record<string, number>;
  reportsByCategory: Record<string, number>;
  locations: Array<{ latitude: number; longitude: number }>;
}

/**
 * Temporal trend analysis result
 */
export interface TemporalTrendAnalysis {
  startDate: Date;
  endDate: Date;
  granularity: TemporalGranularity;
  dataPoints: TemporalDataPoint[];
  totalReports: number;
  avgReportsPerPeriod: number;
  peakPeriod: TemporalDataPoint | null;
  trend: "increasing" | "decreasing" | "stable";
  trendStrength: number; // 0-1
}

/**
 * Parse a date to the start of a period based on granularity
 */
export function getStartOfPeriod(date: Date, granularity: TemporalGranularity): Date {
  const d = new Date(date);

  switch (granularity) {
    case "hour":
      d.setMinutes(0, 0, 0);
      return d;
    case "day":
      d.setHours(0, 0, 0, 0);
      return d;
    case "week": {
      const dayOfWeek = d.getDay();
      const diff = d.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      d.setDate(diff);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    case "month":
      d.setDate(1);
      d.setHours(0, 0, 0, 0);
      return d;
    case "quarter": {
      const quarterMonth = Math.floor(d.getMonth() / 3) * 3;
      d.setMonth(quarterMonth);
      d.setDate(1);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    case "year":
      d.setMonth(0);
      d.setDate(1);
      d.setHours(0, 0, 0, 0);
      return d;
  }
}

/**
 * Add a period to a date based on granularity
 */
export function addPeriod(date: Date, granularity: TemporalGranularity, count: number = 1): Date {
  const d = new Date(date);

  switch (granularity) {
    case "hour":
      d.setHours(d.getHours() + count);
      break;
    case "day":
      d.setDate(d.getDate() + count);
      break;
    case "week":
      d.setDate(d.getDate() + count * 7);
      break;
    case "month":
      d.setMonth(d.getMonth() + count);
      break;
    case "quarter":
      d.setMonth(d.getMonth() + count * 3);
      break;
    case "year":
      d.setFullYear(d.getFullYear() + count);
      break;
  }

  return d;
}

/**
 * Generate time periods between start and end dates
 */
export function generateTimePeriods(
  startDate: Date,
  endDate: Date,
  granularity: TemporalGranularity
): Date[] {
  const periods: Date[] = [];
  let current = getStartOfPeriod(startDate, granularity);
  const end = getStartOfPeriod(endDate, granularity);

  while (current <= end) {
    periods.push(new Date(current));
    current = addPeriod(current, granularity);
  }

  return periods;
}

/**
 * Aggregate reports by temporal period
 */
export function aggregateByPeriod(
  reports: ReportRecord[],
  startDate: Date,
  endDate: Date,
  granularity: TemporalGranularity
): TemporalDataPoint[] {
  const periods = generateTimePeriods(startDate, endDate, granularity);
  const periodsMap = new Map<number, TemporalDataPoint>();

  // Initialize all periods
  for (const period of periods) {
    periodsMap.set(period.getTime(), {
      date: period,
      timestamp: period.getTime(),
      count: 0,
      avgSeverity: 0,
      reportsBySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
      reportsByCategory: { pollution: 0, waste: 0, water: 0 },
      locations: [],
    });
  }

  // Aggregate reports into periods
  for (const report of reports) {
    const reportDate = toDate(report.createdAt);
    if (!reportDate) continue;

    const period = getStartOfPeriod(reportDate, granularity);
    const timestamp = period.getTime();

    const dataPoint = periodsMap.get(timestamp);
    if (!dataPoint) continue;

    dataPoint.count += 1;
    dataPoint.reportsBySeverity[report.severity] += 1;
    dataPoint.reportsByCategory[report.category] += 1;

    if (report.location) {
      dataPoint.locations.push({
        latitude: report.location.latitude,
        longitude: report.location.longitude,
      });
    }
  }

  // Calculate averages and sort
  const dataPoints = Array.from(periodsMap.values());
  for (const dataPoint of dataPoints) {
    if (dataPoint.count > 0) {
      const severityEntries = Object.entries(dataPoint.reportsBySeverity);
      const severityValues = { low: 1, medium: 2, high: 3, critical: 4 };
      dataPoint.avgSeverity =
        severityEntries.reduce((sum, [key, count]) => {
          return sum + (severityValues[key as keyof typeof severityValues] || 0) * count;
        }, 0) / dataPoint.count;
    }
  }

  return dataPoints.sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Analyze trends in temporal data
 */
export function analyzeTrends(dataPoints: TemporalDataPoint[]): TemporalTrendAnalysis {
  if (dataPoints.length === 0) {
    return {
      startDate: new Date(),
      endDate: new Date(),
      granularity: "day",
      dataPoints: [],
      totalReports: 0,
      avgReportsPerPeriod: 0,
      peakPeriod: null,
      trend: "stable",
      trendStrength: 0,
    };
  }

  const totalReports = dataPoints.reduce((sum, dp) => sum + dp.count, 0);
  const avgReportsPerPeriod = totalReports / dataPoints.length;

  // Find peak period
  const peakPeriod = dataPoints.reduce((max, dp) => (dp.count > max.count ? dp : max));

  // Calculate trend using linear regression
  const n = dataPoints.length;
  let sumX = 0,
    sumY = 0,
    sumXY = 0,
    sumX2 = 0;

  for (let i = 0; i < n; i++) {
    const x = i;
    const y = dataPoints[i].count;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const correlation = Math.abs(slope) / (avgReportsPerPeriod || 1);
  const trend = slope > 5 ? "increasing" : slope < -5 ? "decreasing" : "stable";
  const trendStrength = Math.min(1, Math.abs(correlation));

  return {
    startDate: dataPoints[0].date,
    endDate: dataPoints[n - 1].date,
    granularity: "day",
    dataPoints,
    totalReports,
    avgReportsPerPeriod,
    peakPeriod,
    trend,
    trendStrength,
  };
}

/**
 * Calculate period-over-period change
 */
export function calculatePeriodChange(
  current: TemporalDataPoint,
  previous: TemporalDataPoint | null
): number {
  if (!previous || previous.count === 0) {
    return 0;
  }
  return ((current.count - previous.count) / previous.count) * 100;
}

/**
 * Format date for temporal display
 */
export function formatTemporalDate(date: Date, granularity: TemporalGranularity): string {
  const options: Intl.DateTimeFormatOptions = {};

  switch (granularity) {
    case "hour":
      options.month = "short";
      options.day = "numeric";
      options.hour = "2-digit";
      options.minute = "2-digit";
      break;
    case "day":
      options.month = "short";
      options.day = "numeric";
      break;
    case "week":
      options.month = "short";
      options.day = "numeric";
      break;
    case "month":
      options.month = "long";
      options.year = "numeric";
      break;
    case "quarter":
      options.month = "short";
      options.year = "numeric";
      break;
    case "year":
      options.year = "numeric";
      break;
  }

  return date.toLocaleDateString("en-US", options);
}
