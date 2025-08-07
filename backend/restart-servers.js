import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function restartServers() {
  try {
    console.log('🔄 Redémarrage complet des serveurs...');
    
    // 1. Déconnecter proprement Prisma
    console.log('1️⃣ Déconnexion Prisma...');
    const prisma = new PrismaClient();
    await prisma.$disconnect();
    console.log('   ✅ Prisma déconnecté');
    
    // 2. Tuer tous les processus Node
    console.log('2️⃣ Arrêt des processus existants...');
    try {
      await execAsync('taskkill /f /im node.exe');
      console.log('   ✅ Processus Node arrêtés');
    } catch (error) {
      console.log('   ⚠️  Aucun processus Node à arrêter');
    }
    
    try {
      await execAsync('taskkill /f /im tsx.exe');
      console.log('   ✅ Processus TSX arrêtés');
    } catch (error) {
      console.log('   ⚠️  Aucun processus TSX à arrêter');
    }
    
    // 3. Nettoyer le cache Prisma
    console.log('3️⃣ Nettoyage cache Prisma...');
    try {
      await execAsync('rmdir /s /q node_modules\\.prisma');
      console.log('   ✅ Cache Prisma supprimé');
    } catch (error) {
      console.log('   ⚠️  Cache déjà propre');
    }
    
    // 4. Régénérer Prisma
    console.log('4️⃣ Génération nouveau client Prisma...');
    await execAsync('npm run db:generate');
    console.log('   ✅ Client Prisma régénéré');
    
    console.log('\\n🎉 Redémarrage terminé !');
    console.log('\\n📝 Actions à faire manuellement:');
    console.log('   1. Dans un terminal backend: npm run dev');
    console.log('   2. Dans un terminal frontend: npm run dev');
    console.log('   3. Tester: http://localhost:5173/locataires/cmdt7nkiz00ygyuxgvfkplwv6');
    
  } catch (error) {
    console.error('💥 Erreur:', error.message);
  }
}

restartServers();