-- Stored audits (public results)
CREATE TABLE audits (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  public_slug   TEXT UNIQUE NOT NULL,
  audit_result  JSONB NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Leads (private — never exposed in public URLs)
CREATE TABLE leads (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id              UUID REFERENCES audits(id),
  email                 TEXT NOT NULL,
  company_name          TEXT,
  role                  TEXT,
  team_size             INT,
  total_monthly_savings NUMERIC,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Rate limiting
CREATE TABLE rate_limits (
  ip_hash      TEXT PRIMARY KEY,
  audit_count  INT DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_audits_slug ON audits(public_slug);
CREATE INDEX idx_leads_audit ON leads(audit_id);
CREATE INDEX idx_leads_savings ON leads(total_monthly_savings DESC);

-- RLS
ALTER TABLE audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audits_public_read" ON audits FOR SELECT USING (true);
CREATE POLICY "audits_service_write" ON audits FOR INSERT WITH CHECK (false);
CREATE POLICY "leads_service_only" ON leads FOR ALL USING (false);
