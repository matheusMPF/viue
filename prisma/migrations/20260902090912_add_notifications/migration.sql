-- CreateEnum
CREATE TYPE "notification_type" AS ENUM ('ACCOUNT_CREATED', 'FRIEND_REQUEST_RECEIVED', 'FRIEND_CONTENT_RATED');

-- CreateTable
CREATE TABLE "tb_notification" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "type" "notification_type" NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "message" TEXT NOT NULL,
    "actor_id" UUID,
    "content_id" UUID,
    "friendship_id" UUID,
    "action_url" VARCHAR(500),
    "read_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tb_notification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_tb_notification_user_read"
ON "tb_notification"("user_id", "read_at");

CREATE INDEX "idx_tb_notification_user_created"
ON "tb_notification"("user_id", "created_at");

ALTER TABLE "tb_notification"
ADD CONSTRAINT "fk_tb_notification_user"
FOREIGN KEY ("user_id") REFERENCES "tb_user"("id")
ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "tb_notification"
ADD CONSTRAINT "fk_tb_notification_actor"
FOREIGN KEY ("actor_id") REFERENCES "tb_user"("id")
ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE "tb_notification"
ADD CONSTRAINT "fk_tb_notification_content"
FOREIGN KEY ("content_id") REFERENCES "tb_content"("id")
ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE "tb_notification"
ADD CONSTRAINT "fk_tb_notification_friendship"
FOREIGN KEY ("friendship_id") REFERENCES "tb_friendship"("id")
ON DELETE SET NULL ON UPDATE NO ACTION;
