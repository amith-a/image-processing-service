-- CreateTable
CREATE TABLE "images" (
    "id" UUID NOT NULL,
    "originalKey" TEXT NOT NULL,
    "processedKey" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "images_pkey" PRIMARY KEY ("id")
);
