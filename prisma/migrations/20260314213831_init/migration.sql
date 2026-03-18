-- CreateTable
CREATE TABLE "Technician" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'technician',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Client" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "cpfCnpj" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "address" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "plate" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "color" TEXT NOT NULL,
    "chassis" TEXT,
    "mileage" INTEGER NOT NULL,
    "clientId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Vehicle_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OSBudget" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "number" INTEGER NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'BUDGET',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clientId" INTEGER NOT NULL,
    "vehicleId" INTEGER NOT NULL,
    "defectReported" TEXT,
    "totalAmount" REAL NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "OSBudget_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "OSBudget_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OSItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "osBudgetId" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" REAL NOT NULL DEFAULT 1,
    "unitPrice" REAL NOT NULL,
    "totalPrice" REAL NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'SERVICE',
    "technicianId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "OSItem_osBudgetId_fkey" FOREIGN KEY ("osBudgetId") REFERENCES "OSBudget" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OSItem_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "technicianId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" INTEGER NOT NULL,
    "details" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Technician_username_key" ON "Technician"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Client_cpfCnpj_key" ON "Client"("cpfCnpj");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_plate_key" ON "Vehicle"("plate");

-- CreateIndex
CREATE UNIQUE INDEX "OSBudget_number_key" ON "OSBudget"("number");
