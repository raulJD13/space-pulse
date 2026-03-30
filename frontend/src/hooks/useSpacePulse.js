// src/hooks/useSpacePulse.js
import { useState, useEffect, useCallback } from 'react'
import {
  fetchSummary, fetchAlerts, fetchNeos,
  fetchEarthEvents, fetchMarsWeather, fetchSatellites, fetchApod
} from '../api/spaceApi'

const POLL_INTERVAL = parseInt(import.meta.env.VITE_POLL_INTERVAL_MS || '300000') // 5 min

export function useSpacePulse() {
  const [state, setState] = useState({
    summary: null,
    alerts: [],
    neos: [],
    earthEvents: [],
    marsWeather: null,
    satellites: [],
    apod: null,
    loading: true,
    lastUpdated: null,
    error: null,
  })

  const fetchAll = useCallback(async () => {
    const results = await Promise.allSettled([
      fetchSummary(),
      fetchAlerts({ hours: 168, limit: 100 }),
      fetchNeos({ days_ahead: 7, limit: 50 }),
      fetchEarthEvents({ status: 'open', limit: 50 }),
      fetchMarsWeather(),
      fetchSatellites({ anomalous_only: true, limit: 20 }),
      fetchApod(),
    ])

    const allFailed = results.every(r => r.status === 'rejected')
    if (allFailed) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Cannot reach the API server. Check that the backend is running on port 8000.',
      }))
      return
    }

    const [summary, alerts, neos, earthEvents, marsWeather, satellites, apod] = results.map(
      r => r.status === 'fulfilled' ? r.value : null
    )

    setState(prev => ({
      ...prev,
      summary: summary ?? prev.summary,
      alerts: alerts ?? prev.alerts,
      neos: neos ?? prev.neos,
      earthEvents: earthEvents ?? prev.earthEvents,
      marsWeather: marsWeather ?? prev.marsWeather,
      satellites: satellites ?? prev.satellites,
      apod: apod ?? prev.apod,
      loading: false,
      lastUpdated: new Date(),
      error: null,
    }))
  }, [])

  useEffect(() => {
    fetchAll()
    const interval = setInterval(fetchAll, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [fetchAll])

  return { ...state, refetch: fetchAll }
}
