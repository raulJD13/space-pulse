// src/App.jsx
import { useState, useEffect } from 'react'
import { apiClient } from './api/spaceApi'
import { AlertTriangle, Sun, ShieldAlert, Activity } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

function App() {
  const [summary, setSummary] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Hacemos las dos peticiones a la vez para que cargue más rápido
        const [summaryRes, alertsRes] = await Promise.all([
          apiClient.get('/summary'),
          apiClient.get('/alerts?limit=15') // Traemos las últimas 15 alertas
        ])
        
        setSummary(summaryRes.data)
        setAlerts(alertsRes.data)
      } catch (error) {
        console.error("Error al conectar con la API:", error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [])

  // Función para darle color a la etiqueta de severidad
  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-500/20 text-red-400 border-red-500/50'
      case 'HIGH': return 'bg-orange-500/20 text-orange-400 border-orange-500/50'
      case 'MEDIUM': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'
      default: return 'bg-green-500/20 text-green-400 border-green-500/50'
    }
  }

  // Preparamos los datos para la gráfica (Agrupamos alertas por severidad)
  const chartData = [
    { name: 'CRITICAL', count: alerts.filter(a => a.severity === 'CRITICAL').length, color: '#ef4444' },
    { name: 'HIGH', count: alerts.filter(a => a.severity === 'HIGH').length, color: '#f97316' },
    { name: 'MEDIUM', count: alerts.filter(a => a.severity === 'MEDIUM').length, color: '#eab308' },
    { name: 'LOW', count: alerts.filter(a => a.severity === 'LOW').length, color: '#22c55e' }
  ].filter(item => item.count > 0) // Solo mostramos los que tengan al menos 1

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 p-8 font-sans">
      
      {/* Cabecera */}
      <header className="mb-10 border-b border-slate-800 pb-6 flex items-center gap-4">
        <Activity className="text-blue-500" size={40} />
        <div>
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
            Space Pulse
          </h1>
          <p className="text-slate-400 mt-1">Centro de Comando de Amenazas Espaciales</p>
        </div>
      </header>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="text-blue-400 text-xl animate-pulse flex flex-col items-center">
            <Activity className="animate-spin mb-4" size={40} />
            Sincronizando con satélites de la NASA...
          </div>
        </div>
      ) : (
        <>
          {/* 1. SECCIÓN: WIDGETS DE RESUMEN */}
          {summary && !summary.message && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50 flex items-center space-x-5">
                <div className={`p-4 rounded-full ${summary.system_status === 'NORMAL' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-500'}`}>
                  <ShieldAlert size={32} />
                </div>
                <div>
                  <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">Estado Global</p>
                  <p className="text-3xl font-bold mt-1">{summary.system_status}</p>
                </div>
              </div>

              <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50 flex items-center space-x-5">
                <div className="p-4 rounded-full bg-yellow-500/20 text-yellow-400">
                  <Sun size={32} />
                </div>
                <div>
                  <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">Alertas Solares (24h)</p>
                  <p className="text-3xl font-bold mt-1">{summary.solar_alerts_24h}</p>
                </div>
              </div>

              <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50 flex items-center space-x-5">
                <div className="p-4 rounded-full bg-orange-500/20 text-orange-400">
                  <AlertTriangle size={32} />
                </div>
                <div>
                  <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">NEOs Peligrosos</p>
                  <p className="text-3xl font-bold mt-1">{summary.high_risk_neos_upcoming}</p>
                </div>
              </div>
            </div>
          )}

          {/* 2. SECCIÓN: GRÁFICA Y TABLA */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Gráfica de Severidad */}
            <div className="bg-slate-800/30 p-6 rounded-2xl border border-slate-800 lg:col-span-1">
              <h2 className="text-xl font-bold mb-6 text-slate-300 border-b border-slate-700 pb-2">Distribución de Riesgo</h2>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                    <YAxis stroke="#94a3b8" fontSize={12} allowDecimals={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                      itemStyle={{ color: '#f8fafc' }}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Tabla de Alertas Detalladas */}
            <div className="bg-slate-800/30 p-6 rounded-2xl border border-slate-800 lg:col-span-2 overflow-hidden flex flex-col">
              <h2 className="text-xl font-bold mb-6 text-slate-300 border-b border-slate-700 pb-2">Registro de Amenazas Activas</h2>
              
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left text-sm">
                  <thead className="text-slate-400 bg-slate-800/50 uppercase text-xs">
                    <tr>
                      <th className="px-4 py-3 rounded-tl-lg">Fecha</th>
                      <th className="px-4 py-3">Tipo</th>
                      <th className="px-4 py-3">Nivel</th>
                      <th className="px-4 py-3 rounded-tr-lg">Descripción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {alerts.length > 0 ? alerts.map((alert, index) => (
                      <tr key={index} className="hover:bg-slate-800/50 transition-colors">
                        <td className="px-4 py-4 whitespace-nowrap text-slate-300">
                          {new Date(alert.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          {alert.alert_type === 'SOLAR_FLARE' ? (
                            <span className="flex items-center text-yellow-400 gap-2"><Sun size={16}/> Solar</span>
                          ) : (
                            <span className="flex items-center text-orange-400 gap-2"><AlertTriangle size={16}/> Asteroide</span>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getSeverityColor(alert.severity)}`}>
                            {alert.severity}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-slate-400">
                          {alert.description}
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="4" className="text-center py-8 text-slate-500">
                          No hay alertas registradas en este momento.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </>
      )}
    </div>
  )
}

export default App