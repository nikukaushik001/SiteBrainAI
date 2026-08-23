#!/bin/bash

echo "Starting BrainDesk AI Deployment..."

# Check if docker is installed
if ! command -v docker &> /dev/null
then
    echo "Docker could not be found. Please install docker and docker-compose first."
    exit 1
fi

# Make sure we have a .env file with the GROQ_API_KEY
if [ ! -f .env ]; then
    echo "Creating a .env file... Please edit it and add your GROQ_API_KEY before running this script again."
    echo "GROQ_API_KEY=your_key_here" > .env
    exit 1
fi

echo "Building and starting containers..."
docker-compose --env-file .env up -d --build

echo "Deployment complete! BrainDesk AI is now running."
echo "Frontend: http://localhost"
echo "Backend API: http://localhost/api"
