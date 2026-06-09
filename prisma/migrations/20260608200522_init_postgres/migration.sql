-- CreateTable
CREATE TABLE "Setting" (
    "id" SERIAL NOT NULL,
    "ownerKey" TEXT NOT NULL DEFAULT 'ron',
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemWatch" (
    "id" SERIAL NOT NULL,
    "ownerKey" TEXT NOT NULL DEFAULT 'ron',
    "itemName" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'consumable',
    "minTarget" INTEGER NOT NULL DEFAULT 0,
    "alertEnabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ItemWatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Snapshot" (
    "id" SERIAL NOT NULL,
    "ownerKey" TEXT NOT NULL DEFAULT 'ron',
    "type" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Setting_ownerKey_key_key" ON "Setting"("ownerKey", "key");

-- CreateIndex
CREATE UNIQUE INDEX "ItemWatch_ownerKey_itemName_key" ON "ItemWatch"("ownerKey", "itemName");
