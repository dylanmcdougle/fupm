-- users: whoever connects their gmail
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    gmail_access_token TEXT,
    gmail_refresh_token TEXT,
    token_expires_in INT,
    token_refreshed_at TIMESTAMPTZ,
    gmail_label_id TEXT,
    followup_action TEXT DEFAULT 'draft', -- draft, send
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- requests: the invoice/payment you're chasing
CREATE TABLE requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    recipient_email TEXT NOT NULL,
    recipient_name TEXT,
    subject TEXT,
    amount DECIMAL(10,2),
    original_email_id TEXT,
    thread_id TEXT,
    status TEXT DEFAULT 'active', -- active, closed, cancelled
    followup_interval INT DEFAULT 7, -- days between followups
    context TEXT, -- background info for AI to craft the message
    tone TEXT DEFAULT 'professional', -- professional, friendly, firm, aggressive
    initial_request_at TIMESTAMPTZ, -- when the original invoice/request was sent
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- followups: each nag sent
CREATE TABLE followups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID REFERENCES requests(id) ON DELETE CASCADE,
    email_id TEXT,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    followup_number INT
);