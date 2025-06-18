-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('user', 'expert', 'admin')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Experts table
CREATE TABLE IF NOT EXISTS experts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    specialties TEXT[] NOT NULL,
    experience_years INTEGER DEFAULT 0,
    rating DECIMAL(3,2) DEFAULT 0.00,
    total_ratings INTEGER DEFAULT 0,
    response_rate DECIMAL(3,2) DEFAULT 0.00,
    embedding_vector VECTOR(1536),
    bio TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Questions table
CREATE TABLE IF NOT EXISTS questions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    urgency VARCHAR(20) DEFAULT 'normal' CHECK (urgency IN ('low', 'normal', 'high', 'urgent')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'matched', 'in_progress', 'resolved', 'cancelled')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Chat rooms table
CREATE TABLE IF NOT EXISTS chat_rooms (
    id SERIAL PRIMARY KEY,
    question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'closed')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP
);

-- Room participants table
CREATE TABLE IF NOT EXISTS room_participants (
    id SERIAL PRIMARY KEY,
    room_id INTEGER REFERENCES chat_rooms(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'participant' CHECK (role IN ('questioner', 'expert', 'participant')),
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    left_at TIMESTAMP,
    UNIQUE(room_id, user_id)
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    room_id INTEGER REFERENCES chat_rooms(id) ON DELETE CASCADE,
    sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    type VARCHAR(20) DEFAULT 'text' CHECK (type IN ('text', 'code', 'image', 'file')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Expert matches table
CREATE TABLE IF NOT EXISTS expert_matches (
    id SERIAL PRIMARY KEY,
    question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
    expert_id INTEGER REFERENCES experts(id) ON DELETE CASCADE,
    match_score DECIMAL(3,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP,
    UNIQUE(question_id, expert_id)
);

-- Create indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_experts_user_id ON experts(user_id);
CREATE INDEX idx_questions_user_id ON questions(user_id);
CREATE INDEX idx_questions_status ON questions(status);
CREATE INDEX idx_chat_rooms_question_id ON chat_rooms(question_id);
CREATE INDEX idx_room_participants_room_user ON room_participants(room_id, user_id);
CREATE INDEX idx_messages_room_id ON messages(room_id);
CREATE INDEX idx_expert_matches_question ON expert_matches(question_id);
CREATE INDEX idx_expert_matches_expert ON expert_matches(expert_id);

-- Update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_experts_updated_at BEFORE UPDATE ON experts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_questions_updated_at BEFORE UPDATE ON questions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();