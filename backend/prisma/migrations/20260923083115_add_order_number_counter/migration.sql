-- CreateTable
CREATE TABLE "order_number_counters" (
    "year" INTEGER NOT NULL,
    "last_value" INTEGER NOT NULL,

    CONSTRAINT "order_number_counters_pkey" PRIMARY KEY ("year")
);
