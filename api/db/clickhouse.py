# api/db/clickhouse.py
import clickhouse_connect
import os
from typing import Any


def get_client():
    """Crea y retorna un cliente de ClickHouse."""
    return clickhouse_connect.get_client(
        host=os.getenv("CLICKHOUSE_HOST", "localhost"),
        port=int(os.getenv("CLICKHOUSE_PORT", "8123")),
        username=os.getenv("CLICKHOUSE_USER", "default"),
        password=os.getenv("CLICKHOUSE_PASSWORD", ""),
    )


def execute_query(query: str, single_row: bool = False) -> Any:
    """
    Ejecuta una query SELECT y retorna resultado como lista de dicts.
    Si single_row=True, retorna un solo dict.
    Retorna vacío si la tabla no existe o hay error de conexión.
    """
    try:
        client = get_client()
        result = client.query(query)

        rows = []
        for row in result.result_rows:
            rows.append(dict(zip(result.column_names, row)))

        if single_row:
            return rows[0] if rows else {}
        return rows
    except Exception:
        return {} if single_row else []
