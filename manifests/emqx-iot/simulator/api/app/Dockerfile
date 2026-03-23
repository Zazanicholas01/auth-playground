FROM python:3.12-slim

WORKDIR /service

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV DB_BOOTSTRAP_SQL_DIR=/service/app/sql
ENV PATH="/service/app/.venv/bin:$PATH"

RUN pip install --no-cache-dir uv

COPY . /service/app

WORKDIR /service/app
RUN uv sync --frozen --no-dev

WORKDIR /service
EXPOSE 8080

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
