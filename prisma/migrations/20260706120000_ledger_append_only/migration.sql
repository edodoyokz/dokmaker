-- Enforce append-only semantics on the wallet ledger at the database level.
--
-- The application never updates or deletes ledger rows (every entry is inserted
-- once with status 'success' and never mutated). This trigger makes that
-- invariant tamper-evident: any UPDATE or DELETE against wallet_ledger_entries
-- is rejected, so a future code regression or accidental direct DB write cannot
-- silently rewrite financial history.

CREATE OR REPLACE FUNCTION wallet_ledger_block_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'wallet_ledger_entries is append-only: % is not permitted', TG_OP
    USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS wallet_ledger_no_update ON "wallet_ledger_entries";
CREATE TRIGGER wallet_ledger_no_update
  BEFORE UPDATE OR DELETE ON "wallet_ledger_entries"
  FOR EACH ROW EXECUTE FUNCTION wallet_ledger_block_mutation();
