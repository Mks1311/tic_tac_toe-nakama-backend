#!/bin/sh
set -e

# DATABASE_PUBLIC_URL must be set in Render environment variables
# Format: postgresql://user:pass@host:port/dbname
# Nakama expects: postgres://user:pass@host:port/dbname (same thing)

echo "Running database migrations..."
/nakama/nakama migrate up --database.address "$DATABASE_PUBLIC_URL"

echo "Starting Nakama..."
exec /nakama/nakama \
  --config /nakama/data/local.yml \
  --database.address "$DATABASE_PUBLIC_URL" \
  --socket.port ${PORT}
