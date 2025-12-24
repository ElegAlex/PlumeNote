// ===========================================
// DistributionCharts - Graphiques de distribution (P3 Dashboard)
// ===========================================

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useAnalyticsStore } from '../../stores/analyticsStore';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';

const COLORS = [
  'hsl(221.2 83.2% 53.3%)', // Primary blue
  'hsl(142.1 76.2% 36.3%)', // Green
  'hsl(47.9 95.8% 53.1%)', // Yellow
  'hsl(24.6 95% 53.1%)', // Orange
  'hsl(262.1 83.3% 57.8%)', // Purple
  'hsl(215 20% 65%)', // Muted
];

interface DistributionChartsProps {
  field: 'status' | 'priority' | 'tags';
  title: string;
  chartType?: 'donut' | 'bar';
}

export function DistributionCharts({
  field,
  title,
  chartType = 'donut',
}: DistributionChartsProps) {
  const navigate = useNavigate();
  const {
    statusDistribution,
    priorityDistribution,
    tagsDistribution,
    isLoadingDistributions,
  } = useAnalyticsStore();

  const data = useMemo(() => {
    switch (field) {
      case 'status':
        return statusDistribution;
      case 'priority':
        return priorityDistribution;
      case 'tags':
        return tagsDistribution;
    }
  }, [field, statusDistribution, priorityDistribution, tagsDistribution]);

  const total = useMemo(() => {
    return data.reduce((sum, item) => sum + item.count, 0);
  }, [data]);

  const handleClick = (label: string) => {
    navigate(`/search?${field}=${encodeURIComponent(label)}`);
  };

  if (isLoadingDistributions) {
    return (
      <Card>
        <CardHeader className="py-3 px-6">
          <CardTitle className="text-base font-medium">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="py-3 px-6">
          <CardTitle className="text-base font-medium">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 flex items-center justify-center text-muted-foreground">
            Aucune donnée disponible
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="py-3 px-6">
        <CardTitle className="text-base font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {chartType === 'bar' ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data} layout="vertical">
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="label"
                tick={{ fontSize: 12 }}
                width={80}
              />
              <Tooltip
                formatter={(value) => [`${value ?? 0} notes`, 'Nombre']}
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Bar
                dataKey="count"
                fill="hsl(var(--primary))"
                radius={[0, 4, 4, 0]}
                cursor="pointer"
                onClick={(barData) => {
                  const item = barData as { label?: string };
                  if (item.label) handleClick(item.label);
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="60%" height={180}>
              <PieChart>
                <Pie
                  data={data as Array<{ label: string; count: number; [key: string]: unknown }>}
                  dataKey="count"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={2}
                  cursor="pointer"
                  onClick={(_, index) => data[index] && handleClick(data[index].label)}
                >
                  {data.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => {
                    const numValue = (value as number) ?? 0;
                    return [
                      `${numValue} (${Math.round((numValue / total) * 100)}%)`,
                      'Notes',
                    ];
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Légende */}
            <div className="flex-1 space-y-1">
              {data.slice(0, 5).map((item, index) => (
                <div
                  key={item.label}
                  className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 p-1 rounded"
                  onClick={() => handleClick(item.label)}
                >
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="truncate flex-1">{item.label}</span>
                  <span className="text-muted-foreground">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
