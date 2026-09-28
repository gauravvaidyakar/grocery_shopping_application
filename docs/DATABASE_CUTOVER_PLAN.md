# Database cutover plan

1. Run lint, typecheck, unit tests, MongoDB replica-set integration tests, and all production builds.
2. Apply indexes and idempotent seed data only to the dedicated `grocery_web_application` Atlas database.
3. Deploy `render.mongo-candidate.yaml` as a separate candidate service with the dedicated database user and restricted Atlas network access.
4. Test customer, vendor, admin, payment, shipping, notification, return, refund, replacement, commission, and settlement flows against candidate-only data.
5. Complete provider sandbox/webhook verification and a production-readiness review.
6. Obtain explicit owner approval for any data migration and for traffic cutover as separate decisions.
7. At an approved maintenance window, freeze legacy writes, perform the separately approved import, reconcile counts and financial totals, switch backend traffic, and run smoke tests.
8. Roll back traffic to the unchanged PostgreSQL-backed deployment if validation fails. Never delete or mutate the legacy PostgreSQL database during rollback.

Current status: no production cutover, no PostgreSQL data migration, and no production database modification.

## Verified cloud state (2026-09-29)

- The live Render service `vishwaneed-api` still uses only `DATABASE_URL` and
  points to the legacy `vishwaneed` PostgreSQL database. It has no MongoDB
  runtime variables.
- Atlas project `grocery_web_application` contains the free
  `grocery-web-application` cluster with no application data yet.
- Atlas user `gauravvaidyakar_db_user` has `atlasAdmin @ admin`.
- Atlas user `grocery_web_application` has `readWriteAnyDatabase @ admin`.
  Before candidate use, narrow this to `readWrite` on only
  `grocery_web_application` after the owner confirms the permission change.
- Atlas currently allows only the owner's local `/32` address. Render free
  services do not have a stable outbound IP, so a candidate cannot connect
  until the owner approves an Atlas network-access rule (or chooses a hosting
  option with stable egress).
- The existing database-user password cannot be recovered from Atlas. The owner
  must supply the existing value directly to Render or explicitly authorize and
  personally complete a credential reset; the application never logs it.
