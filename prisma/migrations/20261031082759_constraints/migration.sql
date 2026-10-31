-- one OWNER per business (v1)
CREATE UNIQUE INDEX one_owner_per_business ON memberships ("businessId") WHERE role = 'OWNER';

-- a join code can never grant OWNER
ALTER TABLE join_codes ADD CONSTRAINT join_code_not_owner CHECK (role <> 'OWNER');

-- one OPEN cash-up per person per business
CREATE UNIQUE INDEX one_open_cashup_per_member ON cash_ups ("membershipId") WHERE status = 'OPEN';

-- one awaiting request per target
CREATE UNIQUE INDEX one_open_request_per_sale ON requests ("saleId")
  WHERE status = 'AWAITING_OWNER' AND "saleId" IS NOT NULL;
CREATE UNIQUE INDEX one_open_request_per_cashup ON requests ("cashUpId")
  WHERE status = 'AWAITING_OWNER' AND type = 'VOID_CASHUP';

-- money sanity
ALTER TABLE sales ADD CONSTRAINT sales_non_negative CHECK (
  "businessAmount" >= 0 AND "deliveryFee" >= 0 AND "totalCollected" >= 0
  AND COALESCE(tip, 0) >= 0 AND COALESCE(discount, 0) >= 0 AND COALESCE("changeGiven", 0) >= 0);
ALTER TABLE cash_outs ADD CONSTRAINT cash_outs_positive CHECK (amount > 0);
ALTER TABLE count_entries ADD CONSTRAINT count_quantity_non_negative CHECK (quantity >= 0);

-- audit log is append-only
CREATE OR REPLACE FUNCTION audit_log_immutable() RETURNS trigger AS $$
BEGIN RAISE EXCEPTION 'audit_logs is append-only'; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER audit_logs_no_update BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION audit_log_immutable();