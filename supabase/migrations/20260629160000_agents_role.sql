ALTER TABLE agents ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'agent';

-- All existing agents become admin so nobody gets locked out
UPDATE agents SET role = 'admin' WHERE role = 'agent';
