# scripts/test_nasa_api.py
import asyncio
import os
from dotenv import load_dotenv
import sys
from datetime import datetime

# Añadir la raíz del proyecto al path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ingestion.clients.donki_client import DONKIClient
from ingestion.minio_storage import MinIOStorage

async def main():
    load_dotenv()
    api_key = os.getenv("NASA_API_KEY", "DEMO_KEY")
    
    print(f" Iniciando extracción con API_KEY: {api_key[:5]}...")
    client = DONKIClient(api_key=api_key)
    
    print("📡 Obteniendo datos solares de los últimos 7 días...")
    data = await client.get_all_events(days_back=7)
    
    print(f"✅ Tormentas CME: {len(data['cme'])}")
    print(f"✅ Llamaradas solares: {len(data['flares'])}")
    print(f"✅ Tormentas geomagnéticas: {len(data['storms'])}")

    print("\n💾 Guardando datos en MinIO (Data Lake)...")
    minio_client = MinIOStorage(
        endpoint="localhost:9000",
        access_key=os.getenv("MINIO_ACCESS_KEY", "minioadmin"),
        secret_key=os.getenv("MINIO_SECRET_KEY", "minioadmin123secure")
    )
    
    now = datetime.utcnow()
    # Path estructurado: donki/YYYY/MM/DD/HHMMSS.json
    path = f"donki/{now.strftime('%Y/%m/%d/%H%M%S')}.json"
    
    minio_client.put_json("space-pulse-raw", path, data)
    print(f"✅ Datos guardados con éxito en s3://space-pulse-raw/{path}")
    print("🔍 Abre http://localhost:9001 para comprobarlo en la interfaz web de MinIO.")

if __name__ == "__main__":
    asyncio.run(main())