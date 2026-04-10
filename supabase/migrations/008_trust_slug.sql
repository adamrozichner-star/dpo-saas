-- Trust page: public slug and toggle for organizations
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS public_slug TEXT UNIQUE;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS trust_page_enabled BOOLEAN DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_orgs_public_slug ON organizations(public_slug);
