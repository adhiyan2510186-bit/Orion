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
import { sampleColormap } from '@/design/scales';
import { colors } from '@/design/tokens';
import type { DepthProfile } from '@/types/argo';

/**
 * Temperature and salinity against depth, with the derived thermocline marked.
 *
 * Depth runs DOWNWARD on the Y axis. This is not a stylistic choice - every
 * oceanographic profile is drawn this way, and inverting it would make the chart
 * unreadable to the people it is for.
 *
 * `layout="vertical"` is load-bearing. Recharts maps a Line's dataKey to the Y axis in
 * the default horizontal layout, so without this the temperature curve is plotted as a
 * Y value on a 0-2000 m axis and collapses into a flat line at the surface. Vertical
 * layout makes X the value axis and Y the depth axis, which is what a profile needs.
 *
 * Two value axes, because temperature (roughly 2-30 °C) and salinity (33-36 PSU) do not
 * share a scale. Series colours are sampled from the same scientific colormaps the map
 * uses, so a warm point on the map and a warm point here are the same colour.
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
      <p className="data px-3 py-4 text-[11px] text-[var(--color-secondary)]">
        This cast has too few valid levels to plot.
      </p>
    );
  }

  const maxDepth = Math.max(...data.map((d) => d.depth));
  const tempColor = `rgb(${sampleColormap('thermal', 0.78).join(' ')})`;
  const salColor = `rgb(${sampleColormap('haline', 0.5).join(' ')})`;
  const tick = { fill: colors.secondary, fontSize: 10, fontFamily: 'var(--font-mono)' };

  return (
    <div className="px-1 pb-2">
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart layout="vertical" data={data} margin={{ top: 10, right: 14, bottom: 4, left: 0 }}>
            <CartesianGrid stroke={colors.border} strokeWidth={1} />

            <XAxis
              xAxisId="temp"
              type="number"
              domain={['dataMin - 0.5', 'dataMax + 0.5']}
              tick={tick}
              stroke={colors.border}
              tickLine={false}
              height={22}
              tickFormatter={(value: number) => value.toFixed(1)}
            />
            <XAxis
              xAxisId="sal"
              type="number"
              orientation="top"
              domain={['dataMin - 0.05', 'dataMax + 0.05']}
              tick={{ ...tick, fill: salColor }}
              stroke={colors.border}
              tickLine={false}
              height={20}
              tickFormatter={(value: number) => value.toFixed(2)}
            />

            <YAxis
              type="number"
              dataKey="depth"
              // Depth increases downward - 0 at the top. In `layout="vertical"` Recharts
              // already orients Y that way, so `reversed` here would put 2000 m at the
              // surface and turn the profile upside down.
              domain={[0, Math.ceil(maxDepth / 100) * 100]}
              tick={tick}
              stroke={colors.border}
              tickLine={false}
              width={46}
              tickFormatter={(value: number) => String(Math.round(value))}
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
                typeof value === 'number' ? value.toFixed(3) : value,
                name === 'temperature' ? '°C' : 'PSU',
              ]}
              labelFormatter={(depth) => `${depth} m`}
            />

            {profile.derived.thermocline_depth_m !== null && (
              <ReferenceLine
                xAxisId="temp"
                y={profile.derived.thermocline_depth_m}
                stroke={colors.tertiary}
                strokeDasharray="4 3"
                label={{
                  value: `thermocline ${profile.derived.thermocline_depth_m.toFixed(0)} m`,
                  fill: colors.tertiary,
                  fontSize: 10,
                  position: 'right',
                }}
              />
            )}
            {profile.derived.mixed_layer_depth_m !== null && (
              <ReferenceLine
                xAxisId="temp"
                y={profile.derived.mixed_layer_depth_m}
                stroke={colors.secondary}
                strokeDasharray="2 3"
                label={{
                  value: `MLD ${profile.derived.mixed_layer_depth_m.toFixed(0)} m`,
                  fill: colors.secondary,
                  fontSize: 10,
                  position: 'left',
                }}
              />
            )}

            <Line
              xAxisId="temp"
              dataKey="temperature"
              stroke={tempColor}
              strokeWidth={1.6}
              dot={false}
              isAnimationActive={false}
              connectNulls
            />
            <Line
              xAxisId="sal"
              dataKey="salinity"
              stroke={salColor}
              strokeWidth={1.1}
              strokeDasharray="3 2"
              dot={false}
              isAnimationActive={false}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center gap-3 px-3 pt-1">
        <LegendKey color={tempColor} label="Temp °C" />
        <LegendKey color={salColor} label="Salinity PSU" dashed />
        <span className="data ml-auto text-[10px] text-[var(--color-secondary)]">
          {profile.derived.method}
        </span>
      </div>
    </div>
  );
}

function LegendKey({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="h-0.5 w-3.5"
        style={
          dashed
            ? { backgroundImage: `repeating-linear-gradient(90deg, ${color} 0 3px, transparent 3px 5px)` }
            : { background: color }
        }
      />
      <span className="data text-[10px] text-[var(--color-secondary)]">{label}</span>
    </span>
  );
}
