-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Client" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "cpfCnpj" TEXT,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "address" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Client" ("address", "cpfCnpj", "createdAt", "email", "id", "name", "phone", "updatedAt") SELECT "address", "cpfCnpj", "createdAt", "email", "id", "name", "phone", "updatedAt" FROM "Client";
DROP TABLE "Client";
ALTER TABLE "new_Client" RENAME TO "Client";
CREATE UNIQUE INDEX "Client_cpfCnpj_key" ON "Client"("cpfCnpj");
CREATE TABLE "new_ServiceItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'SERVICE',
    "costPrice" REAL NOT NULL DEFAULT 0,
    "unitPrice" REAL NOT NULL DEFAULT 0,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_ServiceItem" ("active", "createdAt", "description", "id", "type", "unitPrice", "updatedAt") SELECT "active", "createdAt", "description", "id", "type", "unitPrice", "updatedAt" FROM "ServiceItem";
DROP TABLE "ServiceItem";
ALTER TABLE "new_ServiceItem" RENAME TO "ServiceItem";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
