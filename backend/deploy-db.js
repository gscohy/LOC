const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();

  try {
    console.log('🔄 Connexion à la base de données...');
    await prisma.$connect();
    console.log('✅ Connexion réussie');

    // Vérifier si les tables existent
    console.log('🔄 Vérification des tables...');
    
    try {
      const pretCount = await prisma.pretImmobilier.count();
      console.log(`✅ Table PretImmobilier existe (${pretCount} enregistrements)`);
    } catch (error) {
      console.log('❌ Table PretImmobilier n\'existe pas');
      console.log('🔄 Exécution des migrations...');
      
      // Exécuter la migration SQL directement
      const migrationSQL = `
        -- CreateTable
        CREATE TABLE IF NOT EXISTS "PretImmobilier" (
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
        CREATE TABLE IF NOT EXISTS "EcheancePret" (
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
        CREATE INDEX IF NOT EXISTS "PretImmobilier_bienId_idx" ON "PretImmobilier"("bienId");

        -- CreateIndex
        CREATE INDEX IF NOT EXISTS "EcheancePret_pretId_idx" ON "EcheancePret"("pretId");

        -- CreateIndex
        CREATE INDEX IF NOT EXISTS "EcheancePret_dateEcheance_idx" ON "EcheancePret"("dateEcheance");

        -- CreateIndex
        CREATE UNIQUE INDEX IF NOT EXISTS "EcheancePret_pretId_rang_key" ON "EcheancePret"("pretId", "rang");

        -- AddForeignKey
        DO $$ BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'PretImmobilier_bienId_fkey'
          ) THEN
            ALTER TABLE "PretImmobilier" ADD CONSTRAINT "PretImmobilier_bienId_fkey" 
            FOREIGN KEY ("bienId") REFERENCES "Bien"("id") ON DELETE CASCADE ON UPDATE CASCADE;
          END IF;
        END $$;

        -- AddForeignKey
        DO $$ BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'EcheancePret_pretId_fkey'
          ) THEN
            ALTER TABLE "EcheancePret" ADD CONSTRAINT "EcheancePret_pretId_fkey" 
            FOREIGN KEY ("pretId") REFERENCES "PretImmobilier"("id") ON DELETE CASCADE ON UPDATE CASCADE;
          END IF;
        END $$;
      `;

      await prisma.$executeRawUnsafe(migrationSQL);
      console.log('✅ Migration exécutée avec succès');
    }

    console.log('✅ Base de données mise à jour');
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();