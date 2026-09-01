CREATE TABLE "tb_password_reset_token" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "used_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tb_password_reset_token_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "uk_tb_password_reset_token_hash"
ON "tb_password_reset_token"("token_hash");

CREATE INDEX "idx_tb_password_reset_token_expires_at"
ON "tb_password_reset_token"("expires_at");

CREATE INDEX "idx_tb_password_reset_token_user_id"
ON "tb_password_reset_token"("user_id");

ALTER TABLE "tb_password_reset_token"
ADD CONSTRAINT "fk_tb_password_reset_token_user"
FOREIGN KEY ("user_id") REFERENCES "tb_user"("id")
ON DELETE CASCADE ON UPDATE NO ACTION;
