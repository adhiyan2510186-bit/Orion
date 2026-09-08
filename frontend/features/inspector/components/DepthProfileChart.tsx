'use client';

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { colors } from '@/design/tokens';
import { sampleColormap } from '@/design/scales';
import type { DepthProfile } from '@/types/argo';

/**
 * Temperature and salinity against depth, with the derived thermocline marked.
 *
 * Depth runs DOWNWARD on the Y axis. This is not a stylistic choice - every
 * oceanographic profile is drawn this way, and inverting it would make the chart
 * unreadable to the people it is for.
 *
 * Series colours are sampled from the same scientific colormaps the map uses, so a
 * warm point on the map and a warm point on this chart are the same colour.
 */
export function DepthProfileChart({ profile }: { profile: DepthProfile }) {
  const data = profile.levels
    .filter((level) => level.temperature_c !== null || level.salinity_psu !== null)
    .map((level) => ({
      depth: Number(level.depth_m.toFixed(1)),
      temperature: level.temperature_c,
      salinity: level.salinity_psu,
    }));

  if (data.length < 2) {
    return (
      <p className="data text-[11px] text-[var(--color-secondary)] px-3 py-4">
        This cast has too few valid levels to plot.
      </p>
    );
  }

  const maxDepth = Math.max(...data.map((d) => d.depth));
  const tempColor = `rgb(${sampleColormap('thermal', 0.78).join(' ')})`;
  const salColor = `rgb(${sampleColormap('haline', 0.55).join(' ')})`;

  return (
    <div className="px-1 pb-2">
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 6, left: 0 }}>
            <CartesianGrid stroke={colors.border} strokeWidth={1} />
            <XAxis
              type="number"
              dataKey="temperature"
              domain={['dataMin - 0.5', 'dataMax + 0.5']}
              tick={{ fill: colors.secondary, fontSize: 10, fontFamily: 'var(--font-mono)' }}
              stroke={colors.border}
              tickLine={false}
              label={{
                value: 'Temp °C',
                position: 'insideBottomRight',
                offset: -2,
                fill: colors.secondary,
                fontSize: 10,
              }}
            />
            <YAxis
              type="number"
              dataKey="depth"
              // Depth increases downward. Reversed axis, always.
              reversed
              domain={[0, Math.ceil(maxDepth / 100) * 100]}
              tick={{ fill: colors.secondary, fontSize: 10, fontFamily: 'var(--font-mono)' }}
              stroke={colors.border}
              tickLine={false}
              width={44}
              label={{
                value: 'Depth m',
                angle: -90,
                position: 'insideLeft',
                fill: colors.secondary,
                fontSize: 10,
              }}
            />
            <Tooltip
              contentStyle={{
                background: colors.surfaceRaised,
                border: 'none',
                borderRadius: 2,
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
              }}
              labelStyle={{ color: colors.secondary }}
              itemStyle={{ color: colors.onSurface }}
              formatter={(value: number, name: string) => [
                value?.toFixed?.(3) ?? value,
                name === 'temperature' ? '°C' : 'PSU',
              ]}
              labelFormatter={(depth) => `${depth} m`}
            />
            {profile.derived.thermocline_depth_m !== null && (
              <ReferenceLine
                y={profile.derived.thermocline_depth_m}
                stroke={colors.tertiary}
                strokeDasharray="4 3"
                label={{
                  value: 'thermocline',
                  fill: colors.tertiary,
                  fontSize: 10,
                  position: 'right',
                }}
              />
            )}
            {profile.derived.mixed_layer_depth_m !== null && (
              <ReferenceLine
                y={profile.derived.mixed_layer_depth_m}
                stroke={colors.secondary}
                strokeDasharray="2 3"
                label={{ value: 'MLD', fill: colors.secondary, fontSize: 10, position: 'right' }}
              />
            )}
            <Line
              type="monotone"
              dataKey="temperature"
              stroke={tempColor}
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="salinity"
              stroke={salColor}
              strokeWidth={1}
              dot={false}
              isAnimationActive={false}
              connectNulls
              yAxisId={0}
              hide
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center gap-3 px-3 pt-1">
        <LegendKey color={tempColor} label="Temperature" />
        <span className="data text-[10px] text-[var(--color-secondary)]">
          {profile.derived.method}
        </span>
      </div>
    </div>
  );
}

function LegendKey({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="w-3 h-0.5" style={{ background: color }} />
      <span className="data text-[10px] text-[var(--color-secondary)]">{label}</span>
    </span>
  );
}
