-- CreateTable
CREATE TABLE "PretImmobilier" (
    "id" TEXT NOT NULL,
    "bienId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "banque" TEXT NOT NULL,
    "numeroPret" TEXT,
    "montantEmprunte" DOUBLE PRECISION NOT NULL,
    "tauxInteret" DOUBLE PRECISION NOT NULL,
    "dureeAnnees" INTEGER NOT NULL,
    "dateDebut" TIMESTAMP(3) NOT NULL,
    "dateFin" TIMESTAMP(3) NOT NULL,
    "mensualiteBase" DOUBLE PRECISION NOT NULL,
    "mensualiteAssurance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "statut" TEXT NOT NULL DEFAULT 'ACTIF',
    "commentaires" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PretImmobilier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EcheancePret" (
    "id" TEXT NOT NULL,
    "pretId" TEXT NOT NULL,
    "rang" INTEGER NOT NULL,
    "dateEcheance" TIMESTAMP(3) NOT NULL,
    "montantRecouvrer" DOUBLE PRECISION NOT NULL,
    "capitalAmorti" DOUBLE PRECISION NOT NULL,
    "partInterets" DOUBLE PRECISION NOT NULL,
    "partAccessoires" DOUBLE PRECISION NOT NULL,
    "capitalRestant" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EcheancePret_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PretImmobilier_bienId_idx" ON "PretImmobilier"("bienId");

-- CreateIndex
CREATE INDEX "EcheancePret_pretId_idx" ON "EcheancePret"("pretId");

-- CreateIndex
CREATE INDEX "EcheancePret_dateEcheance_idx" ON "EcheancePret"("dateEcheance");

-- CreateIndex
CREATE UNIQUE INDEX "EcheancePret_pretId_rang_key" ON "EcheancePret"("pretId", "rang");

-- AddForeignKey
ALTER TABLE "PretImmobilier" ADD CONSTRAINT "PretImmobilier_bienId_fkey" FOREIGN KEY ("bienId") REFERENCES "Bien"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EcheancePret" ADD CONSTRAINT "EcheancePret_pretId_fkey" FOREIGN KEY ("pretId") REFERENCES "PretImmobilier"("id") ON DELETE CASCADE ON UPDATE CASCADE;