cd slp/infranstructure

docker compose down -v --remove-orphans

docker compose up -d --build

docker compose ps

docker compose logs

cd ../../