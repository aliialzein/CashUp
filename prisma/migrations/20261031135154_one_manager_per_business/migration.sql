-- This is an empty migration.
CREATE UNIQUE INDEX one_active_manager_per_business
ON memberships ("businessId")
WHERE role = 'MANAGER' AND "isActive" = true;