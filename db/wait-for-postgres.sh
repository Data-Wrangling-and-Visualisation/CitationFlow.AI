#!/bin/sh
set -e

host="$1"
port="$2"
shift 2

echo "Waiting for $host:$port..."

until nc -z "$host" "$port"; do
  >&2 echo "Postgres is unavailable - sleeping"
  sleep 1
done

echo "$host:$port is available, starting..."
exec "$@"
