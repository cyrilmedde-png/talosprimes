-- ═══════════════════════════════════════════════════
-- Agent Téléphonique IA — Table call_logs
-- ═══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS call_logs (
    id SERIAL PRIMARY KEY,
    call_sid VARCHAR(64) UNIQUE NOT NULL,
    caller_phone VARCHAR(20),
    called_number VARCHAR(20),
    duration INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'initiated',

    -- Données conversation
    conversation_log JSONB DEFAULT '[]'::jsonb,
    transcript TEXT,

    -- Qualification
    caller_name VARCHAR(100),
    caller_email VARCHAR(255),
    caller_address TEXT,
    urgency_level VARCHAR(20) DEFAULT 'STANDARD'
        CHECK (urgency_level IN ('CRITIQUE', 'URGENT', 'STANDARD', 'INFO')),
    action_taken VARCHAR(50)
        CHECK (action_taken IN ('RDV', 'DISPATCH', 'DEVIS', 'TRANSFERT', 'INFO', NULL)),
    sentiment VARCHAR(20) DEFAULT 'NEUTRE'
        CHECK (sentiment IN ('POSITIF', 'NEUTRE', 'FRUSTRE', 'EN_DETRESSE')),

    -- Liens
    lead_id INTEGER,
    appointment_date TIMESTAMP,

    -- Métadonnées
    niche VARCHAR(50),
    notes TEXT,
    follow_up_required BOOLEAN DEFAULT false,
    follow_up_done BOOLEAN DEFAULT false,
    sms_sent BOOLEAN DEFAULT false,

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_call_logs_caller ON call_logs(caller_phone);
CREATE INDEX IF NOT EXISTS idx_call_logs_created ON call_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_call_logs_status ON call_logs(status);
CREATE INDEX IF NOT EXISTS idx_call_logs_urgency ON call_logs(urgency_level);
CREATE INDEX IF NOT EXISTS idx_call_logs_follow_up ON call_logs(follow_up_required) WHERE follow_up_required = true AND follow_up_done = false;
CREATE INDEX IF NOT EXISTS idx_call_logs_niche ON call_logs(niche);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_call_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_call_logs_updated_at ON call_logs;
CREATE TRIGGER trigger_call_logs_updated_at
    BEFORE UPDATE ON call_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_call_logs_updated_at();

-- Vue pour le dashboard
CREATE OR REPLACE VIEW call_stats AS
SELECT
    DATE(created_at) as date,
    COUNT(*) as total_calls,
    COUNT(*) FILTER (WHERE urgency_level = 'CRITIQUE') as urgent_calls,
    COUNT(*) FILTER (WHERE action_taken = 'RDV') as rdv_pris,
    COUNT(*) FILTER (WHERE action_taken = 'DISPATCH') as dispatches,
    AVG(duration) as avg_duration_sec,
    COUNT(*) FILTER (WHERE sentiment = 'POSITIF') as positive,
    COUNT(*) FILTER (WHERE sentiment = 'FRUSTRE' OR sentiment = 'EN_DETRESSE') as negative,
    COUNT(*) FILTER (WHERE follow_up_required = true AND follow_up_done = false) as pending_followups
FROM call_logs
WHERE status = 'completed'
GROUP BY DATE(created_at)
ORDER BY date DESC;
