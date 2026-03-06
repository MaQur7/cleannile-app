/**
 * Environmental Intelligence Analytics
 * Provides comprehensive analytics for environmental monitoring,
 * pollution trends, cleanup impact, and volunteer activity.
 */

import {
  ReportCategory,
  ReportRecord,
  ReportSeverity,
  toDate,
  type EventRecord,
} from "./schemas";

/**
 * Geographic cluster aggregation for pollution hotspots
 */
export interface PollutionHotspot {
  id: string;
  latitude: number;
  longitude: number;
  reportCount: number;
  avgSeverity: number;
  district: string;
  categories: Record<ReportCategory, number>;
  latestReport: Date | null;
  riskLevel: "low" | "medium" | "high" | "critical";
}

/**
 * Cleanup campaign impact metrics
 */
export interface CleanupImpact {
  eventId: string;
  eventName: string;
  date: Date;
  volunteersCount: number;
  affectedArea: string;
  reportsBeforeDate: number;
  reportsAfterDate: number;
  improvementPercentage: number;
}

/**
 * Volunteer activity metrics
 */
export interface VolunteerMetrics {
  volunteerId: string;
  reportCount: number;
  eventParticipation: number;
  totalImpact: number;
  reportsApprovedRate: number;
  lastActivity: Date | null;
  mostActiveCategory: ReportCategory | null;
}

/**
 * Pollution trend insight
 */
export interface PollutionTrendInsight {
  category: ReportCategory;
  trend: "improving" | "stable" | "worsening";
  changePercentage: number;
  affectedDistricts: string[];
  criticalReportsLastMonth: number;
  hotspotCount: number;
}

/**
 * Environmental indicators snapshot
 */
export interface EnvironmentalIndicators {
  totalReportsMonthly: number;
  avgSeverityMonthly: number;
  criticalIncidentsMonthly: number;
  cleanupEventsMonthly: number;
  volunteerParticipationMonthly: number;
  mostAffectedDistrict: string;
  mostReportedCategory: ReportCategory;
  trendSummary: string;
}

/**
 * Generate pollution hotspots from report clusters
 */
export function generatePollutionHotspots(
  reports: ReportRecord[],
  gridSize: number = 0.05
): PollutionHotspot[] {
  const hotspotMap = new Map<string, PollutionHotspot>();

  for (const report of reports) {
    if (!report.location) continue;

    const gridKey = `${Math.floor(report.location.latitude / gridSize)}_${Math.floor(report.location.longitude / gridSize)}`;

    let hotspot = hotspotMap.get(gridKey);
    if (!hotspot) {
      hotspot = {
        id: gridKey,
        latitude: (Math.floor(report.location.latitude / gridSize) + 0.5) * gridSize,
        longitude: (Math.floor(report.location.longitude / gridSize) + 0.5) * gridSize,
        reportCount: 0,
        avgSeverity: 0,
        district: report.district,
        categories: { pollution: 0, waste: 0, water: 0 },
        latestReport: null,
        riskLevel: "low",
      };
      hotspotMap.set(gridKey, hotspot);
    }

    hotspot.reportCount += 1;
    hotspot.categories[report.category] += 1;

    const reportDate = toDate(report.createdAt);
    if (reportDate && (!hotspot.latestReport || reportDate > hotspot.latestReport)) {
      hotspot.latestReport = reportDate;
    }
  }

  // Calculate average severity and risk level
  const severityValues: Record<ReportSeverity, number> = {
    low: 1,
    medium: 2,
    high: 3,
    critical: 4,
  };

  for (const report of reports) {
    if (!report.location) continue;

    const gridKey = `${Math.floor(report.location.latitude / gridSize)}_${Math.floor(report.location.longitude / gridSize)}`;
    const hotspot = hotspotMap.get(gridKey);
    if (!hotspot) continue;

    const severityValue = severityValues[report.severity] || 0;
    hotspot.avgSeverity += severityValue;
  }

  // Finalize hotspots
  for (const hotspot of hotspotMap.values()) {
    hotspot.avgSeverity = hotspot.avgSeverity / hotspot.reportCount;

    if (hotspot.avgSeverity >= 3.5) {
      hotspot.riskLevel = "critical";
    } else if (hotspot.avgSeverity >= 2.5) {
      hotspot.riskLevel = "high";
    } else if (hotspot.avgSeverity >= 1.5) {
      hotspot.riskLevel = "medium";
    } else {
      hotspot.riskLevel = "low";
    }
  }

  return Array.from(hotspotMap.values()).sort((a, b) => b.reportCount - a.reportCount);
}

