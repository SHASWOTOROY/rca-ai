-- Database: rca_db
-- User: rca_user
-- Password: secure_password
-- Note: PostgreSQL should be configured to run on port 5433 to avoid conflicts with XAMPP

CREATE DATABASE rca_db;
CREATE USER rca_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE rca_db TO rca_user;

-- Connect to rca_db and run:
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE analyses (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    log_content TEXT,
    error_code VARCHAR(255),
    ai_analysis JSONB,
    solutions JSONB,
    report_content TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    session_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL
);