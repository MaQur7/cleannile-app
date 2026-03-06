# Professional GIS System - Quick Reference

## Core Modules

| Module | Purpose | Key Exports |
|--------|---------|-------------|
| `gis-layers.ts` | Layer configuration system | `DEFAULT_GIS_LAYER_CONFIGS`, `calculateIntensity` |
| `temporal-analysis.ts` | Time-based analysis | `aggregateByPeriod`, `analyzeTrends` |
| `environmental-analytics.ts` | Environmental metrics | `generatePollutionHotspots`, `generateEnvironmentalIndicators` |
| `geospatial-optimization.ts` | Query optimization | `determineQueryStrategy`, `SpatialQueryCache` |
| `gis-export.ts` | Export utilities | `reportsToGeoJSON`, `reportsToCSV`, `reportsToKML` |
| `spatial.ts` | Spatial calculations (extended) | `bboxToTokens`, `calculateDistance`, `clusterProximityPoints` |

## Usage Examples

### 1. Create Temporal Analysis

```typescript
import { aggregateByPeriod, analyzeTrends } from '@/lib/temporal-analysis';
import { toDate } from '@/lib/schemas';

// Aggregate reports by day for the last 30 days
const startDate = new Date();
startDate.setDate(startDate.getDate() - 30);
const endDate = new Date();

const dataPoints = aggregateByPeriod(
  reports,
  startDate,
  endDate,
  'day'
);

// Analyze trends
const analysis = analyzeTrends(dataPoints);
console.log(`Trend: ${analysis.trend} (${analysis.trendStrength * 100}%)`);
```

### 2. Generate Pollution Hotspots

```typescript
import { generatePollutionHotspots } from '@/lib/environmental-analytics';

const hotspots = generatePollutionHotspots(reports, 0.1); // 0.1° grid = ~11km

// Filter by risk level
const criticalHotspots = hotspots.filter(h => h.riskLevel === 'critical');
```

### 3. Export Data

```typescript
import { reportsToGeoJSON, downloadFile } from '@/lib/gis-export';

// Export as GeoJSON
const geojson = reportsToGeoJSON(reports);
const json = JSON.stringify(geojson, null, 2);
downloadFile(json, 'reports.geojson', 'application/geo+json');

// Export as CSV
const csv = reportsToCSV(reports);
downloadFile(csv, 'reports.csv', 'text/csv');
```

### 4. Optimize Query

```typescript
import { determineQueryStrategy } from '@/lib/geospatial-optimization';

const bbox = { south: 4.8, west: 31.5, north: 5.0, east: 31.7 };
const optimization = determineQueryStrategy(bbox);

if (optimization.strategy === 'cell-index') {
  // Use spatial tokens for query
  const tokens = bboxToTokens(bbox);
  query = query.where('spatial.tokens', 'array-contains-any', tokens);
}
```

### 5. Calculate Cleanup Impact

```typescript
import { calculateCleanupImpact } from '@/lib/environmental-analytics';

const impact = calculateCleanupImpact(event, reports, 30); // 30-day window
console.log(`Improvement: ${impact.improvementPercentage.toFixed(1)}%`);
```

## Component Usage

### Enhanced Map View

```tsx
import EnhancedMapView from '@/components/EnhancedMapView';

export default function MapPage() {
  return (
    <div style={{ height: '100vh' }}>
      <EnhancedMapView />
    </div>
  );
}
```

### Environmental Dashboard

```tsx
import EnvironmentalIntelligenceDashboard from '@/components/EnvironmentalIntelligenceDashboard';

export default function AnalyticsPage() {
  return <EnvironmentalIntelligenceDashboard />;
}
```

### GIS Configuration

```tsx
import GISConfigurationPanel from '@/components/gis/GISConfigurationPanel';

export default function ConfigPage() {
  const [showConfig, setShowConfig] = useState(false);

  return (
    <>
      <button onClick={() => setShowConfig(true)}>
        ⚙️ Configure GIS
      </button>
      {showConfig && (
        <GISConfigurationPanel onClose={() => setShowConfig(false)} />
      )}
    </>
  );
}
```

