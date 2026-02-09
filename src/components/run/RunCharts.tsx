import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, Area, AreaChart } from 'recharts';
import { GpsPoint, haversineDistance } from '@/types/run';

interface Props {
  points: GpsPoint[];
}

export function RunCharts({ points }: Props) {
  const chartData = useMemo(() => {
    if (points.length < 3) return [];

    const data: { distKm: number; paceSecPerKm: number | null; altitude: number | null; timeMin: number }[] = [];
    let cumDist = 0;
    const startTime = points[0].timestamp;
    const windowSize = 5; // rolling average window

    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const cur = points[i];
      const d = haversineDistance(prev.lat, prev.lng, cur.lat, cur.lng);
      cumDist += d;

      // Rolling pace
      let pace: number | null = null;
      if (i >= windowSize) {
        const windowStart = points[i - windowSize];
        let windowDist = 0;
        for (let j = i - windowSize + 1; j <= i; j++) {
          windowDist += haversineDistance(points[j - 1].lat, points[j - 1].lng, points[j].lat, points[j].lng);
        }
        const windowTime = (cur.timestamp - windowStart.timestamp) / 1000;
        if (windowDist > 5) {
          pace = (windowTime / windowDist) * 1000;
          // Cap pace at 15 min/km for readability
          if (pace > 900) pace = null;
        }
      }

      data.push({
        distKm: Math.round(cumDist / 10) / 100, // 2 decimal
        paceSecPerKm: pace ? Math.round(pace) : null,
        altitude: cur.altitude != null ? Math.round(cur.altitude) : null,
        timeMin: Math.round((cur.timestamp - startTime) / 60000 * 10) / 10,
      });
    }

    // Downsample for performance (max ~200 points)
    if (data.length > 200) {
      const step = Math.ceil(data.length / 200);
      return data.filter((_, i) => i % step === 0);
    }
    return data;
  }, [points]);

  if (chartData.length < 3) {
    return (
      <div className="card-glass p-8 text-center text-muted-foreground text-sm">
        Not enough data for charts
      </div>
    );
  }

  const formatPaceLabel = (val: number) => {
    const m = Math.floor(val / 60);
    const s = Math.round(val % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const hasAltitude = chartData.some(d => d.altitude != null);

  return (
    <div className="space-y-5">
      {/* Pace Chart */}
      <div className="card-glass p-4 rounded-xl">
        <p className="section-label mb-3">Pace over Distance</p>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={chartData}>
            <XAxis
              dataKey="distKm"
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={v => `${v}km`}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={formatPaceLabel}
              reversed
              domain={['auto', 'auto']}
              axisLine={false}
              tickLine={false}
              width={40}
            />
            <Tooltip
              formatter={(val: number) => [formatPaceLabel(val), 'Pace']}
              labelFormatter={(v) => `${v} km`}
              contentStyle={{
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Line
              dataKey="paceSecPerKm"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={false}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Elevation Chart */}
      {hasAltitude && (
        <div className="card-glass p-4 rounded-xl">
          <p className="section-label mb-3">Elevation Profile</p>
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart data={chartData}>
              <XAxis
                dataKey="distKm"
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={v => `${v}km`}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={v => `${v}m`}
                domain={['auto', 'auto']}
                axisLine={false}
                tickLine={false}
                width={40}
              />
              <Tooltip
                formatter={(val: number) => [`${val}m`, 'Altitude']}
                labelFormatter={(v) => `${v} km`}
                contentStyle={{
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <defs>
                <linearGradient id="elevGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                dataKey="altitude"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#elevGradient)"
                connectNulls
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
