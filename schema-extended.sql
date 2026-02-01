CREATE TABLE IF NOT EXISTS blocked_ips (
    id SERIAL PRIMARY KEY,
    ip_address VARCHAR(45) UNIQUE NOT NULL,
    threat_score INTEGER,
    reason TEXT,
    blocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    blocked_until TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);


CREATE TABLE IF NOT EXISTS security_tickets (
    id SERIAL PRIMARY KEY,
    ticket_number VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(255),
    description TEXT,
    status VARCHAR(50) DEFAULT 'open',
    priority VARCHAR(50),
    category VARCHAR(100),
    source_ip VARCHAR(45),
    threat_score INTEGER,
    assigned_to VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    alert_reference JSONB
);

CREATE INDEX idx_blocked_ips_active ON blocked_ips(is_active);
CREATE INDEX idx_blocked_ips_until ON blocked_ips(blocked_until);
CREATE INDEX idx_tickets_status ON security_tickets(status);
CREATE INDEX idx_tickets_priority ON security_tickets(priority);