/**
 * Calculate cleanup impact by comparing reports before and after event
 */
export function calculateCleanupImpact(
  event: EventRecord,
  reports: ReportRecord[],
  windowDays: number = 30
): CleanupImpact {
  const eventDate = new Date(event.date);
  const beforeDate = new Date(eventDate.getTime() - windowDays * 24 * 60 * 60 * 1000);
  const afterDate = new Date(eventDate.getTime() + windowDays * 24 * 60 * 60 * 1000);

  const reportsBeforeDate = reports.filter((r) => {
    const date = toDate(r.createdAt);
    return date && date >= beforeDate && date < eventDate && r.district === event.district;
  }).length;

  const reportsAfterDate = reports.filter((r) => {
    const date = toDate(r.createdAt);
    return date && date >= eventDate && date <= afterDate && r.district === event.district;
  }).length;

  const improvementPercentage =
    reportsBeforeDate > 0 ? ((reportsBeforeDate - reportsAfterDate) / reportsBeforeDate) * 100 : 0;

  return {
    eventId: event.id,
    eventName: event.title,
    date: eventDate,
    volunteersCount: event.volunteers.length,
    affectedArea: event.district,
    reportsBeforeDate,
    reportsAfterDate,
    improvementPercentage: Math.max(0, improvementPercentage),
  };
}

/**
 * Calculate volunteer activity metrics
 */
export function calculateVolunteerMetrics(
  volunteerId: string,
  reports: ReportRecord[]
): VolunteerMetrics {
  const volunteerReports = reports.filter((r) => r.userId === volunteerId);
  const approvedReports = volunteerReports.filter((r) => r.status === "approved");

  const categories: Record<ReportCategory, number> = {
    pollution: 0,
    waste: 0,
    water: 0,
  };

  let mostActiveCategory: ReportCategory | null = null;
  let maxCount = 0;

  for (const report of volunteerReports) {
    categories[report.category] += 1;
    if (categories[report.category] > maxCount) {
      mostActiveCategory = report.category;
      maxCount = categories[report.category];
    }
  }

  const lastActivityDate = volunteerReports.reduce((latest, r) => {
    const reportDate = toDate(r.createdAt);
    if (!reportDate) return latest;
    return !latest || reportDate > latest ? reportDate : latest;
  }, null as Date | null);

  return {
    volunteerId,
    reportCount: volunteerReports.length,
    eventParticipation: 0, // Could be calculated from event data
    totalImpact: volunteerReports.length,
    reportsApprovedRate:
      volunteerReports.length > 0 ? (approvedReports.length / volunteerReports.length) * 100 : 0,
    lastActivity: lastActivityDate,
    mostActiveCategory,
  };
}

/**
 * Analyze pollution trends by category
 */
