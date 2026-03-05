-- CreateTable
CREATE TABLE "patient_cases" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ficha" JSONB NOT NULL,
    "systemPrompt" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patient_cases_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "patient_cases" ADD CONSTRAINT "patient_cases_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
