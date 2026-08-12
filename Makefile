# =============================================================================
# DevSpace — manage container via /srv/docker/compose/dev-spaces.yml
# =============================================================================
# Prasyarat: Docker + compose plugin, network eksternal sudah dibuat
# (db-network, dokploy-network, portainer_default).
# =============================================================================

COMPOSE_DIR  := /srv/docker/compose
COMPOSE_FILE := $(COMPOSE_DIR)/dev-spaces.yml
ENV_FILE     := $(COMPOSE_DIR)/.env.dev-spaces
PROJECT      := dev-spaces
SERVICE      := app
CONTAINER    := dev-spaces-app

DC := docker compose -p $(PROJECT) --env-file $(ENV_FILE) -f $(COMPOSE_FILE)

.DEFAULT_GOAL := help
.PHONY: help build up down restart update logs logs-f ps status shell exec health clean prune

help: ## Tampilkan daftar perintah
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

build: ## Build image tanpa start
	$(DC) build

up: ## Start container (build bila image belum ada)
	$(DC) up -d

down: ## Stop dan hapus container
	$(DC) down

restart: ## Restart container
	$(DC) restart $(SERVICE)

update: ## Pull kode terbaru, rebuild, dan restart (zero-downtime semampunya)
	git pull --ff-only
	$(DC) up -d --build --remove-orphans
	$(MAKE) health

logs: ## Lihat log terakhir (100 baris)
	$(DC) logs --tail=100 $(SERVICE)

logs-f: ## Follow log realtime
	$(DC) logs -f --tail=50 $(SERVICE)

ps status: ## Status container
	$(DC) ps

shell: ## Masuk shell container (sh — image Alpine)
	docker exec -it $(CONTAINER) sh

exec: ## Jalankan perintah di container: make exec CMD="pnpm drizzle-kit migrate"
	docker exec -it $(CONTAINER) $(CMD)

health: ## Cek HTTP lokal container
	@curl -sf -o /dev/null -w "HTTP %{http_code} — %{url_effective}\n" \
		"http://127.0.0.1:$$(grep -E '^APP_PORT=' $(ENV_FILE) | cut -d= -f2 || echo 3200)/" \
		|| (echo "HEALTH CHECK GAGAL" && exit 1)

clean: ## Hapus image lama (dangling) milik project ini
	docker image prune -f --filter "label=com.docker.compose.project=$(PROJECT)"

prune: ## Hapus SEMUA resource project (container + image). Tidak menyentuh volume eksternal.
	$(DC) down --rmi local --remove-orphans
