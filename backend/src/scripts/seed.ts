import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');
  
  // Créer un utilisateur admin
  const adminPassword = await bcrypt.hash('password', 10);
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@test.com' },
    update: {},
    create: {
      email: 'admin@test.com',
      password: adminPassword,
      nom: 'Admin',
      prenom: 'Test',
      role: 'ADMIN',
    },
  });
  
  console.log('✅ Admin user created:', admin.email);
  
  // Créer quelques propriétaires de test
  const existingProp1 = await prisma.proprietaire.findFirst({
    where: { email: 'prop1@test.com' }
  });
  
  const proprietaire1 = existingProp1 || await prisma.proprietaire.create({
    data: {
      type: 'PHYSIQUE',
      nom: 'Dupont',
      prenom: 'Jean',
      email: 'prop1@test.com',
      telephone: '0123456789',
      adresse: '123 Rue de la Paix',
      ville: 'Paris',
      codePostal: '75001',
    },
  });
  
  const existingProp2 = await prisma.proprietaire.findFirst({
    where: { email: 'prop2@test.com' }
  });
  
  const proprietaire2 = existingProp2 || await prisma.proprietaire.create({
    data: {
      type: 'PHYSIQUE',
      nom: 'Martin',
      prenom: 'Marie',
      email: 'prop2@test.com',
      telephone: '0987654321',
      adresse: '456 Avenue des Champs',
      ville: 'Lyon',
      codePostal: '69001',
    },
  });
  
  console.log('✅ Proprietaires created:', proprietaire1.nom, proprietaire2.nom);
  
  // Créer quelques biens de test
  const bien1 = await prisma.bien.create({
    data: {
      adresse: '10 Rue de Rivoli',
      ville: 'Paris',
      codePostal: '75001',
      type: 'APPARTEMENT',
      surface: 65.5,
      nbPieces: 3,
      nbChambres: 2,
      loyer: 1200,
      chargesMensuelles: 150,
      depotGarantie: 1200,
      statut: 'LIBRE',
      description: 'Bel appartement 3 pièces au centre de Paris',
      proprietaires: {
        create: [
          {
            proprietaireId: proprietaire1.id,
            quotePart: 100,
          },
        ],
      },
    },
  });
  
  const bien2 = await prisma.bien.create({
    data: {
      adresse: '25 Boulevard de la République',
      ville: 'Lyon',
      codePostal: '69002',
      type: 'APPARTEMENT',
      surface: 45.0,
      nbPieces: 2,
      nbChambres: 1,
      loyer: 800,
      chargesMensuelles: 100,
      depotGarantie: 800,
      statut: 'LOUE',
      description: 'Studio moderne proche du centre-ville',
      proprietaires: {
        create: [
          {
            proprietaireId: proprietaire2.id,
            quotePart: 100,
          },
        ],
      },
    },
  });
  
  console.log('✅ Biens created:', bien1.adresse, bien2.adresse);
  
  // Créer quelques locataires de test
  const locataire1 = await prisma.locataire.create({
    data: {
      civilite: 'M',
      nom: 'Durand',
      prenom: 'Pierre',
      email: 'pierre.durand@test.com',
      telephone: '0612345678',
      adresse: '789 Rue de la Liberté',
      ville: 'Paris',
      codePostal: '75010',
      profession: 'Ingénieur',
      revenus: 3500,
    },
  });
  
  console.log('✅ Locataires created:', locataire1.nom);
  
  // Créer quelques contrats de test
  const contrat1 = await prisma.contrat.create({
    data: {
      bienId: bien1.id,
      dateDebut: new Date('2024-01-01'),
      dateFin: new Date('2025-12-31'),
      duree: 24,
      loyer: 1200,
      chargesMensuelles: 150,
      depotGarantie: 1200,
      jourPaiement: 5,
      type: 'HABITATION',
      statut: 'ACTIF',
      clausesParticulieres: 'Pas d\'animaux autorisés',
    },
  });

  // Associer le locataire au contrat
  await prisma.contratLocataire.create({
    data: {
      contratId: contrat1.id,
      locataireId: locataire1.id,
    },
  });

  // Créer l'historique du contrat
  await prisma.contratHistorique.create({
    data: {
      contratId: contrat1.id,
      action: 'CREATION',
      description: 'Contrat créé et signé',
    },
  });

  console.log('✅ Contrats created:', contrat1.id);
  
  // Initialiser les templates d'emails par défaut
  const existingTemplates = await prisma.emailTemplate.count();
  
  if (existingTemplates === 0) {
    console.log('📧 Initializing default email templates...');
    
    const defaultTemplates = [
      {
        nom: 'Rappel de loyer impayé',
        sujet: 'Rappel de paiement - Loyer {{periode}} - {{bien_adresse}}',
        contenu: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2c3e50; margin: 0;">RAPPEL DE PAIEMENT</h1>
              <p style="color: #7f8c8d; font-size: 14px;">Gestion Locative</p>
            </div>
            <div style="background-color: #f8f9fa; padding: 20px; border-left: 4px solid #e74c3c; margin: 20px 0;">
              <h3 style="color: #e74c3c; margin-top: 0;">Loyer en retard de paiement</h3>
              <p>Nous n'avons pas reçu le paiement de votre loyer pour la période de <strong>{{periode}}</strong>.</p>
            </div>
            <div style="margin: 20px 0;">
              <h4>Informations du bien :</h4>
              <ul style="list-style: none; padding: 0;">
                <li><strong>Adresse :</strong> {{bien_adresse}}, {{bien_ville}} {{bien_codePostal}}</li>
                <li><strong>Locataire :</strong> {{locataire_prenom}} {{locataire_nom}}</li>
                <li><strong>Montant dû :</strong> {{montant_du}} €</li>
                <li><strong>Nombre de jours de retard :</strong> {{nb_jours_retard}} jours</li>
              </ul>
            </div>
            <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Merci de régulariser votre situation dans les plus brefs délais.</strong></p>
            </div>
          </div>
        `,
        type: 'RETARD',
        variables: JSON.stringify([
          'locataire_nom', 'locataire_prenom', 'bien_adresse', 'bien_ville', 
          'bien_codePostal', 'periode', 'montant_du', 'nb_jours_retard'
        ]),
        actif: true
      },
      {
        nom: 'Quittance de loyer',
        sujet: 'Quittance de loyer - {{mois_annee}} - {{bien_adresse}}',
        contenu: `
          <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px; color: #333;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2c3e50; margin: 0; font-size: 24px;">QUITTANCE DE LOYER</h1>
              <p style="color: #7f8c8d; font-size: 16px; margin: 10px 0;">{{mois_annee}}</p>
            </div>
            
            <div style="display: flex; justify-content: space-between; margin: 30px 0;">
              <div style="flex: 1; margin-right: 20px;">
                <h3 style="color: #2c3e50; margin: 0 0 10px 0; border-bottom: 2px solid #3498db; padding-bottom: 5px;">Propriétaire(s):</h3>
                <p style="margin: 5px 0; line-height: 1.4;">
                  {{proprietaire_nom_complet}}<br>
                  {{proprietaire_adresse}}<br>
                  {{proprietaire_code_postal}} {{proprietaire_ville}}
                </p>
              </div>
              <div style="flex: 1;">
                <h3 style="color: #2c3e50; margin: 0 0 10px 0; border-bottom: 2px solid #3498db; padding-bottom: 5px;">Adresse de la location:</h3>
                <p style="margin: 5px 0; line-height: 1.4;">
                  {{bien_adresse}}<br>
                  {{bien_code_postal}} {{bien_ville}}
                </p>
              </div>
            </div>

            <div style="margin: 30px 0; padding: 20px; background-color: #f8f9fa; border-left: 4px solid #3498db;">
              <p style="margin: 0; line-height: 1.6;">
                Nous, soussignés, <strong>{{proprietaire_nom_complet}}</strong>, propriétaires du logement désigné ci-dessus, 
                déclarons avoir reçu de <strong>{{locataire_nom_complet}}</strong>, la somme de <strong>{{total_quittance}} €</strong> 
                au titre du paiement du loyer pour la période de location de <strong>{{mois_annee}}</strong> et leur en donnons quittance 
                ainsi que la provision sur charge de <strong>{{charges_montant}} €</strong>, sous réserve de tous nos droits.
              </p>
            </div>

            <div style="margin: 30px 0;">
              <h3 style="color: #2c3e50; margin: 0 0 15px 0; border-bottom: 2px solid #27ae60; padding-bottom: 5px;">Détail du règlement:</h3>
              <table style="width: 100%; border-collapse: collapse; margin: 10px 0;">
                <tr>
                  <td style="padding: 12px; border: 1px solid #bdc3c7; background-color: #ecf0f1; font-weight: bold;">Loyer:</td>
                  <td style="padding: 12px; border: 1px solid #bdc3c7; text-align: right;"><strong>{{loyer_hors_charges}} €</strong></td>
                </tr>
                <tr>
                  <td style="padding: 12px; border: 1px solid #bdc3c7; background-color: #ecf0f1; font-weight: bold;">Provision sur charge:</td>
                  <td style="padding: 12px; border: 1px solid #bdc3c7; text-align: right;"><strong>{{charges_montant}} €</strong></td>
                </tr>
                <tr style="background-color: #d5f4e6;">
                  <td style="padding: 12px; border: 2px solid #27ae60; font-weight: bold; font-size: 16px;">Total:</td>
                  <td style="padding: 12px; border: 2px solid #27ae60; text-align: right; font-weight: bold; font-size: 16px;">{{total_quittance}} €</td>
                </tr>
              </table>
            </div>

            <div style="margin: 30px 0;">
              <p style="margin: 10px 0;"><strong>Date du paiement:</strong> {{date_paiement}}</p>
              <p style="margin: 10px 0;">À {{lieu_etablissement}}, le {{date_etablissement}}</p>
              <div style="margin-top: 40px; text-align: right;">
                <p style="margin: 0 0 10px 0;"><strong>Signature:</strong></p>
                <div style="min-height: 80px; display: inline-block;">
                  {{signature_proprietaire}}
                </div>
              </div>
            </div>
          </div>
        `,
        type: 'QUITTANCE',
        variables: JSON.stringify([
          'locataire_nom', 'locataire_prenom', 'locataire_nom_complet', 
          'bien_adresse', 'bien_ville', 'bien_code_postal', 
          'proprietaire_nom_complet', 'proprietaire_adresse', 'proprietaire_ville', 'proprietaire_code_postal',
          'mois_annee', 'loyer_hors_charges', 'charges_montant', 'total_quittance',
          'date_paiement', 'date_etablissement', 'lieu_etablissement', 'signature_proprietaire'
        ]),
        actif: true
      },
      {
        nom: 'Relance en cas de non-paiement', 
        sujet: 'RELANCE - Loyer impayé depuis {{nb_jours_retard}} jours - {{bien_adresse}}',
        contenu: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #dc3545; margin: 0;">RELANCE</h1>
            </div>
            <div style="background-color: #f8d7da; padding: 20px; border-left: 4px solid #dc3545; margin: 20px 0;">
              <h3 style="color: #dc3545; margin-top: 0;">⚠️ Situation préoccupante</h3>
              <p>Malgré notre précédent rappel, nous n'avons toujours pas reçu le règlement.</p>
              <p><strong>Retard actuel : {{nb_jours_retard}} jours</strong></p>
            </div>
            <div style="margin: 20px 0;">
              <ul style="list-style: none; padding: 0;">
                <li><strong>Locataire :</strong> {{locataire_prenom}} {{locataire_nom}}</li>
                <li style="color: #dc3545;"><strong>Montant dû :</strong> {{montant_du}} €</li>
                <li style="color: #dc3545;"><strong>Date limite :</strong> {{date_limite}}</li>
              </ul>
            </div>
          </div>
        `,
        type: 'RELANCE',
        variables: JSON.stringify([
          'locataire_nom', 'locataire_prenom', 'bien_adresse', 'bien_ville', 
          'bien_codePostal', 'montant_du', 'nb_jours_retard', 'date_limite'
        ]),
        actif: true
      },
      {
        nom: 'Mise en demeure',
        sujet: 'MISE EN DEMEURE - Loyer impayé depuis {{nb_jours_retard}} jours - {{bien_adresse}}',
        contenu: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #dc3545; margin: 0;">MISE EN DEMEURE</h1>
            </div>
            <div style="background-color: #f8d7da; padding: 20px; border-left: 4px solid #dc3545; margin: 20px 0;">
              <h3 style="color: #dc3545; margin-top: 0;">⚠️ DERNIER AVERTISSEMENT</h3>
              <p>Nous vous mettons en demeure de régler immédiatement le loyer impayé.</p>
              <p><strong>À défaut de paiement sous 8 jours, nous engagerons des poursuites judiciaires.</strong></p>
            </div>
            <div style="margin: 20px 0;">
              <ul style="list-style: none; padding: 0;">
                <li><strong>Locataire :</strong> {{locataire_prenom}} {{locataire_nom}}</li>
                <li style="color: #dc3545;"><strong>Montant dû :</strong> {{montant_du}} €</li>
                <li><strong>Période :</strong> {{periode}}</li>
                <li><strong>Retard :</strong> {{nb_jours_retard}} jours</li>
              </ul>
            </div>
          </div>
        `,
        type: 'MISE_EN_DEMEURE',
        variables: JSON.stringify([
          'locataire_nom', 'locataire_prenom', 'bien_adresse', 'bien_ville', 
          'bien_codePostal', 'periode', 'montant_du', 'nb_jours_retard'
        ]),
        actif: true
      },
      {
        nom: 'Information générale',
        sujet: 'Information concernant votre logement - {{bien_adresse}}',
        contenu: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #17a2b8; margin: 0;">INFORMATION</h1>
            </div>
            <div style="background-color: #d1ecf1; padding: 20px; border-left: 4px solid #17a2b8; margin: 20px 0;">
              <h3 style="color: #17a2b8; margin-top: 0;">📋 Information importante</h3>
              <p>Nous souhaitons vous informer concernant votre logement.</p>
            </div>
            <div style="margin: 20px 0;">
              <ul style="list-style: none; padding: 0;">
                <li><strong>Locataire :</strong> {{locataire_prenom}} {{locataire_nom}}</li>
                <li><strong>Adresse :</strong> {{bien_adresse}}, {{bien_ville}} {{bien_codePostal}}</li>
              </ul>
            </div>
            <div style="margin: 20px 0;">
              <p>{{message_personnalise}}</p>
            </div>
          </div>
        `,
        type: 'INFORMATION',
        variables: JSON.stringify([
          'locataire_nom', 'locataire_prenom', 'bien_adresse', 'bien_ville', 
          'bien_codePostal', 'message_personnalise'
        ]),
        actif: true
      },
      {
        nom: 'Email de bienvenue nouveau locataire',
        sujet: 'Bienvenue ! Informations importantes pour votre nouveau logement - {{bien_adresse}}',
        contenu: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #17a2b8; margin: 0;">🏠 BIENVENUE !</h1>
            </div>
            <div style="background-color: #d1ecf1; padding: 20px; border-left: 4px solid #17a2b8; margin: 20px 0;">
              <h3 style="color: #17a2b8; margin-top: 0;">Félicitations pour votre nouveau logement !</h3>
              <p>Nous vous souhaitons la bienvenue dans votre nouveau logement.</p>
            </div>
            <div style="margin: 20px 0;">
              <h4>🏡 Informations de votre logement :</h4>
              <ul style="list-style: none; padding: 0;">
                <li><strong>Locataire :</strong> {{locataire_prenom}} {{locataire_nom}}</li>
                <li><strong>Adresse :</strong> {{bien_adresse}}, {{bien_ville}} {{bien_codePostal}}</li>
                <li><strong>Date d'entrée :</strong> {{date_entree}}</li>
              </ul>
            </div>
          </div>
        `,
        type: 'BIENVENUE',
        variables: JSON.stringify([
          'locataire_nom', 'locataire_prenom', 'bien_adresse', 'bien_ville', 
          'bien_codePostal', 'date_entree', 'proprietaire_nom'
        ]),
        actif: true
      }
    ];

    const createdTemplates = await prisma.$transaction(
      defaultTemplates.map(template => 
        prisma.emailTemplate.create({ data: template })
      )
    );

    console.log(`✅ Email templates created: ${createdTemplates.length} templates`);
  } else {
    console.log(`📧 Email templates already exist: ${existingTemplates} found`);
  }
  
  console.log('🎉 Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });