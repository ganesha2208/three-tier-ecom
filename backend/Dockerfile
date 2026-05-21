# ---- Stage 1: builder — install Python deps into an isolated venv ----
FROM python:3.12-slim AS builder

# All deps ship prebuilt wheels (psycopg2-binary, pydantic-core, bcrypt,
# cryptography, uvloop), so no compiler or libpq-dev is needed here.
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt


# ---- Stage 2: runtime — slim image, non-root, no build tooling ----
FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/opt/venv/bin:$PATH"

# Run as a dedicated non-root user — never root inside the container.
RUN useradd --create-home --uid 1000 appuser

WORKDIR /app

# Copy only the finished venv from the builder: no pip cache, no apt tools.
COPY --from=builder /opt/venv /opt/venv

# Copy the application code.
COPY . .

# Media upload dir, owned by the non-root user.
RUN mkdir -p /app/media && chown -R appuser:appuser /app

USER appuser

EXPOSE 8000

# Liveness check using the Python stdlib — keeps curl out of the image.
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
