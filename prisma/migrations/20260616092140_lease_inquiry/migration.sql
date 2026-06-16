-- CreateTable
CREATE TABLE "LeaseInquiry" (
    "id" UUID NOT NULL,
    "listingId" UUID NOT NULL,
    "inquirerUserId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaseInquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaseInquiryMessage" (
    "id" UUID NOT NULL,
    "inquiryId" UUID NOT NULL,
    "authorId" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeaseInquiryMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LeaseInquiry_listingId_idx" ON "LeaseInquiry"("listingId");

-- CreateIndex
CREATE INDEX "LeaseInquiry_inquirerUserId_idx" ON "LeaseInquiry"("inquirerUserId");

-- CreateIndex
CREATE UNIQUE INDEX "LeaseInquiry_listingId_inquirerUserId_key" ON "LeaseInquiry"("listingId", "inquirerUserId");

-- CreateIndex
CREATE INDEX "LeaseInquiryMessage_inquiryId_idx" ON "LeaseInquiryMessage"("inquiryId");

-- AddForeignKey
ALTER TABLE "LeaseInquiry" ADD CONSTRAINT "LeaseInquiry_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "LeaseListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaseInquiry" ADD CONSTRAINT "LeaseInquiry_inquirerUserId_fkey" FOREIGN KEY ("inquirerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaseInquiryMessage" ADD CONSTRAINT "LeaseInquiryMessage_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "LeaseInquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaseInquiryMessage" ADD CONSTRAINT "LeaseInquiryMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
