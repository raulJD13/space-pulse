import { Thermometer, Wind, Gauge, Flame } from 'lucide-react'

function Metric({ icon: Icon, label, value, unit, color, glowColor }) {
  return (
    <div
      className="rounded-xl p-2.5 text-center"
      style={{
        background: 'rgba(18, 5, 3, 0.55)',
        border: `1px solid ${glowColor || 'rgba(180,50,20,0.12)'}`,
      }}
    >
      <div className="flex items-center justify-center gap-1 mb-1">
        <Icon size={9} className={color} />
        <p className="text-[8px] text-slate-600 uppercase tracking-wider">{label}</p>
      </div>
      <p className={`text-sm font-bold leading-none ${color}`}>
        {value}
        <span className="text-[9px] text-slate-600 ml-0.5">{unit}</span>
      </p>
    </div>
  )
}

export default function MarsWeather({ data }) {
  const hasData = data && data.sol != null

  return (
    <div
      className="cosmic-card p-4"
      style={{
        borderColor: 'rgba(180, 55, 20, 0.22)',
        background: 'rgba(14, 5, 2, 0.85)',
      }}
    >
      <div
        className="flex items-center gap-2 section-sep"
        style={{ borderColor: 'rgba(180,55,20,0.14)' }}
      >
        <Flame
          size={14}
          className="text-red-500"
          style={{ filter: 'drop-shadow(0 0 4px rgba(220,60,20,0.6))' }}
        />
        <h2 className="text-[11px] font-bold text-slate-200 tracking-[0.12em] uppercase">
          Mars Weather
        </h2>
        {hasData && (
          <span
            className="ml-auto text-[9px] text-red-400/70 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20"
            style={{ boxShadow: '0 0 8px rgba(220,50,20,0.12)' }}
          >
            Sol {data.sol}
          </span>
        )}
      </div>

      {hasData ? (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Metric
              icon={Thermometer}
              label="Avg"
              value={data.temp_avg_celsius?.toFixed(1) ?? '—'}
              unit="°C"
              color="text-red-400"
              glowColor="rgba(220,50,20,0.14)"
            />
            <Metric
              icon={Flame}
              label="Hi / Lo"
              value={
                data.temp_max_celsius != null
                  ? `${data.temp_max_celsius?.toFixed(0)}/${data.temp_min_celsius?.toFixed(0)}`
                  : '—'
              }
              unit="°C"
              color="text-rose-400"
              glowColor="rgba(220,50,40,0.12)"
            />
            <Metric
              icon={Wind}
              label="Wind"
              value={data.wind_speed_avg_ms?.toFixed(1) ?? '—'}
              unit="m/s"
              color="text-orange-400"
              glowColor="rgba(180,80,0,0.12)"
            />
            <Metric
              icon={Gauge}
              label="Press"
              value={data.pressure_pa?.toFixed(0) ?? '—'}
              unit="Pa"
              color="text-red-300"
              glowColor="rgba(200,40,20,0.10)"
            />
          </div>
          {data.earth_date && (
            <p className="text-center text-[9px] text-slate-700 mt-2">
              Earth date: {data.earth_date}
            </p>
          )}
        </>
      ) : (
        <div className="py-5 text-center space-y-1">
          <p className="text-slate-500 text-[11px]">Archived InSight telemetry only</p>
          <p className="text-slate-700 text-[10px]">Mission concluded Dec 2022</p>
        </div>
      )}
    </div>
  )
}
