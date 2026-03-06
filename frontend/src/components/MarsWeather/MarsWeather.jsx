// src/components/MarsWeather/MarsWeather.jsx
import { Thermometer } from 'lucide-react'

export default function MarsWeather({ data }) {
  if (!data || (!data.sol && data.sol !== 0)) {
    return (
      <div className="bg-slate-800/30 p-5 rounded-xl border border-slate-800">
        <div className="flex items-center gap-2 mb-4 border-b border-slate-700 pb-2">
          <Thermometer size={18} className="text-red-400" />
          <h2 className="text-lg font-bold text-slate-300">Mars Weather</h2>
        </div>
        <p className="text-slate-500 text-sm text-center py-6">
          No Mars weather data available.
          <br />
          <span className="text-xs">(InSight mission ended Dec 2022)</span>
        </p>
      </div>
    )
  }

  return (
    <div className="bg-slate-800/30 p-5 rounded-xl border border-slate-800">
      <div className="flex items-center gap-2 mb-4 border-b border-slate-700 pb-2">
        <Thermometer size={18} className="text-red-400" />
        <h2 className="text-lg font-bold text-slate-300">Mars Weather</h2>
        <span className="ml-auto text-xs text-slate-500">Sol {data.sol}</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          label="Avg Temp"
          value={data.temp_avg_celsius != null ? `${data.temp_avg_celsius.toFixed(1)}` : '--'}
          unit="C"
          color="text-blue-400"
        />
        <MetricCard
          label="Min / Max"
          value={data.temp_min_celsius != null && data.temp_max_celsius != null
            ? `${data.temp_min_celsius.toFixed(0)} / ${data.temp_max_celsius.toFixed(0)}`
            : '--'}
          unit="C"
          color="text-cyan-400"
        />
        <MetricCard
          label="Wind Speed"
          value={data.wind_speed_avg_ms != null ? `${data.wind_speed_avg_ms.toFixed(1)}` : '--'}
          unit="m/s"
          color="text-green-400"
        />
        <MetricCard
          label="Pressure"
          value={data.pressure_pa != null ? `${data.pressure_pa.toFixed(0)}` : '--'}
          unit="Pa"
          color="text-purple-400"
        />
      </div>

      {data.season && (
        <div className="mt-3 text-center">
          <span className="text-xs text-slate-500 uppercase tracking-wider">Season: </span>
          <span className="text-xs text-slate-300 capitalize">{data.season}</span>
        </div>
      )}

      <p className="text-xs text-slate-600 mt-2 text-center">
        Earth date: {data.earth_date || 'N/A'}
      </p>
    </div>
  )
}

function MetricCard({ label, value, unit, color }) {
  return (
    <div className="bg-slate-900/50 rounded-lg p-3 text-center">
      <p className="text-slate-500 text-xs uppercase tracking-wider">{label}</p>
      <p className={`text-lg font-bold mt-1 ${color}`}>
        {value}<span className="text-xs text-slate-500 ml-0.5">{unit}</span>
      </p>
    </div>
  )
}
