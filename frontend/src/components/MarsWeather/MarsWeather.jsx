import { Thermometer, Wind, Gauge, Flame } from 'lucide-react'

function MetricCard({ icon: Icon, label, value, unit, color }) {
  return (
    <div className="rounded-lg p-3 text-center" style={{ background: 'rgba(15,10,5,0.5)', border: '1px solid rgba(249,115,22,0.12)' }}>
      <div className="flex items-center justify-center gap-1 mb-1">
        <Icon size={11} className={color} />
        <p className="text-slate-500 text-[10px] uppercase tracking-wider">{label}</p>
      </div>
      <p className={`text-base font-bold leading-none ${color}`}>
        {value}
        <span className="text-xs text-slate-500 ml-0.5">{unit}</span>
      </p>
    </div>
  )
}

export default function MarsWeather({ data }) {
  const hasData = data && (data.sol != null)

  return (
    <div className="cosmic-card p-5" style={{ borderColor: 'rgba(249,115,22,0.2)' }}>
      {/* Header */}
      <div className="flex items-center gap-2 section-sep" style={{ borderColor: 'rgba(249,115,22,0.15)' }}>
        <Thermometer size={16} className="text-orange-400" />
        <h2 className="text-sm font-bold text-slate-200 tracking-wide uppercase">Mars Weather</h2>
        {hasData && (
          <span className="ml-auto text-[10px] text-orange-400/70 bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/20">
            Sol {data.sol}
          </span>
        )}
      </div>

      {hasData ? (
        <>
          <div className="grid grid-cols-2 gap-2.5">
            <MetricCard
              icon={Thermometer}
              label="Avg Temp"
              value={data.temp_avg_celsius != null ? data.temp_avg_celsius.toFixed(1) : '--'}
              unit="°C"
              color="text-orange-400"
            />
            <MetricCard
              icon={Flame}
              label="Min/Max"
              value={data.temp_min_celsius != null ? `${data.temp_min_celsius.toFixed(0)}/${data.temp_max_celsius?.toFixed(0)}` : '--'}
              unit="°C"
              color="text-amber-400"
            />
            <MetricCard
              icon={Wind}
              label="Wind"
              value={data.wind_speed_avg_ms != null ? data.wind_speed_avg_ms.toFixed(1) : '--'}
              unit="m/s"
              color="text-cyan-500"
            />
            <MetricCard
              icon={Gauge}
              label="Pressure"
              value={data.pressure_pa != null ? data.pressure_pa.toFixed(0) : '--'}
              unit="Pa"
              color="text-violet-400"
            />
          </div>

          {data.season && (
            <p className="text-center text-[11px] text-slate-600 mt-3">
              <span className="text-slate-500 uppercase tracking-wider text-[10px]">Season</span>
              {' · '}
              <span className="text-slate-400 capitalize">{data.season}</span>
              {data.earth_date && <span className="ml-2 text-slate-600">{data.earth_date}</span>}
            </p>
          )}
        </>
      ) : (
        <div className="py-6 text-center space-y-1">
          <p className="text-slate-500 text-sm">No Mars weather data</p>
          <p className="text-slate-700 text-xs">InSight mission ended Dec 2022</p>
        </div>
      )}
    </div>
  )
}
