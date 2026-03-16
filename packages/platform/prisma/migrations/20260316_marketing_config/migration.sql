-- CreateTable
CREATE TABLE "tenant_marketing_configs" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "tenant_id" UUID NOT NULL,
    "config" JSONB NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "tenant_marketing_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenant_marketing_configs_tenant_id_key" ON "tenant_marketing_configs"("tenant_id");

-- AddForeignKey
ALTER TABLE "tenant_marketing_configs" ADD CONSTRAINT "tenant_marketing_configs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
