import { useFetch } from '../hooks/useFetch.ts';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface Target {
  catalog_id: string; common_name: string | null;
  total_hours: number; session_count: number;
}

export default function Targets() {
  const { data, loading } = useFetch<Target[]>('/api/targets');

  if (loading) return <p className="text-gray-500">Loading…</p>;

  const imaged = (data ?? []).filter(t => t.total_hours > 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Targets</h1>
      <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
        <h2 className="text-sm font-semibold text-gray-400 mb-4">
          Integration Hours per Target ({imaged.length} imaged)
        </h2>
        <ResponsiveContainer width="100%" height={Math.max(300, imaged.length * 28)}>
          <BarChart data={imaged} layout="vertical" margin={{ left: 16 }}>
            <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 11 }} unit="h" />
            <YAxis type="category" dataKey="catalog_id" width={52} tick={{ fill: '#d1d5db', fontSize: 12 }} />
            <Tooltip
              contentStyle={{ background: '#111827', border: '1px solid #374151' }}
              formatter={(v: number) => [`${v}h`, 'Hours']}
            />
            <Bar dataKey="total_hours" radius={[0, 4, 4, 0]}>
              {imaged.map((_, i) => <Cell key={i} fill="#6366f1" />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
