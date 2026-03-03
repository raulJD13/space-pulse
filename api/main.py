# api/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import clickhouse_connect
import os

# Inicializamos la app de FastAPI
app = FastAPI(
    title="Space Pulse API",
    description="API para servir datos espaciales y de clima solar",
    version="1.0.0"
)

# Configuramos CORS (Vital para que nuestro futuro frontend en React pueda pedirle datos sin que el navegador lo bloquee)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción aquí pondríamos 'http://localhost:3000' o el dominio real
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Función para conectarnos a ClickHouse
def get_clickhouse_client():
    return clickhouse_connect.get_client(
        host=os.getenv("CLICKHOUSE_HOST", "localhost"),
        port=int(os.getenv("CLICKHOUSE_PORT", "8123")),
        username=os.getenv("CLICKHOUSE_USER", "default"),
        password=os.getenv("CLICKHOUSE_PASSWORD", "")
    )

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Space Pulse API is running! 🚀"}

@app.get("/api/summary")
def get_summary():
    """
    Devuelve el resumen del estado global del sistema solar del día de hoy.
    Ideal para los widgets superiores del Dashboard.
    """
    client = get_clickhouse_client()
    query = "SELECT * FROM space_pulse_dev_marts.mart_daily_summary ORDER BY summary_date DESC LIMIT 1"
    result = client.query(query)
    
    if not result.result_rows:
        return {"message": "No data available yet"}
        
    # Emparejamos los nombres de las columnas con los valores de la fila
    row = result.result_rows[0]
    summary_dict = dict(zip(result.column_names, row))
    return summary_dict

@app.get("/api/alerts")
def get_alerts(limit: int = 50):
    """
    Devuelve la lista unificada de alertas (Asteroides + Clima Solar) 
    ordenadas por fecha y severidad.
    """
    client = get_clickhouse_client()
    query = f"""
        SELECT * FROM space_pulse_dev_marts.mart_space_alerts 
        ORDER BY created_at DESC, severity_numeric DESC 
        LIMIT {limit}
    """
    result = client.query(query)
    
    alerts = []
    # Transformamos el resultado tabular en una lista de diccionarios JSON
    for row in result.result_rows:
        alerts.append(dict(zip(result.column_names, row)))
        
    return alerts