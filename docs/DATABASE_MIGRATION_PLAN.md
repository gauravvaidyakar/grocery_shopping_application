# Database migration plan

## Implemented code migration

The NestJS application uses Mongoose and `MongoDatabaseService`; active application code no longer imports Prisma. Domain services retain their HTTP contracts while repository delegates translate filters, relations, writes, aggregates, and sessions to MongoDB operations. MongoDB setup and seed scripts replace Prisma deployment and seed commands.

## Legacy production data

No PostgreSQL data has been copied. Before any separately approved data migration, inventory every legacy table, define table-to-collection mappings, preserve old IDs in an explicit legacy identifier field, normalize money and dates, define duplicate resolution, and dry-run into an isolated database.

Required migration order is identities, profiles/vendors, catalogue, inventory, carts/quotes, orders/items, payments/shipments, commissions/ledger/settlements, after-sales records, notifications/configuration, and audit data. Validate counts, unique keys, referential integrity, financial totals, order status histories, and sampled API responses. A failed validation must discard only the isolated import target and leave PostgreSQL unchanged.

Production import remains blocked until explicit approval.
