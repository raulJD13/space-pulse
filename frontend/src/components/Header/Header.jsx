import { ShieldAlert, Sun, AlertTriangle, Globe, Satellite, TrendingUp, Minus } from 'lucide-react'
import { useCountUp } from '../../hooks/useCountUp'

const STATUS_COLORS = {
  NORMAL:   { text: 'text-green-400', bg: 'bg-green-500/10',   ring: 'border-green-500/30',  glow: 'rgba(34,197,94,0.18)'  },
  ELEVATED: { text: 'text-yellow-400', bg: 'bg-yellow-500/10', ring: 'border-yellow-500/30', glow: 'rgba(234,179,8,0.18)'  },
  HIGH:     { text: 'text-orange-400', bg: 'bg-orange-500/10', ring: 'border-orange-500/30', glow: 'rgba(249,115,22,0.18)' },
  CRITICAL: { text: 'text-red-400',    bg: 'bg-red-500/10',    ring: 'border-red-500/30',    glow: 'rgba(239,68,68,0.22)'  },
}

// Unique desync delays per card position
const SHINE_DELAYS = ['0s', '1.6s', '3.1s', '4.4s', '5.8s']

function getTrend(key, val) {
  if (key === 'system_status') return null
  if (key === 'solar_alerts_24h')        return val > 0 ? 'up'   : 'flat'
  if (key === 'high_risk_neos_upcoming') return val > 0 ? 'warn' : 'flat'
  if (key === 'earth_events_24h')        return val > 0 ? 'up'   : 'flat'
  if (key === 'satellite_anomalies_24h') return val > 0 ? 'warn' : 'flat'
  return 'flat'
}

function TrendIcon({ trend }) {
  if (trend === 'up')   return <TrendingUp size={11} className="text-amber-400" />
  if (trend === 'warn') return <TrendingUp size={11} className="text-red-400" />
  return <Minus size={11} className="text-slate-700" />
}

function StatusCard({ icon: Icon, label, value, colorClass, bgClass, ringClass, glowColor, status }) {
  const isCritical = status === 'CRITICAL'
  return (
    <div
      className={`cosmic-card shine-on-hover p-4 flex items-center gap-3 border ${ringClass} col-span-2 sm:col-span-1`}
      style={{
        '--shine-delay': '0s',
        animation: isCritical ? 'status-critical-pulse 2s ease-in-out infinite' : undefined,
        boxShadow: `0 4px 32px rgba(0,0,0,0.45), 0 0 20px ${glowColor}`,
      }}
    >
      <div
        className={`p-2.5 rounded-xl shrink-0 ${bgClass} border ${ringClass}`}
        style={{ boxShadow: `0 0 12px ${glowColor}` }}
      >
        <Icon size={18} className={colorClass} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-slate-500 text-[9px] uppercase tracking-widest truncate">{label}</p>
        <p
          className={`text-2xl font-black leading-none mt-0.5 tracking-tight ${colorClass}`}
          style={{ textShadow: `0 0 16px ${glowColor}` }}
        >
          {value}
        </p>
      </div>
    </div>
  )
}

function KPICard({ icon: Icon, label, value, colorClass, bgClass, ringClass, trend, shineDelay }) {
  const count = useCountUp(Number(value) || 0)
  return (
    <div
      className={`cosmic-card shine-on-hover p-3.5 flex items-center gap-3 border ${ringClass}`}
      style={{ '--shine-delay': shineDelay }}
    >
      <div className={`p-2 rounded-lg shrink-0 ${bgClass} border ${ringClass}`}>
        <Icon size={15} className={colorClass} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-slate-500 text-[9px] uppercase tracking-widest truncate">{label}</p>
        <div className="flex items-baseline gap-1.5 mt-0.5">
          <p className="text-xl font-black leading-none tracking-tight">{count}</p>
          {trend && <TrendIcon trend={trend} />}
        </div>
      </div>
    </div>
  )
}

export default function Header({ summary }) {
  if (!summary) return null
  const status = summary.system_status || 'NORMAL'
  const sc = STATUS_COLORS[status] || STATUS_COLORS.NORMAL

  const metrics = [
    {
      key: 'solar_alerts_24h',
      label: 'Solar Alerts 7d',
      icon: Sun,
      value: summary.solar_alerts_24h ?? 0,
      colorClass: 'text-amber-400',
      bgClass:    'bg-amber-500/10',
      ringClass:  'border-amber-500/20',
    },
    {
      key: 'high_risk_neos_upcoming',
      label: 'NEOs at Risk',
      icon: AlertTriangle,
      value: summary.high_risk_neos_upcoming ?? 0,
      colorClass: 'text-orange-400',
      bgClass:    'bg-orange-500/10',
      ringClass:  'border-orange-500/20',
    },
    {
      key: 'earth_events_24h',
      label: 'Earth Events 7d',
      icon: Globe,
      value: summary.earth_events_24h ?? 0,
      colorClass: 'text-cyan-400',
      bgClass:    'bg-cyan-500/10',
      ringClass:  'border-cyan-500/20',
    },
    {
      key: 'satellite_anomalies_24h',
      label: 'Sat. Anomalies',
      icon: Satellite,
      value: summary.satellite_anomalies_24h ?? 0,
      colorClass: 'text-violet-400',
      bgClass:    'bg-violet-500/10',
      ringClass:  'border-violet-500/20',
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {/* Hero: System Status */}
      <StatusCard
        icon={ShieldAlert}
        label="System Status"
        value={status}
        colorClass={sc.text}
        bgClass={sc.bg}
        ringClass={sc.ring}
        glowColor={sc.glow}
        status={status}
      />

      {/* Metric KPIs */}
      {metrics.map(({ key, ...rest }, i) => (
        <KPICard
          key={key}
          {...rest}
          trend={getTrend(key, rest.value)}
          shineDelay={SHINE_DELAYS[i + 1]}
        />
      ))}
    </div>
  )
}
