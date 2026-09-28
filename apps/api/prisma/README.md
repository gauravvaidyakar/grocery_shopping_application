# Legacy database reference

This directory is retained only as a read-only description of the former
PostgreSQL/Prisma implementation and its historical SQL migrations. It is not
used by package scripts, builds, application startup, MongoDB setup, or seeding.

Do not run these migrations against production PostgreSQL or MongoDB. The active
MongoDB schemas and indexes are declared in
`apps/api/src/database/mongo.schemas.ts`.
