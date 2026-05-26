import { useState } from 'react';
import { useFetch } from '../hooks/useFetch.ts';

interface Session {
  id: number; session_date: string; catalog_id: string; common_name: string | null;
  filter: string | null; frame_count: number; hours: number;
  moon_illumination_pct: number | null; seeing_rating: number | null;
  processing_status: string; site_name: string | null;
}

const STATUS_COLOR: Record<string, string> = {
  captured:  'bg-gray-700 text-gray-300',
  stacked:   'bg-blue-900 text-blue-300',
  processed: 'bg-purple-900 text-purple-300',
  published: 'bg-green-900 text-green-300',
};

export default function Sessions() {
  const { data, loading } = useFetch<Session[]>('/api/sessions');
  const [search, setSearch] = useState('');

  if (loading) return <p className="text-gray-500">Loading…</p>;

  const rows = (data ?? []).filter(s =>
    !search || s.catalog_id.toLowerCase().includes(search.toLowerCase()) ||
    (s.common_name ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Sessions</h1>
        <input
          type="text" placeholder="Filter by target…" value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-gray-100 w-52"
        />
      </div>
      <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-gray-500 text-xs uppercase tracking-wider">
              {['Date','Target','Filter','Frames','Hours','Moon %','Seeing','Site','Status'].map(h => (
                <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(s => (
              <tr key={s.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                <td className="px-4 py-2 text-gray-300">{s.session_date}</td>
                <td className="px-4 py-2 font-medium">{s.catalog_id}</td>
                <td className="px-4 py-2 text-gray-400">{s.filter ?? '—'}</td>
                <td className="px-4 py-2 text-gray-300">{s.frame_count}</td>
                <td className="px-4 py-2 text-gray-300">{s.hours}h</td>
                <td className="px-4 py-2 text-gray-300">{s.moon_illumination_pct != null ? `${s.moon_illumination_pct}%` : '—'}</td>
                <td className="px-4 py-2 text-gray-300">{s.seeing_rating ?? '—'}</td>
                <td className="px-4 py-2 text-gray-400">{s.site_name ?? '—'}</td>
                <td className="px-4 py-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLOR[s.processing_status] ?? 'bg-gray-700 text-gray-300'}`}>
                    {s.processing_status}
                  </span>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-600">No sessions found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
