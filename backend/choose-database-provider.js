/**
 * Script pour choisir et configurer un fournisseur PostgreSQL gratuit
 */

import readline from 'readline';
import fs from 'fs/promises';
import path from 'path';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (text) => new Promise((resolve) => rl.question(text, resolve));

const providers = {
  1: {
    name: 'Supabase',
    description: '2 projets gratuits, 500MB chacun, dashboard intégré',
    url: 'https://supabase.com',
    template: {
      host: 'db.xxx.supabase.co',
      user: 'postgres',
      database: 'postgres',
      port: 5432,
      ssl: true
    }
  },
  2: {
    name: 'Neon',
    description: '3 projets gratuits, 512MB chacun, très rapide',
    url: 'https://neon.tech',
    template: {
      host: 'xxx-xxx-xxx.us-east-1.aws.neon.tech',
      user: 'xxx',
      database: 'neondb',
      port: 5432,
      ssl: true
    }
  },
  3: {
    name: 'Railway',
    description: '3 projets gratuits, 1GB, $5 crédit/mois',
    url: 'https://railway.app',
    template: {
      host: 'xxx.railway.app',
      user: 'postgres',
      database: 'railway',
      port: 5432,
      ssl: true
    }
  },
  4: {
    name: 'ElephantSQL',
    description: '1 instance gratuite, 20MB (très limité)',
    url: 'https://elephantsql.com',
    template: {
      host: 'hattie.db.elephantsql.com',
      user: 'xxx',
      database: 'xxx',
      port: 5432,
      ssl: true
    }
  }
};

async function displayProviders() {
  console.log('\n🐘 Choisissez votre fournisseur PostgreSQL gratuit :\n');
  
  Object.entries(providers).forEach(([key, provider]) => {
    console.log(`${key}. ${provider.name}`);
    console.log(`   ${provider.description}`);
    console.log(`   URL: ${provider.url}\n`);
  });
}

async function generateConfig(providerKey, connectionDetails) {
  const provider = providers[providerKey];
  
  const databaseUrl = `postgresql://${connectionDetails.user}:${connectionDetails.password}@${connectionDetails.host}:${connectionDetails.port}/${connectionDetails.database}${connectionDetails.ssl ? '?sslmode=require' : ''}`;
  
  const envConfig = `# Database ${provider.name}
DATABASE_URL="${databaseUrl}"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_EXPIRES_IN="7d"

# Server
PORT=7000
NODE_ENV="development"

# Logging
LOG_LEVEL="info"
`;

  const migrationConfig = `// Configuration pour ${provider.name}
const pgConfig = {
  user: '${connectionDetails.user}',
  host: '${connectionDetails.host}',
  database: '${connectionDetails.database}',
  password: '${connectionDetails.password}',
  port: ${connectionDetails.port},${connectionDetails.ssl ? '\n  ssl: { rejectUnauthorized: false }' : ''}
};`;

  return { envConfig, migrationConfig, databaseUrl };
}

async function main() {
  console.log('🎯 Configuration de PostgreSQL pour votre projet de gestion locative');
  console.log('=' .repeat(70));
  
  await displayProviders();
  
  const choice = await question('Votre choix (1-4) : ');
  
  if (!providers[choice]) {
    console.log('❌ Choix invalide');
    process.exit(1);
  }
  
  const selectedProvider = providers[choice];
  console.log(`\n✅ Vous avez choisi : ${selectedProvider.name}`);
  console.log(`📖 ${selectedProvider.description}`);
  
  console.log(`\n🌐 Étapes à suivre :`);
  console.log(`1. Allez sur ${selectedProvider.url}`);
  console.log(`2. Créez un compte et un nouveau projet PostgreSQL`);
  console.log(`3. Récupérez les informations de connexion`);
  
  console.log('\n📝 Saisissez les informations de connexion :');
  
  const connectionDetails = {
    host: await question(`Host (ex: ${selectedProvider.template.host}) : `),
    user: await question(`User (ex: ${selectedProvider.template.user}) : `),
    database: await question(`Database (ex: ${selectedProvider.template.database}) : `),
    password: await question(`Password : `),
    port: parseInt(await question(`Port (${selectedProvider.template.port}) : `) || selectedProvider.template.port),
    ssl: selectedProvider.template.ssl
  };
  
  const { envConfig, migrationConfig, databaseUrl } = await generateConfig(choice, connectionDetails);
  
  // Sauvegarder la configuration
  await fs.writeFile('.env.new', envConfig);
  
  // Mettre à jour le script de migration
  const migrationScript = await fs.readFile('migrate-to-postgresql.js', 'utf-8');
  const updatedScript = migrationScript.replace(
    /\/\/ Configuration PostgreSQL[\s\S]*?};/,
    `// Configuration PostgreSQL - ${selectedProvider.name}
${migrationConfig};`
  );
  
  await fs.writeFile('migrate-to-postgresql.js', updatedScript);
  
  console.log('\n✅ Configuration générée !');
  console.log('\n📁 Fichiers créés/modifiés :');
  console.log('   - .env.new (nouveau fichier de configuration)');
  console.log('   - migrate-to-postgresql.js (mis à jour)');
  
  console.log('\n🚀 Prochaines étapes :');
  console.log('1. Renommez .env.new en .env');
  console.log('2. Testez la connexion : npm run db:generate');
  console.log('3. Créez les tables : npm run db:push');
  console.log('4. Migrez vos données : npm run migrate:to-postgres');
  console.log('5. Vérifiez : npm run test:postgres');
  
  console.log(`\n🔗 URL de connexion générée :`);
  console.log(`DATABASE_URL="${databaseUrl}"`);
  
  rl.close();
}

main().catch(console.error);