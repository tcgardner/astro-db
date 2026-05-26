import { useFetch } from '../hooks/useFetch.ts';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';

interface Session {
  session_date: string; seeing_rating: number | null; transparency_rating: number | null;
  sqm_reading: number | null;
}

export default function SeeingTrends() {
  const { data, loading } = useFetch<Session[]>('/api/sessions');

  if (loading) return <p className="text-gray-500">Loading…</p>;

  const points = (data ?? [])
    .filter(s => s.seeing_rating != null || s.transparency_rating != null)
    .map(s => ({
      date: s.session_date,
      seeing: s.seeing_rating,
      transparency: s.transparency_rating,
      sqm: s.sqm_reading,
    }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Seeing Trends</h1>
      <p className="text-sm text-gray-500">Seeing and transparency ratings over time (1–5 scale, set by seestar-imaging-logger).</p>
      {points.length === 0 ? (
        <p className="text-gray-600 text-sm">No seeing data recorded yet.</p>
      ) : (
        <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={points}>
              <CartesianGrid stroke="#1f2937" />
              <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 10 }} />
              <YAxis domain={[0, 5]} ticks={[1,2,3,4,5]} tick={{ fill: '#9ca3af', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151' }} />
              <Legend wrapperStyle={{ color: '#9ca3af', fontSize: 12 }} />
              <Line type="monotone" dataKey="seeing"       name="Seeing"       stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} connectNulls />
              <Line type="monotone" dataKey="transparency" name="Transparency"  stroke="#0891b2" strokeWidth={2} dot={{ r: 3 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
