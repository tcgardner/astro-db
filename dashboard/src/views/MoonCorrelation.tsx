import { useFetch } from '../hooks/useFetch.ts';
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface MoonPoint { moon_illumination_pct: number; hours: number; seeing_rating: number | null; session_date: string; }

export default function MoonCorrelation() {
  const { data, loading } = useFetch<MoonPoint[]>('/api/sessions/moon');

  if (loading) return <p className="text-gray-500">Loading…</p>;

  const points = (data ?? []).map(d => ({
    moon: d.moon_illumination_pct,
    hours: d.hours,
    seeing: d.seeing_rating,
    date: d.session_date,
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Moon Correlation</h1>
      <p className="text-sm text-gray-500">Do you actually avoid the full moon?</p>
      <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
        <h2 className="text-sm font-semibold text-gray-400 mb-4">Session Hours vs. Moon Illumination</h2>
        <ResponsiveContainer width="100%" height={320}>
          <ScatterChart>
            <CartesianGrid stroke="#1f2937" />
            <XAxis dataKey="moon" name="Moon %" unit="%" type="number" domain={[0, 100]} tick={{ fill: '#9ca3af', fontSize: 11 }} />
            <YAxis dataKey="hours" name="Hours" unit="h" tick={{ fill: '#9ca3af', fontSize: 11 }} />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              contentStyle={{ background: '#111827', border: '1px solid #374151' }}
              formatter={(v: number, name: string) => [name === 'Hours' ? `${v}h` : `${v}%`, name]}
            />
            <Scatter data={points} fill="#6366f1" opacity={0.75} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      {points.length === 0 && (
        <p className="text-gray-600 text-sm">No sessions with moon data yet. Moon illumination is populated by seestar-imaging-logger.</p>
      )}
    </div>
  );
}
