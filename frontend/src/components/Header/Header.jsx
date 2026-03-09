import { Activity, ShieldAlert, Sun, AlertTriangle, Globe, Satellite, Telescope } from 'lucide-react'

const STATUS_STYLES = {
  NORMAL:   { ring: 'border-green-500/40',  bg: 'bg-green-500/10',  text: 'text-green-400',  dot: 'bg-green-400'  },
  ELEVATED: { ring: 'border-yellow-500/40', bg: 'bg-yellow-500/10', text: 'text-yellow-400', dot: 'bg-yellow-400' },
  HIGH:     { ring: 'border-orange-500/40', bg: 'bg-orange-500/10', text: 'text-orange-400', dot: 'bg-orange-400' },
  CRITICAL: { ring: 'border-red-500/40',    bg: 'bg-red-500/10',    text: 'text-red-400',    dot: 'bg-red-400'    },
}

const KPI_DEFS = [
  {
    key: 'system_status',
    label: 'System Status',
    icon: ShieldAlert,
    getVal: (s) => s.system_status ?? 'NORMAL',
    iconClass: (s) => STATUS_STYLES[s.system_status ?? 'NORMAL']?.text ?? 'text-green-400',
    bgClass:   (s) => STATUS_STYLES[s.system_status ?? 'NORMAL']?.bg ?? 'bg-green-500/10',
    ringClass: (s) => STATUS_STYLES[s.system_status ?? 'NORMAL']?.ring ?? 'border-green-500/40',
  },
  {
    key: 'solar_alerts_24h',
    label: 'Solar Alerts (7d)',
    icon: Sun,
    getVal: (s) => s.solar_alerts_24h ?? 0,
    iconClass: () => 'text-amber-400',
    bgClass:   () => 'bg-amber-500/10',
    ringClass: () => 'border-amber-500/30',
  },
  {
    key: 'high_risk_neos_upcoming',
    label: 'NEOs at Risk',
    icon: AlertTriangle,
    getVal: (s) => s.high_risk_neos_upcoming ?? 0,
    iconClass: () => 'text-orange-400',
    bgClass:   () => 'bg-orange-500/10',
    ringClass: () => 'border-orange-500/30',
  },
  {
    key: 'earth_events_24h',
    label: 'Earth Events (7d)',
    icon: Globe,
    getVal: (s) => s.earth_events_24h ?? 0,
    iconClass: () => 'text-cyan-400',
    bgClass:   () => 'bg-cyan-500/10',
    ringClass: () => 'border-cyan-500/30',
  },
  {
    key: 'satellite_anomalies_24h',
    label: 'Sat. Anomalies',
    icon: Satellite,
    getVal: (s) => s.satellite_anomalies_24h ?? 0,
    iconClass: () => 'text-violet-400',
    bgClass:   () => 'bg-violet-500/10',
    ringClass: () => 'border-violet-500/30',
  },
]

export default function Header({ summary, lastUpdated }) {
  return (
    <header className="space-y-5 anim-card">
      {/* ── Title bar ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Logo mark */}
          <div className="relative w-11 h-11 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-blue-500/10 border border-blue-500/30 animate-glow-pulse" />
            <Activity size={22} className="text-blue-400 relative z-10" />
          </div>

          <div>
            <h1 className="text-3xl font-black tracking-tight leading-none">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-cyan-300 to-violet-400 text-glow-blue">
                SPACE PULSE
              </span>
            </h1>
            <p className="text-slate-500 text-xs tracking-[0.18em] uppercase mt-0.5">
              Solar System Observability Dashboard
            </p>
          </div>
        </div>

        {/* Right side: live + timestamp */}
        <div className="flex items-center gap-3 text-xs text-slate-500">
          {lastUpdated && (
            <span className="hidden sm:block">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/25">
            <div className="live-dot" />
            <span className="text-green-400 text-[10px] tracking-widest font-semibold">LIVE</span>
          </div>
        </div>
      </div>

      {/* ── KPI row ── */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {KPI_DEFS.map((kpi, i) => {
            const Icon = kpi.icon
            const val  = kpi.getVal(summary)
            return (
              <div
                key={kpi.key}
                className={`cosmic-card shine-on-hover p-4 flex items-center gap-3 border ${kpi.ringClass(summary)}`}
                style={{ animationDelay: `${i * 0.06}s` }}
              >
                <div className={`p-2.5 rounded-lg shrink-0 ${kpi.bgClass(summary)} border ${kpi.ringClass(summary)}`}>
                  <Icon size={18} className={kpi.iconClass(summary)} />
                </div>
                <div className="min-w-0">
                  <p className="text-slate-500 text-[10px] uppercase tracking-wider truncate">{kpi.label}</p>
                  <p className="text-xl font-bold mt-0.5 leading-none">{val}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </header>
  )
}