export function analyzePollutionTrends(
  reports: ReportRecord[],
  windowDays: number = 30
): PollutionTrendInsight[] {
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);

  const reportsInWindow = reports.filter((r) => {
    const date = toDate(r.createdAt);
    return date && date >= windowStart;
  });

  const categories: Record<ReportCategory, PollutionTrendInsight> = {
    pollution: {
      category: "pollution",
      trend: "stable",
      changePercentage: 0,
      affectedDistricts: [],
      criticalReportsLastMonth: 0,
      hotspotCount: 0,
    },
    waste: {
      category: "waste",
      trend: "stable",
      changePercentage: 0,
      affectedDistricts: [],
      criticalReportsLastMonth: 0,
      hotspotCount: 0,
    },
    water: {
      category: "water",
      trend: "stable",
      changePercentage: 0,
      affectedDistricts: [],
      criticalReportsLastMonth: 0,
      hotspotCount: 0,
    },
  };

  const districtsSet = new Map<ReportCategory, Set<string>>();

  for (const category of Object.keys(categories) as ReportCategory[]) {
    districtsSet.set(category, new Set());
  }

  for (const report of reportsInWindow) {
    const insight = categories[report.category];
    if (report.severity === "critical") {
      insight.criticalReportsLastMonth += 1;
    }
    const districts = districtsSet.get(report.category)!;
    districts.add(report.district);
  }

  for (const category of Object.keys(categories) as ReportCategory[]) {
    const insight = categories[category];
    insight.affectedDistricts = Array.from(districtsSet.get(category)!).slice(0, 3);

    const categoryReports = reportsInWindow.filter((r) => r.category === category);
    const hotspots = generatePollutionHotspots(categoryReports);
    insight.hotspotCount = hotspots.filter((h) => h.riskLevel === "high" || h.riskLevel === "critical").length;

    if (categoryReports.length > 0) {
      const avgSeverity = categoryReports.reduce((sum, r) => {
        const severityValues: Record<ReportSeverity, number> = {
          low: 1,
          medium: 2,
          high: 3,
          critical: 4,
        };
        return sum + (severityValues[r.severity] || 0);
      }, 0) / categoryReports.length;

      insight.trend = avgSeverity > 2.5 ? "worsening" : avgSeverity > 1.5 ? "stable" : "improving";
    }
  }

  return Object.values(categories);
}

/**
 * Generate environmental indicators snapshot
 */
export function generateEnvironmentalIndicators(
  reports: ReportRecord[],
  events: EventRecord[]
): EnvironmentalIndicators {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const monthlyReports = reports.filter((r) => {
    const date = toDate(r.createdAt);
    return date && date >= monthStart;
  });

  const approvedMonthly = monthlyReports.filter((r) => r.status === "approved");

  const severityValues: Record<ReportSeverity, number> = {
    low: 1,
    medium: 2,
    high: 3,
    critical: 4,
  };

  const avgSeverityMonthly =
    approvedMonthly.length > 0
      ? approvedMonthly.reduce((sum, r) => sum + (severityValues[r.severity] || 0), 0) /
        approvedMonthly.length
      : 0;

  const criticalIncidentsMonthly = approvedMonthly.filter((r) => r.severity === "critical").length;

  const cleanupEventsMonthly = events.filter((e) => {
    const eventDate = new Date(e.date);
    return eventDate >= monthStart;
  }).length;

  const volunteerParticipationMonthly = events
    .filter((e) => {
      const eventDate = new Date(e.date);
      return eventDate >= monthStart;
    })
    .reduce((sum, e) => sum + e.volunteers.length, 0);

  // Find most affected district
  const districtCounts = new Map<string, number>();
  for (const report of approvedMonthly) {
    districtCounts.set(report.district, (districtCounts.get(report.district) || 0) + 1);
  }
  let mostAffectedDistrict = "N/A";
  let maxCount = 0;
  for (const [district, count] of districtCounts) {
    if (count > maxCount) {
      mostAffectedDistrict = district;
      maxCount = count;
    }
  }

  // Find most reported category
  const categoryCounts: Record<ReportCategory, number> = {
    pollution: 0,
    waste: 0,
    water: 0,
  };
  for (const report of approvedMonthly) {
    categoryCounts[report.category] += 1;
  }
  let mostReportedCategory: ReportCategory = "pollution";
  let maxCategoryCount = 0;
  for (const category of Object.keys(categoryCounts) as ReportCategory[]) {
    if (categoryCounts[category] > maxCategoryCount) {
      mostReportedCategory = category;
      maxCategoryCount = categoryCounts[category];
    }
  }

  // Generate trend summary
  let trendSummary = "Environmental status is stable";
  if (avgSeverityMonthly > 2.5) {
    trendSummary = `Environmental concerns are ${avgSeverityMonthly > 3.5 ? "critical" : "elevated"} this month`;
  } else if (avgSeverityMonthly < 1.5) {
    trendSummary = "Environmental conditions are improving";
  }

  return {
    totalReportsMonthly: monthlyReports.length,
    avgSeverityMonthly: Math.round(avgSeverityMonthly * 100) / 100,
    criticalIncidentsMonthly,
    cleanupEventsMonthly,
    volunteerParticipationMonthly,
    mostAffectedDistrict,
    mostReportedCategory,
    trendSummary,
  };
}
