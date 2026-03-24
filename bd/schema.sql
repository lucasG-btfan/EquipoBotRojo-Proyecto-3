/* -- Crear base de datos
CREATE DATABASE security_monitoring;

\c security_monitoring
*/ /* ESTO LO CREA AUTOMATICAMENTE DOCKER, PONERLO SERIA UN ERROR*/
-- Tabla de alertas
CREATE TABLE alerts (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    severity VARCHAR(20) NOT NULL, -- low, medium, high, critical
    category VARCHAR(50) NOT NULL, -- auth_failure, brute_force, anomaly, etc.
    source_host VARCHAR(255),
    source_ip INET,
    target_host VARCHAR(255),
    event_count INTEGER DEFAULT 1,
    description TEXT,
    raw_log TEXT,
    status VARCHAR(20) DEFAULT 'new', -- new, investigating, resolved, false_positive
    assigned_to VARCHAR(100),
    notes TEXT,
    resolved_at TIMESTAMP,
    risk_score INTEGER,
    risk_level VARCHAR(20),
    threat_reputation VARCHAR(50)
);

-- Tabla de patrones de ataque detectados
CREATE TABLE attack_patterns (
    id SERIAL PRIMARY KEY,
    pattern_type VARCHAR(50) NOT NULL,
    source_ip INET NOT NULL,
    target_host VARCHAR(255),
    first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    occurrence_count INTEGER DEFAULT 1,
    is_blocked BOOLEAN DEFAULT false
);

-- Tabla de métricas de sistema
CREATE TABLE system_metrics (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    hostname VARCHAR(255) NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    metric_value NUMERIC,
    unit VARCHAR(20)
);

-- Tabla de reglas de detección
CREATE TABLE detection_rules (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    pattern TEXT NOT NULL, -- Expresión regular o patrón
    severity VARCHAR(20) NOT NULL,
    threshold INTEGER DEFAULT 1, -- Número de ocurrencias para activar alerta
    time_window INTEGER DEFAULT 300, -- Ventana de tiempo en segundos
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar reglas de detección predefinidas
INSERT INTO detection_rules (name, description, pattern, severity, threshold, time_window) VALUES
('SSH Brute Force', 'Detecta múltiples intentos fallidos de SSH', 'Failed password.*ssh', 'high', 5, 300),
('Sudo Abuse', 'Detecta uso sospechoso de sudo', 'sudo.*COMMAND=.*', 'medium', 10, 600),
('Port Scan Detection', 'Detecta posibles escaneos de puertos', 'iptables.*DROP.*DPT', 'medium', 20, 60),
('Root Login Attempt', 'Detecta intentos de login como root', 'Failed password for root', 'critical', 1, 1),
('SQL Injection Pattern', 'Detecta patrones de inyección SQL en logs web', '(union.*select|drop.*table)', 'high', 1, 1);

-- Índices para mejorar rendimiento
CREATE INDEX idx_alerts_timestamp ON alerts(timestamp);
CREATE INDEX idx_alerts_severity ON alerts(severity);
CREATE INDEX idx_alerts_source_ip ON alerts(source_ip);
CREATE INDEX idx_alerts_status ON alerts(status);
CREATE INDEX idx_attack_patterns_ip ON attack_patterns(source_ip);
CREATE INDEX idx_attack_patterns_last_seen ON attack_patterns(last_seen);
CREATE INDEX idx_system_metrics_hostname ON system_metrics(hostname, timestamp);