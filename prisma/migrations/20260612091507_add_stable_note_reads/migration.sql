-- CreateTable
CREATE TABLE "StableNoteRead" (
    "id" UUID NOT NULL,
    "noteId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StableNoteRead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StableNoteRead_userId_idx" ON "StableNoteRead"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "StableNoteRead_noteId_userId_key" ON "StableNoteRead"("noteId", "userId");

-- AddForeignKey
ALTER TABLE "StableNoteRead" ADD CONSTRAINT "StableNoteRead_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "StableNote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StableNoteRead" ADD CONSTRAINT "StableNoteRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
