import { useFetch } from '../hooks/useFetch.ts';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface Stats { targets_imaged: number; total_hours: number; session_count: number; frame_count: number; }
interface CalDay { session_date: string; hours: number; }

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-gray-900 rounded-lg p-5 border border-gray-800">
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-3xl font-bold text-indigo-400">{value}</p>
    </div>
  );
}

export default function Overview() {
  const { data: stats, loading: sl } = useFetch<Stats>('/api/stats');
  const { data: cal, loading: cl }   = useFetch<CalDay[]>('/api/sessions/calendar');

  if (sl || cl) return <p className="text-gray-500">Loading…</p>;

  const monthly = Object.entries(
    (cal ?? []).reduce<Record<string, number>>((acc, d) => {
      const month = d.session_date.slice(0, 7);
      acc[month] = (acc[month] ?? 0) + d.hours;
      return acc;
    }, {})
  ).map(([month, hours]) => ({ month, hours: +hours.toFixed(2) }));

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Overview</h1>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Targets Imaged"  value={stats?.targets_imaged  ?? 0} />
        <StatCard label="Total Hours"     value={stats?.total_hours     ?? 0} />
        <StatCard label="Sessions"        value={stats?.session_count   ?? 0} />
        <StatCard label="Light Frames"    value={stats?.frame_count     ?? 0} />
      </div>
      <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
        <h2 className="text-sm font-semibold text-gray-400 mb-4">Integration Hours by Month</h2>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={monthly}>
            <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 11 }} />
            <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} unit="h" />
            <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151' }} />
            <Area type="monotone" dataKey="hours" stroke="#6366f1" fill="#312e81" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
