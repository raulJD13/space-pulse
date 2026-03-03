# ingestion/minio_storage.py
from minio import Minio
from minio.error import S3Error
import json
import io

class MinIOStorage:
    def __init__(self, endpoint: str, access_key: str, secret_key: str):
        self.client = Minio(
            endpoint,
            access_key=access_key,
            secret_key=secret_key,
            secure=False  # True en producción si usáramos HTTPS
        )
    
    def put_json(self, bucket: str, path: str, data: dict | list) -> bool:
        """Guarda JSON en MinIO. Crea bucket si no existe."""
        try:
            if not self.client.bucket_exists(bucket):
                self.client.make_bucket(bucket)
            
            # Convertimos el diccionario a bytes para subirlo
            json_bytes = json.dumps(data, ensure_ascii=False, default=str).encode("utf-8")
            self.client.put_object(
                bucket, path, 
                io.BytesIO(json_bytes), 
                len(json_bytes),
                content_type="application/json"
            )
            return True
        except S3Error as e:
            raise RuntimeError(f"MinIO error: {e}")
    
    def get_json(self, bucket: str, path: str) -> dict | list:
        """Lee y parsea JSON desde MinIO."""
        response = self.client.get_object(bucket, path)
        return json.loads(response.read().decode("utf-8"))
    
    def list_objects(self, bucket: str, prefix: str) -> list[str]:
        """Lista objetos bajo un prefijo (como ls en bash)."""
        return [obj.object_name for obj in self.client.list_objects(bucket, prefix=prefix, recursive=True)]