FROM python:3.11-slim

RUN pip install --no-cache-dir dbt-clickhouse==1.7.2

WORKDIR /dbt

ENTRYPOINT ["dbt"]
