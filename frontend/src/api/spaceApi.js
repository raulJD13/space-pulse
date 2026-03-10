// src/api/spaceApi.js
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// Legacy client (backwards compat)
export const apiClient = axios.create({
  baseURL: `${API_BASE}/api`,
})

// v1 API client
const v1 = axios.create({
  baseURL: `${API_BASE}/api/v1`,
})

export const fetchSummary = () => v1.get('/alerts/summary').then(r => r.data)
export const fetchAlerts = (params = {}) => v1.get('/alerts/', { params }).then(r => r.data)
export const fetchNeos = (params = {}) => v1.get('/asteroids/', { params }).then(r => r.data)
export const fetchEarthEvents = (params = {}) => v1.get('/earth/events', { params }).then(r => r.data)
export const fetchMarsWeather = () => v1.get('/mars/weather/latest').then(r => r.data)
export const fetchMarsHistory = (params = {}) => v1.get('/mars/weather', { params }).then(r => r.data)
export const fetchSatellites = (params = {}) => v1.get('/satellites/', { params }).then(r => r.data)
export const fetchSolarEvents = (params = {}) => v1.get('/solar/events', { params }).then(r => r.data)
// APOD changes once per day. Cache in-module for 1 hour and deduplicate
// concurrent in-flight requests (React StrictMode fires effects twice in dev).
let _apodCache = null
let _apodCachedAt = 0
let _apodInflight = null
const APOD_TTL_MS = 3_600_000

export const fetchApod = () => {
  const now = Date.now()
  if (_apodCache && now - _apodCachedAt < APOD_TTL_MS) return Promise.resolve(_apodCache)
  if (_apodInflight) return _apodInflight
  _apodInflight = v1.get('/apod/').then(r => {
    _apodCache = r.data
    _apodCachedAt = Date.now()
    _apodInflight = null
    return r.data
  }).catch(err => {
    _apodInflight = null
    throw err
  })
  return _apodInflight
}
