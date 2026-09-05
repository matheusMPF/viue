-- CreateEnum
CREATE TYPE "room_match_session_status" AS ENUM ('WAITING', 'ACTIVE', 'MATCHED', 'CANCELED');
CREATE TYPE "room_match_round_status" AS ENUM ('ACTIVE', 'EXHAUSTED');
CREATE TYPE "room_match_vote_decision" AS ENUM ('LIKE', 'PASS');

-- CreateTable
CREATE TABLE "tb_room_match_session" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "room_id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "type" "content_type" NOT NULL,
    "status" "room_match_session_status" NOT NULL DEFAULT 'WAITING',
    "matched_content_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),

    CONSTRAINT "tb_room_match_session_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tb_room_match_participant" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "session_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "joined_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tb_room_match_participant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tb_room_match_round" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "session_id" UUID NOT NULL,
    "number" INTEGER NOT NULL,
    "status" "room_match_round_status" NOT NULL DEFAULT 'ACTIVE',
    "filters" JSONB NOT NULL DEFAULT '{}',
    "candidate_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),

    CONSTRAINT "tb_room_match_round_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ck_tb_room_match_round_number" CHECK ("number" > 0),
    CONSTRAINT "ck_tb_room_match_round_candidate_count" CHECK ("candidate_count" BETWEEN 0 AND 50)
);

CREATE TABLE "tb_room_match_candidate" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "session_id" UUID NOT NULL,
    "round_id" UUID NOT NULL,
    "content_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "score" DECIMAL(7,6) NOT NULL,
    "score_details" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tb_room_match_candidate_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ck_tb_room_match_candidate_position" CHECK ("position" BETWEEN 1 AND 50),
    CONSTRAINT "ck_tb_room_match_candidate_score" CHECK ("score" BETWEEN 0 AND 1)
);

CREATE TABLE "tb_room_match_vote" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "candidate_id" UUID NOT NULL,
    "participant_id" UUID NOT NULL,
    "decision" "room_match_vote_decision" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tb_room_match_vote_pkey" PRIMARY KEY ("id")
);

-- Indexes and uniqueness guarantees
CREATE INDEX "idx_tb_room_match_session_room_created" ON "tb_room_match_session"("room_id", "created_at");
CREATE INDEX "idx_tb_room_match_session_owner" ON "tb_room_match_session"("owner_id");
CREATE INDEX "idx_tb_room_match_session_status" ON "tb_room_match_session"("status");
CREATE UNIQUE INDEX "uk_tb_room_match_session_active" ON "tb_room_match_session"("room_id")
WHERE "status" IN ('WAITING', 'ACTIVE');

CREATE UNIQUE INDEX "uk_tb_room_match_participant" ON "tb_room_match_participant"("session_id", "user_id");
CREATE INDEX "idx_tb_room_match_participant_user" ON "tb_room_match_participant"("user_id");

CREATE UNIQUE INDEX "uk_tb_room_match_round_number" ON "tb_room_match_round"("session_id", "number");
CREATE INDEX "idx_tb_room_match_round_session_status" ON "tb_room_match_round"("session_id", "status");

CREATE UNIQUE INDEX "uk_tb_room_match_candidate_content" ON "tb_room_match_candidate"("session_id", "content_id");
CREATE UNIQUE INDEX "uk_tb_room_match_candidate_position" ON "tb_room_match_candidate"("round_id", "position");
CREATE INDEX "idx_tb_room_match_candidate_content" ON "tb_room_match_candidate"("content_id");
CREATE INDEX "idx_tb_room_match_candidate_round" ON "tb_room_match_candidate"("round_id");

CREATE UNIQUE INDEX "uk_tb_room_match_vote" ON "tb_room_match_vote"("candidate_id", "participant_id");
CREATE INDEX "idx_tb_room_match_vote_participant" ON "tb_room_match_vote"("participant_id");

-- Foreign keys
ALTER TABLE "tb_room_match_session" ADD CONSTRAINT "fk_tb_room_match_session_room"
FOREIGN KEY ("room_id") REFERENCES "tb_room"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "tb_room_match_session" ADD CONSTRAINT "fk_tb_room_match_session_owner"
FOREIGN KEY ("owner_id") REFERENCES "tb_user"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "tb_room_match_session" ADD CONSTRAINT "fk_tb_room_match_session_result"
FOREIGN KEY ("matched_content_id") REFERENCES "tb_content"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE "tb_room_match_participant" ADD CONSTRAINT "fk_tb_room_match_participant_session"
FOREIGN KEY ("session_id") REFERENCES "tb_room_match_session"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "tb_room_match_participant" ADD CONSTRAINT "fk_tb_room_match_participant_user"
FOREIGN KEY ("user_id") REFERENCES "tb_user"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "tb_room_match_round" ADD CONSTRAINT "fk_tb_room_match_round_session"
FOREIGN KEY ("session_id") REFERENCES "tb_room_match_session"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "tb_room_match_candidate" ADD CONSTRAINT "fk_tb_room_match_candidate_session"
FOREIGN KEY ("session_id") REFERENCES "tb_room_match_session"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "tb_room_match_candidate" ADD CONSTRAINT "fk_tb_room_match_candidate_round"
FOREIGN KEY ("round_id") REFERENCES "tb_room_match_round"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "tb_room_match_candidate" ADD CONSTRAINT "fk_tb_room_match_candidate_content"
FOREIGN KEY ("content_id") REFERENCES "tb_content"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "tb_room_match_vote" ADD CONSTRAINT "fk_tb_room_match_vote_candidate"
FOREIGN KEY ("candidate_id") REFERENCES "tb_room_match_candidate"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "tb_room_match_vote" ADD CONSTRAINT "fk_tb_room_match_vote_participant"
FOREIGN KEY ("participant_id") REFERENCES "tb_room_match_participant"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
