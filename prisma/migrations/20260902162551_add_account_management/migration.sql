-- AlterEnum
ALTER TYPE "otp_purpose" ADD VALUE 'EMAIL_CHANGE';

-- AlterTable
ALTER TABLE "tb_user" ADD COLUMN "birth_date" DATE;

-- AlterTable
ALTER TABLE "tb_otp" ADD COLUMN "new_email" VARCHAR(255);
