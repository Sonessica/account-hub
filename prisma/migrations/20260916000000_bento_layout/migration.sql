ALTER TABLE "Account"
  ADD COLUMN "pinned" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "bentoSize" TEXT NOT NULL DEFAULT 'standard',
  ADD COLUMN "priority" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "Account_pinned_sortOrder_priority_idx"
  ON "Account"("pinned", "sortOrder", "priority");
