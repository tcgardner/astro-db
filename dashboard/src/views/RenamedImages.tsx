import { useState, useEffect, useCallback } from 'react';

interface RenamedImage {
  id: number;
  filename: string;
  original_filename: string;
  catalog_id: string;
  common_name: string | null;
  captured_at: string | null;
  id_stage: string;
  is_primary: number;
  created_at: string;
}

const STAGE_LABELS: Record<string, string> = {
  ai_vision:   'AI',
  plate_solve: 'Plate',
  exif:        'EXIF',
};

export default function RenamedImages() {
  const [images, setImages]   = useState<RenamedImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [input, setInput]     = useState('');
  const [filter, setFilter]   = useState('');
  const [pending, setPending] = useState(false);

  const loadImages = useCallback(() => {
    setLoading(true);
    setError(null);
    const url = filter.trim()
      ? `/api/images?catalog_id=${encodeURIComponent(filter.trim())}`
      : '/api/images';
    fetch(url)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() as Promise<RenamedImage[]>; })
      .then(setImages)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => { loadImages(); }, [loadImages]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setFilter(input);
  }

  async function setPrimary(id: number) {
    setPending(true);
    try {
      const r = await fetch(`/api/images/${id}/primary`, { method: 'PATCH' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      loadImages();
    } catch (e) {
      alert(`Failed: ${(e as Error).message}`);
    } finally {
      setPending(false);
    }
  }

  async function deleteImage(id: number, filename: string) {
    if (!window.confirm(`Delete ${filename}?`)) return;
    setPending(true);
    try {
      const r = await fetch(`/api/images/${id}`, { method: 'DELETE' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      loadImages();
    } catch (e) {
      alert(`Failed: ${(e as Error).message}`);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Renamed Images</h1>
        {!loading && (
          <span className="text-sm text-gray-400">{images.length} image{images.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Filter by catalog ID (e.g. M31)"
          className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500 w-64"
        />
        <button
          type="submit"
          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded"
        >
          Search
        </button>
        {filter && (
          <button
            type="button"
            onClick={() => { setInput(''); setFilter(''); }}
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm rounded"
          >
            Clear
          </button>
        )}
      </form>

      {loading && <p className="text-gray-500">Loading…</p>}
      {error   && <p className="text-red-400">Error: {error}</p>}

      {!loading && !error && images.length === 0 && (
        <p className="text-gray-500">No images{filter ? ` for "${filter}"` : ''}.</p>
      )}

      {!loading && images.length > 0 && (
        <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wide">
                <th className="py-3 px-4 text-left w-20">Thumb</th>
                <th className="py-3 px-4 text-left">Target</th>
                <th className="py-3 px-4 text-left">Filename</th>
                <th className="py-3 px-4 text-left">Captured</th>
                <th className="py-3 px-4 text-left w-20">Primary</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {images.map(img => (
                <tr key={img.id} className="border-b border-gray-800 last:border-0 hover:bg-gray-800/50">
                  <td className="py-2 px-4">
                    <img
                      src={`/api/images/${img.id}/file`}
                      alt={img.filename}
                      loading="lazy"
                      width={64}
                      height={64}
                      className="w-16 h-16 object-cover rounded"
                    />
                  </td>
                  <td className="py-2 px-4">
                    <span className="font-medium text-gray-100">{img.catalog_id}</span>
                    {img.common_name && (
                      <div className="text-xs text-gray-400 mt-0.5">{img.common_name}</div>
                    )}
                  </td>
                  <td className="py-2 px-4">
                    <span className="text-gray-200">{img.filename}</span>
                    <div className="mt-1">
                      <span className="text-xs bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded">
                        {STAGE_LABELS[img.id_stage] ?? img.id_stage}
                      </span>
                    </div>
                  </td>
                  <td className="py-2 px-4 text-gray-400">
                    {img.captured_at ? img.captured_at.slice(0, 10) : '—'}
                  </td>
                  <td className="py-2 px-4">
                    {img.is_primary === 1 && (
                      <span className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-full">
                        Primary
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-4 text-right">
                    <div className="flex gap-2 justify-end">
                      {img.is_primary !== 1 && (
                        <button
                          disabled={pending}
                          onClick={() => setPrimary(img.id)}
                          className="text-xs px-2 py-1 bg-indigo-700 hover:bg-indigo-600 disabled:opacity-40 text-white rounded"
                        >
                          Set Primary
                        </button>
                      )}
                      <button
                        disabled={pending}
                        onClick={() => deleteImage(img.id, img.filename)}
                        className="text-xs px-2 py-1 bg-red-700 hover:bg-red-600 disabled:opacity-40 text-white rounded"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
