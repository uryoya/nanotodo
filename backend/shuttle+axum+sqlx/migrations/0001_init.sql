CREATE TABLE IF NOT EXISTS tasks (
    "id" UUID PRIMARY KEY,
    "text" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP DEFAULT NOW()
);