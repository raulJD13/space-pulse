// src/components/Header/Header.jsx
import { Activity, ShieldAlert, Sun, AlertTriangle, Globe, Satellite } from 'lucide-react'

const statusColors = {
  NORMAL: 'text-green-400 bg-green-500/20',
  ELEVATED: 'text-yellow-400 bg-yellow-500/20',
  HIGH: 'text-orange-400 bg-orange-500/20',
  CRITICAL: 'text-red-400 bg-red-500/20',
}

export default function Header({ summary, lastUpdated }) {
  const status = summary?.system_status || 'NORMAL'

  return (
    <header className="mb-8">
      {/* Title bar */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <Activity className="text-blue-500" size={36} />
          <div>
            <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
              Space Pulse
            </h1>
            <p className="text-slate-500 text-sm">Solar System Observability Dashboard</p>
          </div>
        </div>
        {lastUpdated && (
          <span className="text-slate-500 text-xs">
            Updated {lastUpdated.toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* KPI widgets */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Widget
            icon={<ShieldAlert size={24} />}
            label="System Status"
            value={status}
            colorClass={statusColors[status]}
          />
          <Widget
            icon={<Sun size={24} />}
            label="Solar Alerts (24h)"
            value={summary.solar_alerts_24h ?? 0}
            colorClass="text-yellow-400 bg-yellow-500/20"
          />
          <Widget
            icon={<AlertTriangle size={24} />}
            label="NEOs at Risk"
            value={summary.high_risk_neos_upcoming ?? 0}
            colorClass="text-orange-400 bg-orange-500/20"
          />
          <Widget
            icon={<Globe size={24} />}
            label="Earth Events (24h)"
            value={summary.earth_events_24h ?? 0}
            colorClass="text-blue-400 bg-blue-500/20"
          />
          <Widget
            icon={<Satellite size={24} />}
            label="Sat. Anomalies"
            value={summary.satellite_anomalies_24h ?? 0}
            colorClass="text-purple-400 bg-purple-500/20"
          />
        </div>
      )}
    </header>
  )
}

function Widget({ icon, label, value, colorClass }) {
  return (
    <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 flex items-center gap-3">
      <div className={`p-2.5 rounded-lg ${colorClass}`}>{icon}</div>
      <div>
        <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">{label}</p>
        <p className="text-xl font-bold mt-0.5">{value}</p>
      </div>
    </div>
  )
}
