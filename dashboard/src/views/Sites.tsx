import { useFetch } from '../hooks/useFetch.ts';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface Site {
  id: number; name: string; bortle_class: number | null;
  session_count: number; total_hours: number; notes: string | null;
}

export default function Sites() {
  const { data, loading } = useFetch<Site[]>('/api/sites');

  if (loading) return <p className="text-gray-500">Loading…</p>;

  const sites = data ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Imaging Sites</h1>
      {sites.length === 0 ? (
        <p className="text-gray-600 text-sm">No sites recorded yet.</p>
      ) : (
        <>
          <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
            <h2 className="text-sm font-semibold text-gray-400 mb-4">Hours &amp; Sessions by Site</h2>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={sites}>
                <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <YAxis yAxisId="hours" tick={{ fill: '#9ca3af', fontSize: 11 }} unit="h" />
                <YAxis yAxisId="sessions" orientation="right" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151' }} />
                <Legend wrapperStyle={{ color: '#9ca3af', fontSize: 12 }} />
                <Bar yAxisId="hours"   dataKey="total_hours"   name="Hours"    fill="#6366f1" radius={[4,4,0,0]} />
                <Bar yAxisId="sessions" dataKey="session_count" name="Sessions" fill="#0891b2" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sites.map(s => (
              <div key={s.id} className="bg-gray-900 rounded-lg p-4 border border-gray-800">
                <p className="font-semibold text-gray-100">{s.name}</p>
                {s.bortle_class && <p className="text-xs text-gray-500 mt-0.5">Bortle {s.bortle_class}</p>}
                <div className="mt-3 flex gap-4 text-sm">
                  <span className="text-indigo-400 font-medium">{s.total_hours}h</span>
                  <span className="text-gray-500">{s.session_count} sessions</span>
                </div>
                {s.notes && <p className="mt-2 text-xs text-gray-600">{s.notes}</p>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
