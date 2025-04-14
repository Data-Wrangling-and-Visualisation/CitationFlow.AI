#!/bin/sh

host="$1"
port="$2"
shift 2

echo "Waiting for $host:$port..."

echo "$host:$port is available, starting..."
exec "$@"
