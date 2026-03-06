FROM python:3.11-slim

WORKDIR /app

RUN pip install --no-cache-dir \
    fastapi==0.110.0 \
    uvicorn[standard]==0.27.1 \
    clickhouse-connect==0.7.0

COPY api/ /app/api/

EXPOSE 8000

CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
