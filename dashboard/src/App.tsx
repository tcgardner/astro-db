import { BrowserRouter, NavLink, Route, Routes, Navigate } from 'react-router-dom';
import Overview from './views/Overview.tsx';
import Targets from './views/Targets.tsx';
import Sessions from './views/Sessions.tsx';
import Calendar from './views/Calendar.tsx';
import MoonCorrelation from './views/MoonCorrelation.tsx';
import Pipeline from './views/Pipeline.tsx';
import Sites from './views/Sites.tsx';
import SeeingTrends from './views/SeeingTrends.tsx';
import Schema from './views/Schema.tsx';

const NAV = [
  { to: '/overview',   label: 'Overview' },
  { to: '/targets',    label: 'Targets' },
  { to: '/sessions',   label: 'Sessions' },
  { to: '/calendar',   label: 'Calendar' },
  { to: '/moon',       label: 'Moon' },
  { to: '/pipeline',   label: 'Pipeline' },
  { to: '/sites',      label: 'Sites' },
  { to: '/seeing',     label: 'Seeing' },
  { to: '/schema',     label: 'Schema' },
];

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen bg-gray-950 text-gray-100">
        <nav className="w-48 shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col py-6 px-3 gap-1">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest px-3 mb-3">
            Astro DB
          </span>
          {NAV.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `px-3 py-2 rounded text-sm transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-400 hover:text-gray-100 hover:bg-gray-800'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <main className="flex-1 overflow-auto p-8">
          <Routes>
            <Route path="/" element={<Navigate to="/overview" replace />} />
            <Route path="/overview"  element={<Overview />} />
            <Route path="/targets"   element={<Targets />} />
            <Route path="/sessions"  element={<Sessions />} />
            <Route path="/calendar"  element={<Calendar />} />
            <Route path="/moon"      element={<MoonCorrelation />} />
            <Route path="/pipeline"  element={<Pipeline />} />
            <Route path="/sites"     element={<Sites />} />
            <Route path="/seeing"    element={<SeeingTrends />} />
            <Route path="/schema"    element={<Schema />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
