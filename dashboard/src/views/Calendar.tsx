import { useFetch } from '../hooks/useFetch.ts';

interface CalDay { session_date: string; session_count: number; hours: number; }

function intensity(hours: number, max: number): string {
  if (hours === 0) return 'bg-gray-800';
  const pct = hours / max;
  if (pct < 0.25) return 'bg-indigo-900';
  if (pct < 0.5)  return 'bg-indigo-700';
  if (pct < 0.75) return 'bg-indigo-500';
  return 'bg-indigo-400';
}

export default function Calendar() {
  const { data, loading } = useFetch<CalDay[]>('/api/sessions/calendar');

  if (loading) return <p className="text-gray-500">Loading…</p>;

  const byDate = Object.fromEntries((data ?? []).map(d => [d.session_date, d]));
  const max = Math.max(...(data ?? []).map(d => d.hours), 1);

  const weeks: string[][] = [];
  if ((data ?? []).length > 0) {
    const start = new Date((data ?? [])[0].session_date);
    const end   = new Date((data ?? [])[(data ?? []).length - 1].session_date);
    start.setDate(start.getDate() - start.getDay());

    const cur = new Date(start);
    let week: string[] = [];
    while (cur <= end) {
      week.push(cur.toISOString().slice(0, 10));
      if (week.length === 7) { weeks.push(week); week = []; }
      cur.setDate(cur.getDate() + 1);
    }
    if (week.length) weeks.push(week);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Session Calendar</h1>
      <div className="bg-gray-900 rounded-lg p-6 border border-gray-800 overflow-auto">
        <div className="flex gap-1">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-1">
              {week.map(date => {
                const d = byDate[date];
                return (
                  <div
                    key={date}
                    title={d ? `${date}: ${d.hours}h (${d.session_count} sessions)` : date}
                    className={`w-3 h-3 rounded-sm ${d ? intensity(d.hours, max) : 'bg-gray-800'}`}
                  />
                );
              })}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 mt-4 text-xs text-gray-500">
          <span>Less</span>
          {['bg-gray-800','bg-indigo-900','bg-indigo-700','bg-indigo-500','bg-indigo-400'].map(c => (
            <div key={c} className={`w-3 h-3 rounded-sm ${c}`} />
          ))}
          <span>More</span>
        </div>
      </div>
    </div>
  );
}
