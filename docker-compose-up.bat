cd slp/infranstructure

docker compose down --remove-orphans

docker compose up -d --build

docker compose ps

cd ../../