CREATE SCHEMA IF NOT EXISTS split_demo;
SET search_path TO split_demo;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS split_demo.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(120),
  username VARCHAR(50),
  email VARCHAR(255),
  phone VARCHAR(30),
  password_hash VARCHAR(255),
  is_active BOOLEAN DEFAULT FALSE,
  email_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE split_demo.users
  ADD COLUMN IF NOT EXISTS full_name VARCHAR(120);

ALTER TABLE split_demo.users
  ADD COLUMN IF NOT EXISTS username VARCHAR(50);

ALTER TABLE split_demo.users
  ADD COLUMN IF NOT EXISTS email VARCHAR(255);

ALTER TABLE split_demo.users
  ADD COLUMN IF NOT EXISTS phone VARCHAR(30);

ALTER TABLE split_demo.users
  ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

ALTER TABLE split_demo.users
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT FALSE;

ALTER TABLE split_demo.users
  ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;

ALTER TABLE split_demo.users
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS users_username_unique_idx
  ON split_demo.users (LOWER(username))
  WHERE username IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique_idx
  ON split_demo.users (LOWER(email))
  WHERE email IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS users_phone_unique_idx
  ON split_demo.users (phone)
  WHERE phone IS NOT NULL;

CREATE TABLE IF NOT EXISTS split_demo.email_verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES split_demo.users(id) ON DELETE CASCADE,
  code_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS split_demo.splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES split_demo.users(id) ON DELETE CASCADE,
  project_name VARCHAR(160) NOT NULL,
  total_amount NUMERIC(12,2) NOT NULL,
  currency VARCHAR(10) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'draft',
  share_link_token VARCHAR(120),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS split_demo.split_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  split_id UUID NOT NULL REFERENCES split_demo.splits(id) ON DELETE CASCADE,
  user_id UUID REFERENCES split_demo.users(id) ON DELETE SET NULL,
  name VARCHAR(120) NOT NULL,
  percentage NUMERIC(5,2) NOT NULL,
  share_amount NUMERIC(12,2) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS split_demo.chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  split_id UUID NOT NULL REFERENCES split_demo.splits(id) ON DELETE CASCADE,
  participant_a_id UUID NOT NULL REFERENCES split_demo.users(id) ON DELETE CASCADE,
  participant_b_id UUID NOT NULL REFERENCES split_demo.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS split_demo.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES split_demo.chat_conversations(id) ON DELETE CASCADE,
  sender_user_id UUID NOT NULL REFERENCES split_demo.users(id) ON DELETE CASCADE,
  message_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS split_participants_split_idx
  ON split_demo.split_participants (split_id);

CREATE INDEX IF NOT EXISTS split_participants_user_idx
  ON split_demo.split_participants (user_id);

CREATE INDEX IF NOT EXISTS chat_conversations_users_idx
  ON split_demo.chat_conversations (participant_a_id, participant_b_id);

CREATE INDEX IF NOT EXISTS chat_messages_conversation_idx
  ON split_demo.chat_messages (conversation_id, created_at DESC);