## API Query Parameters

### `/api/reports/search`

```
GET /api/reports/search?
  status=approved           # pending|approved|rejected
  &bbox=4.7,31.4,5.0,31.7 # south,west,north,east
  &categories=pollution    # pollution,waste,water (comma-separated)
  &severity=high          # low,medium,high,critical (comma-separated)
  &district=Addis         # District name
  &from=2024-03-01        # ISO date
  &to=2024-03-31          # ISO date
  &limit=250              # Max 500
  &cursor=2024-03-06      # For pagination
```

## Database Schema Extensions

The system expects these fields in the `reports` collection:

```typescript
{
  // Existing fields
  category: 'pollution' | 'waste' | 'water';
  severity: 'low' | 'medium' | 'high' | 'critical';
  district: string;
  location: { latitude: number; longitude: number };
  
  // NEW: Spatial indexing (auto-generated)
  spatial: {
    tokens: string[];           // Multi-resolution tokens
    cell1: string;             // 1° resolution
    cell025: string;           // 0.25° resolution
    cell005: string;           // 0.05° resolution
  };
}
```

## Performance Tuning

### Adjust Cluster Settings
```typescript
const clusterConfig = {
  maxZoom: 12,        // Stop clustering above zoom 12
  radius: 40,         // Cluster radius in pixels
  enabled: true,
};
```

### Limit Rendered Features
```typescript
const performanceConfig = {
  maxRenderedFeatures: 1500,      // Reduce if slow
  lazyLoadThreshold: 200,         // Fetch more when < 200 left
  serverSideFiltering: true,      // Always true for large datasets
};
```

### Cache Optimization
```typescript
const cache = new SpatialQueryCache(
  100,              // Max 100 cached queries
  10 * 60 * 1000    // 10 minute TTL
);
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Heatmap not rendering | Verify leaflet.heat import successful, check console |
| Slow performance | Reduce `maxRenderedFeatures`, enable `serverSideFiltering` |
| Clustering disabled | Check `clusterConfig.enabled` and zoom level |
| Empty results | Verify spatial tokens generated correctly, check bbox format |
| High memory usage | Reduce cache size, lower `maxRenderedFeatures` |

## Mobile Responsiveness

All components are mobile-responsive. Key considerations:

- Map: 100vh height, accounts for mobile address bar
- Capture: Single-column on mobile, grid on desktop
- Dashboard: Responsive grid, stacks on mobile
- Configuration: Modal overlay, scrollable on small screens

## Integration Checklist

- [ ] Add modules to `lib/` directory
- [ ] Add components to `components/gis/` directory
- [ ] Create '/map' route with EnhancedMapView
- [ ] Create '/rapid-capture' route for field reporting
- [ ] Create '/admin/analytics' route for dashboard
- [ ] Update navigation with new routes
- [ ] Test offline queue functionality
- [ ] Configure performance settings for your data volume
- [ ] Set up cluster radius and zoom constraints
- [ ] Customize hotspot grid size for your region

## Files Summary

```
src/lib/
  ├── gis-layers.ts                    (Layer system)
  ├── temporal-analysis.ts             (Time-based analysis)
  ├── environmental-analytics.ts       (Analytics engine)
  ├── geospatial-optimization.ts       (Query optimization)
  ├── gis-export.ts                    (Export formats)
  └── spatial.ts                       (Extended with new functions)

src/components/
  ├── EnhancedMapView.tsx              (Main map component)
  ├── EnvironmentalIntelligenceDashboard.tsx
  └── gis/
      ├── LayerControlPanel.tsx        (Layer toggles)
      ├── TemporalSlider.tsx           (Time navigation)
      ├── HeatmapLegend.tsx            (Legend)
      └── GISConfigurationPanel.tsx    (Admin config)

src/app/
  ├── rapid-capture/page.tsx           (Field reporting)
  └── [other routes]
```

## Support & Enhancement

The system is designed to be extensible. Future enhancements:
- Real-time WebSocket updates
- Vector tile support for 10,000+ features
- Advanced prediction models
- Mobile native apps
- 3D visualization
- Custom layer types
