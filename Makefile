.PHONY: dev build test lint migrate

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
