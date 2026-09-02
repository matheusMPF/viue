-- AlterEnum
ALTER TYPE "notification_type" ADD VALUE 'ROOM_INVITE_RECEIVED';

-- AlterTable
ALTER TABLE "tb_room" ADD COLUMN "invite_code" VARCHAR(64);
CREATE UNIQUE INDEX "uk_tb_room_invite_code" ON "tb_room"("invite_code");

-- AlterTable
ALTER TABLE "tb_notification" ADD COLUMN "room_id" UUID;
ALTER TABLE "tb_notification" ADD CONSTRAINT "fk_tb_notification_room" FOREIGN KEY ("room_id") REFERENCES "tb_room"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
