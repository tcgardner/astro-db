import { useFetch } from '../hooks/useFetch.ts';

interface SchemaRow { name: string; sql: string; }
interface IndexRow  { name: string; sql: string; tbl_name: string; }
interface SchemaData { tables: SchemaRow[]; indexes: IndexRow[]; }

export default function Schema() {
  const { data, loading } = useFetch<SchemaData>('/api/schema');

  if (loading) return <p className="text-gray-500">Loading…</p>;

  const { tables = [], indexes = [] } = data ?? {};

  const indexesByTable = indexes.reduce<Record<string, IndexRow[]>>((acc, idx) => {
    (acc[idx.tbl_name] ??= []).push(idx);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Schema</h1>
        <p className="text-sm text-gray-500 mt-1">{tables.length} tables · {indexes.length} indexes</p>
      </div>

      {tables.map(t => (
        <div key={t.name} className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-800 flex items-center justify-between">
            <span className="font-mono font-semibold text-indigo-400">{t.name}</span>
            {indexesByTable[t.name] && (
              <span className="text-xs text-gray-600">
                {indexesByTable[t.name].length} index{indexesByTable[t.name].length !== 1 ? 'es' : ''}
              </span>
            )}
          </div>
          <pre className="px-4 py-4 text-xs text-gray-300 font-mono overflow-auto leading-relaxed whitespace-pre-wrap">
            {t.sql + ';'}
          </pre>
          {indexesByTable[t.name] && (
            <div className="border-t border-gray-800 px-4 py-3 space-y-1.5">
              {indexesByTable[t.name].map(idx => (
                <pre key={idx.name} className="text-xs text-gray-500 font-mono whitespace-pre-wrap">
                  {idx.sql + ';'}
                </pre>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
