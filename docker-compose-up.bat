# Navigate to infrastructure directory
cd slp/infranstructure

# Stop and remove everything including volumes, orphans, and images
docker compose down -v --remove-orphans

# Pull latest images and rebuild if needed
docker compose up -d --build

# Check if everything is running properly
docker compose ps

# View logs to verify startup
docker compose logs

# Go back
cd ../../