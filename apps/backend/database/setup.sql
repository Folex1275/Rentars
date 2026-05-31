-- Rentars Database Setup
-- Runs all migrations in order to initialize the database schema

\i 00001_initial_schema.sql
\i 00002_add_booking_blockchain_fields.sql
\i 00003_triggers.sql
\i 00004_create_wallet_auth_tables.sql
\i 00005_create_profile_table.sql
\i 00006_add_atomic_functions.sql
\i 00007_add_payment_constraints.sql
\i 00008_create_blockchain_logs.sql
