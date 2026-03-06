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
export const fetchApod = () => v1.get('/apod/').then(r => r.data)
