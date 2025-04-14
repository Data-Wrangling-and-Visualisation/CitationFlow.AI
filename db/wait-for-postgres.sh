#!/bin/sh

host="$1"
port="$2"
shift 2

echo "Waiting for $host:$port..."

# Loop until Postgres is fully ready (not just port open)
until PGPASSWORD=$POSTGRES_PASSWORD psql -h "$host" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -p "$port" -c '\q' 2>/dev/null; do
  echo "Postgres is still initializing, retrying in 2 seconds..."
  sleep 2
done

echo "$host:$port is available, starting..."
exec "$@"
