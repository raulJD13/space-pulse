// src/api/spaceApi.js
import axios from 'axios';

// Creamos una instancia de axios apuntando a nuestro FastAPI
export const apiClient = axios.create({
  baseURL: 'http://localhost:8000/api',
});