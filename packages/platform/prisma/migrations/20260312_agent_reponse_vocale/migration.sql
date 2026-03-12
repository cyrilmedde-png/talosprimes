-- AlterTable: Add reponse_vocale column to agent_knowledge_entries
ALTER TABLE "agent_knowledge_entries" ADD COLUMN IF NOT EXISTS "reponse_vocale" TEXT;
