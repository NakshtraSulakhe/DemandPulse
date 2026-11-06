-- ==============================================================================
-- DEMANDPULSE SERVER CREDENTIAL MANAGEMENT SQL QUERIES
-- Run these queries directly in MySQL Console, phpMyAdmin, or your database management tool.
-- Database: u449458970_demandpulse
-- 
-- Password Hashing Rule:
-- Passwords are encrypted using salted SHA-256 with the application salt:
-- CONCAT('sha256:', SHA2(CONCAT('df_salt_2026_pulse:', '<YOUR_CHOSEN_PASSWORD>'), 256))
-- ==============================================================================


-- ------------------------------------------------------------------------------
-- 1. CREATE OR UPDATE AN ADMINISTRATOR USER (ALL ACCESS)
-- Default initial password: DemandFlow2026! (or replace with your own password)
-- ------------------------------------------------------------------------------
INSERT INTO `slide_app_users` (
  `id`, 
  `email`, 
  `username`, 
  `password_hash`, 
  `display_name`, 
  `role`, 
  `is_active`, 
  `created_at`, 
  `updated_at`
) VALUES (
  'usr-admin-master',
  'admin@demandflow.io',
  'admin',
  CONCAT('sha256:', SHA2(CONCAT('df_salt_2026_pulse:', 'DemandFlow2026!'), 256)),
  'System Administrator',
  'admin',
  1,
  NOW(),
  NOW()
)
ON DUPLICATE KEY UPDATE
  `password_hash` = VALUES(`password_hash`),
  `display_name`  = VALUES(`display_name`),
  `role`          = 'admin',
  `is_active`     = 1,
  `updated_at`    = NOW();


-- ------------------------------------------------------------------------------
-- 2. CREATE OR UPDATE AN OPERATIONS USER (RESTRICTED ACCESS)
-- Default initial password: OpsFlow2026! (or replace with your own password)
-- Operations users ONLY have access to:
--   - Campaign Targets (/admin/campaign-targets)
--   - Target History (/admin/target-history)
--   - US Shift Management (/admin/shifts)
--   - Display Settings (/admin/presentation-settings)
-- ------------------------------------------------------------------------------
INSERT INTO `slide_app_users` (
  `id`, 
  `email`, 
  `username`, 
  `password_hash`, 
  `display_name`, 
  `role`, 
  `is_active`, 
  `created_at`, 
  `updated_at`
) VALUES (
  'usr-ops-lead',
  'ops@demandflow.io',
  'operations',
  CONCAT('sha256:', SHA2(CONCAT('df_salt_2026_pulse:', 'OpsFlow2026!'), 256)),
  'Operations Lead',
  'operations',
  1,
  NOW(),
  NOW()
)
ON DUPLICATE KEY UPDATE
  `password_hash` = VALUES(`password_hash`),
  `display_name`  = VALUES(`display_name`),
  `role`          = 'operations',
  `is_active`     = 1,
  `updated_at`    = NOW();


-- ------------------------------------------------------------------------------
-- 3. RESET / CHANGE PASSWORD FOR AN EXISTING USER ON SERVER
-- Simply replace 'NEW_PASSWORD_HERE' and 'admin' with the username/email
-- ------------------------------------------------------------------------------
UPDATE `slide_app_users`
SET 
  `password_hash` = CONCAT('sha256:', SHA2(CONCAT('df_salt_2026_pulse:', 'NEW_PASSWORD_HERE'), 256)),
  `updated_at`    = NOW()
WHERE `username` = 'admin' OR `email` = 'admin@demandflow.io';


-- ------------------------------------------------------------------------------
-- 4. CREATE A CUSTOM OPERATIONS OR ADMIN USER
-- Role options: 'admin' OR 'operations'
-- ------------------------------------------------------------------------------
INSERT INTO `slide_app_users` (
  `id`, 
  `email`, 
  `username`, 
  `password_hash`, 
  `display_name`, 
  `role`, 
  `is_active`, 
  `created_at`, 
  `updated_at`
) VALUES (
  CONCAT('usr-', SUBSTRING(MD5(RAND()), 1, 12)),
  'john.doe@demandflow.io',
  'johndoe',
  CONCAT('sha256:', SHA2(CONCAT('df_salt_2026_pulse:', 'JohnSecurePass2026!'), 256)),
  'John Doe',
  'operations', -- Or 'admin'
  1,
  NOW(),
  NOW()
);


-- ------------------------------------------------------------------------------
-- 5. DEACTIVATE (SUSPEND) OR REACTIVATE A USER
-- ------------------------------------------------------------------------------
-- Deactivate:
UPDATE `slide_app_users` SET `is_active` = 0, `updated_at` = NOW() WHERE `username` = 'johndoe';

-- Reactivate:
UPDATE `slide_app_users` SET `is_active` = 1, `updated_at` = NOW() WHERE `username` = 'johndoe';


-- ------------------------------------------------------------------------------
-- 6. VERIFY ALL ACTIVE USERS & ROLES IN DATABASE
-- ------------------------------------------------------------------------------
SELECT 
  `id`, 
  `email`, 
  `username`, 
  `display_name`, 
  `role`, 
  `is_active`, 
  `created_at`, 
  `updated_at` 
FROM `slide_app_users` 
ORDER BY `role` ASC, `created_at` ASC;

