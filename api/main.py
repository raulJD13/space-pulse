# api/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routers import alerts, solar, asteroids, earth, mars, satellites, apod

app = FastAPI(
    title="Space Pulse API",
    description="Real-time Solar System observability platform",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

# Routers v1
app.include_router(alerts.router, prefix="/api/v1")
app.include_router(solar.router, prefix="/api/v1")
app.include_router(asteroids.router, prefix="/api/v1")
app.include_router(earth.router, prefix="/api/v1")
app.include_router(mars.router, prefix="/api/v1")
app.include_router(satellites.router, prefix="/api/v1")
app.include_router(apod.router, prefix="/api/v1")


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "space-pulse-api"}


# Backwards compatibility with existing frontend
@app.get("/api/summary")
def get_summary_compat():
    return alerts.get_daily_summary()


@app.get("/api/alerts")
def get_alerts_compat(limit: int = 50):
    return alerts.get_alerts(limit=limit, hours=168)
