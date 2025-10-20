#!/bin/bash

# Test Queue and Event Bus
# This script runs the queue test

echo "========================================"
echo "  Queue & Event Bus Test"
echo "========================================"
echo ""

# Check if Redis is running
echo "Checking Redis connection..."
if docker ps | grep -q kyc-adapter-redis; then
    echo "✅ Redis container is running"
else
    echo "❌ Redis container is not running"
    echo "Starting Redis..."
    docker-compose up -d redis
    sleep 2
fi

echo ""
echo "Running tests..."
echo ""

# Run the test script
npx ts-node -r tsconfig-paths/register src/queue/test-queue-and-events.ts

echo ""
echo "========================================"

