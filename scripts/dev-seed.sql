-- Fixed UUIDs for the default dev business seed.
-- business_id=11111111-1111-4111-8111-111111111111
-- owner_membership_id=22222222-2222-4222-8222-222222222222
-- manager_membership_id=33333333-3333-4333-8333-333333333333
-- staff_one_membership_id=44444444-4444-4444-8444-444444444444
-- staff_two_membership_id=55555555-5555-4555-8555-555555555555
-- owner_user_id=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa
-- manager_user_id=bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb
-- staff_one_user_id=cccccccc-cccc-4ccc-8ccc-cccccccccccc
-- staff_two_user_id=dddddddd-dddd-4ddd-8ddd-dddddddddddd
-- business_name=Demo Market

INSERT INTO businesses (id, name, "isSolo", "createdAt", "updatedAt")
VALUES ('11111111-1111-4111-8111-111111111111', 'Demo Market', false, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id, email, "passwordHash", "fullName", phone, provider, "createdAt", "updatedAt")
VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'owner@example.test', NULL, 'Dev Owner', '+96170000001', 'LOCAL', NOW(), NOW()),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'manager@example.test', NULL, 'Dev Manager', '+96170000002', 'LOCAL', NOW(), NOW()),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'staff1@example.test', NULL, 'Staff One', '+96170000003', 'LOCAL', NOW(), NOW()),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'staff2@example.test', NULL, 'Staff Two', '+96170000004', 'LOCAL', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO memberships (id, "userId", "businessId", role, "isActive", "joinedAt", "deactivatedAt")
VALUES
  ('22222222-2222-4222-8222-222222222222', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', 'OWNER', true, NOW(), NULL),
  ('33333333-3333-4333-8333-333333333333', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '11111111-1111-4111-8111-111111111111', 'MANAGER', true, NOW(), NULL),
  ('44444444-4444-4444-8444-444444444444', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', '11111111-1111-4111-8111-111111111111', 'STAFF', true, NOW(), NULL),
  ('55555555-5555-4555-8555-555555555555', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', '11111111-1111-4111-8111-111111111111', 'STAFF', true, NOW(), NULL)
ON CONFLICT (id) DO NOTHING;

-- Solo-business variant (commented):
-- INSERT INTO businesses ...
-- INSERT INTO users ...
-- INSERT INTO memberships ...
