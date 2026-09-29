.PHONY: dev build test lint migrate gate install-hooks

dev:
	npx ts-node-dev --respawn src/presentation/server.ts

build:
	npx tsc -p tsconfig.json

test:
	npx vitest run

lint:
	npx eslint src && npx tsc --noEmit

migrate:
	npx node-pg-migrate up

# Детермінований гейт (урок 7.6): той самий набір, що ганяє scripts/hooks/pre-commit.
gate:
	./node_modules/.bin/tsc --noEmit && npx vitest run

install-hooks:
	git config core.hooksPath scripts/hooks
