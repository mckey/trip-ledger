# Changelog

All notable changes to trip-ledger are documented in this file.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.3.0] - 2026-08-19

### Added

- Expenses CRUD vertical slice with domain rules for expense management in trips
- Trips CRUD vertical slice with migrations, use cases, PostgreSQL/InMemory repositories, HTTP API, and comprehensive tests

## [0.2.0] - 2026-08-19

### Added

- FinishTrip use case with finished-trip domain rule

### Changed

- Money value object unit tests
- vitest and TypeScript toolchain setup with /hello and /scaffold-usecase commands
- Changelog and release-notes pipeline setup

## [0.1.0] - 2026-08-19

### Added

- Initial Clean Architecture scaffold: bounded contexts trips and expenses, six base project files
