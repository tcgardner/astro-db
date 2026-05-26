import { useFetch } from '../hooks/useFetch.ts';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface FunnelRow { processing_status: string; count: number; }

const ORDER = ['captured', 'stacked', 'processed', 'published'];
const COLORS: Record<string, string> = {
  captured:  '#374151',
  stacked:   '#1d4ed8',
  processed: '#7c3aed',
  published: '#15803d',
};

export default function Pipeline() {
  const { data, loading } = useFetch<FunnelRow[]>('/api/sessions/funnel');

  if (loading) return <p className="text-gray-500">Loading…</p>;

  const byStatus = Object.fromEntries((data ?? []).map(r => [r.processing_status, r.count]));
  const chartData = ORDER.map(s => ({ status: s, count: byStatus[s] ?? 0 }));
  const total = chartData.reduce((sum, r) => sum + r.count, 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Pipeline</h1>
      <p className="text-sm text-gray-500">Where is your data sitting? ({total} total sessions)</p>
      <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData}>
            <XAxis dataKey="status" tick={{ fill: '#9ca3af', fontSize: 12 }} />
            <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} allowDecimals={false} />
            <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151' }} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {chartData.map((row, i) => <Cell key={i} fill={COLORS[row.status] ?? '#374151'} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {chartData.map(row => (
          <div key={row.status} className="bg-gray-900 rounded-lg p-4 border border-gray-800 text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{row.status}</p>
            <p className="text-2xl font-bold" style={{ color: COLORS[row.status] }}>{row.count}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
