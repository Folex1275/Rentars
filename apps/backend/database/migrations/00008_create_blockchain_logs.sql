-- Create blockchain_logs table for audit trails
-- Tracks all blockchain operations for debugging and auditing

CREATE TABLE IF NOT EXISTS blockchain_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation VARCHAR(100) NOT NULL,
  input_json JSONB,
  result_json JSONB,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_blockchain_logs_operation ON blockchain_logs(operation);
CREATE INDEX idx_blockchain_logs_created_at ON blockchain_logs(created_at);
