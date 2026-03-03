# ingestion/clients/base_client.py
import httpx
import asyncio
import logging
from typing import Any, Dict, Optional
from datetime import datetime, timedelta

# Configuración básica de logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

class NASABaseClient:
    """
    Cliente HTTP base para todas las APIs de NASA.
    Features:
    - Retry automático con backoff exponencial
    - Rate limiting handling
    - Logging estructurado
    """
    
    BASE_URL = "https://api.nasa.gov"
    
    def __init__(self, api_key: str, max_retries: int = 3, timeout: int = 30):
        self.api_key = api_key
        self.max_retries = max_retries
        self.timeout = timeout
        self.logger = logging.getLogger(self.__class__.__name__)
        
    async def get(
        self, 
        endpoint: str, 
        params: Optional[Dict] = None,
        base_url: Optional[str] = None
    ) -> Any:
        url = f"{base_url or self.BASE_URL}{endpoint}"
        params = params or {}
        params["api_key"] = self.api_key
        
        for attempt in range(self.max_retries):
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    response = await client.get(url, params=params)
                    
                    if response.status_code == 429:  # Rate limit
                        wait_time = 2 ** attempt * 60
                        self.logger.warning(f"Rate limit hit, waiting {wait_time}s")
                        await asyncio.sleep(wait_time)
                        continue
                    
                    response.raise_for_status()
                    return response.json()
                    
            except httpx.TimeoutException:
                if attempt == self.max_retries - 1:
                    self.logger.error(f"Timeout on {url} after {self.max_retries} attempts.")
                    raise
                await asyncio.sleep(2 ** attempt)
            except httpx.HTTPStatusError as e:
                self.logger.error(f"HTTP Error {e.response.status_code} for {url}: {e.response.text}")
                raise
        
        raise Exception(f"Failed after {self.max_retries} attempts: {url}")
    
    def _format_date(self, date: datetime) -> str:
        return date.strftime("%Y-%m-%d")