import { Pool, PoolClient } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'task_track_bot',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'password',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000, // Increased from 2000 to 5000
});

console.log('📋 Database Configuration:');
console.log('  DATABASE_URL:', process.env.DATABASE_URL);
console.log('  POSTGRES_HOST:', process.env.POSTGRES_HOST);
console.log('  POSTGRES_PORT:', process.env.POSTGRES_PORT);
console.log('  POSTGRES_DB:', process.env.POSTGRES_DB);
console.log('  POSTGRES_USER:', process.env.POSTGRES_USER);

// Initialize database tables and extensions
export const initializeDatabase = async (): Promise<void> => {
  let client: PoolClient | null = null;
  try {
    console.log('🔗 Attempting to connect to PostgreSQL...');
    client = await pool.connect();
    console.log('✅ Connected to PostgreSQL successfully!');
    
    // Enable pgvector extension
    await client.query('CREATE EXTENSION IF NOT EXISTS vector;').catch(() => {
      // Ignore if vector extension is not available
    });
    
    // Create tasks table
    await client.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
        priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
        due_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        tags TEXT[] DEFAULT '{}',
        metadata JSONB DEFAULT '{}',
        user_id VARCHAR(255) NOT NULL
      );
    `);
    
    // Remove DEFAULT 'default-user' from existing tables if it exists
    await client.query(`
      ALTER TABLE tasks ALTER COLUMN user_id DROP DEFAULT;
      ALTER TABLE tasks ALTER COLUMN user_id SET NOT NULL;
    `).catch(() => {
      // Ignore errors if column already has no default or is already NOT NULL
    });
    
    // Create events table
    await client.query(`
      CREATE TABLE IF NOT EXISTS events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        start_date TIMESTAMP NOT NULL,
        end_date TIMESTAMP NOT NULL,
        location VARCHAR(255),
        type VARCHAR(20) DEFAULT 'other' CHECK (type IN ('meeting', 'appointment', 'deadline', 'reminder', 'other')),
        status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        attendees TEXT[] DEFAULT '{}',
        metadata JSONB DEFAULT '{}',
        user_id VARCHAR(255) NOT NULL
      );
    `);
    
    // Remove DEFAULT 'default-user' from existing tables if it exists
    await client.query(`
      ALTER TABLE events ALTER COLUMN user_id DROP DEFAULT;
      ALTER TABLE events ALTER COLUMN user_id SET NOT NULL;
    `).catch(() => {
      // Ignore errors if column already has no default or is already NOT NULL
    });
    
    // Create vector embeddings table for RAG
    await client.query(`
      CREATE TABLE IF NOT EXISTS embeddings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        content_type VARCHAR(50) NOT NULL, -- 'task' or 'event'
        content_id UUID NOT NULL,
        content_text TEXT NOT NULL,
        embedding VECTOR(1536), -- OpenAI embedding dimension
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create memory table for conversation history
    await client.query(`
      CREATE TABLE IF NOT EXISTS memory (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(255),
        session_id VARCHAR(255),
        conversation_id VARCHAR(255),
        message_type VARCHAR(20) NOT NULL CHECK (message_type IN ('user', 'assistant', 'system')),
        content TEXT NOT NULL,
        context JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create conversation history table
    await client.query(`
      CREATE TABLE IF NOT EXISTS conversation_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(255) NOT NULL,
        session_id VARCHAR(255) NOT NULL,
        conversation_id VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
        content TEXT NOT NULL,
        actions JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create indexes for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
      CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
      CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
      CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
      CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
      
      CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
      CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
      CREATE INDEX IF NOT EXISTS idx_events_start_date ON events(start_date);
      CREATE INDEX IF NOT EXISTS idx_events_end_date ON events(end_date);
      CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);
      
      CREATE INDEX IF NOT EXISTS idx_embeddings_content_type ON embeddings(content_type);
      CREATE INDEX IF NOT EXISTS idx_embeddings_content_id ON embeddings(content_id);
      
      CREATE INDEX IF NOT EXISTS idx_memory_user_id ON memory(user_id);
      CREATE INDEX IF NOT EXISTS idx_memory_session_id ON memory(session_id);
      CREATE INDEX IF NOT EXISTS idx_memory_conversation_id ON memory(conversation_id);
      CREATE INDEX IF NOT EXISTS idx_memory_created_at ON memory(created_at);
      
      CREATE INDEX IF NOT EXISTS idx_conversation_user_id ON conversation_history(user_id);
      CREATE INDEX IF NOT EXISTS idx_conversation_session_id ON conversation_history(session_id);
      CREATE INDEX IF NOT EXISTS idx_conversation_conversation_id ON conversation_history(conversation_id);
      CREATE INDEX IF NOT EXISTS idx_conversation_created_at ON conversation_history(created_at);
    `);
    
    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    console.error('\n🔍 Debugging Information:');
    console.error('  HOST:', process.env.POSTGRES_HOST || 'localhost');
    console.error('  PORT:', process.env.POSTGRES_PORT || '5432');
    console.error('  DB:', process.env.POSTGRES_DB || 'task_track_bot');
    console.error('  USER:', process.env.POSTGRES_USER || 'postgres');
    console.error('\n💡 Solutions:');
    console.error('  1. Make sure PostgreSQL is running');
    console.error('  2. Check the credentials in .env file');
    console.error('  3. Verify the database exists: task_track_bot');
    console.error('  4. Check if PostgreSQL is listening on port 5432');
    throw error;
  } finally {
    if (client) {
      client.release();
    }
  }
};

// Database query helper
export const query = async (text: string, params?: any[]): Promise<any> => {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
};

// Transaction helper
export const withTransaction = async <T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export default pool;
