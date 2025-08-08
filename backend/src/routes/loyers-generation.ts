import express from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { asyncHandler, createError } from '../middleware/errorHandler.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

const prisma = new PrismaClient();
const router = express.Router();

// Validation schemas
const generationSchema = z.object({
  mois: z.number().int().min(1).max(12, 'Le mois doit être entre 1 et 12'),
  annee: z.number().int().min(2020).max(2050, 'L\'année doit être entre 2020 et 2050'),
  contratIds: z.array(z.string()).optional(), // Si spécifié, génère seulement pour ces contrats
  forceRegeneration: z.boolean().default(false), // Pour régénérer même si existe déjà
});

// Fonction utilitaire pour calculer la date d'échéance
function calculerDateEcheance(mois: number, annee: number, jourPaiement: number): Date {
  // Le jour de paiement est généralement le premier jour du mois concerné
  // Mais peut être configuré différemment selon le contrat
  const date = new Date(annee, mois - 1, jourPaiement);
  
  // Si le jour n'existe pas dans le mois (ex: 31 février), prendre le dernier jour du mois
  if (date.getMonth() !== mois - 1) {
    date.setDate(0); // Dernier jour du mois précédent = dernier jour du mois voulu
  }
  
  return date;
}

// Fonction utilitaire pour vérifier si un contrat est actif pour une période donnée
function estContratActif(contrat: any, mois: number, annee: number): boolean {
  const currentDate = new Date();
  const dateDebut = new Date(contrat.dateDebut);
  const periodeLoyer = new Date(annee, mois - 1, 1);
  const finPeriodeLoyer = new Date(annee, mois - 1 + 1, 0); // Dernier jour du mois
  
  console.log(`🔍 Vérification contrat ${contrat.id}:`);
  console.log(`   Statut: ${contrat.statut}`);
  console.log(`   Date début: ${dateDebut.toISOString()}`);
  console.log(`   Date fin: ${contrat.dateFin || 'null'}`);
  console.log(`   Période demandée: ${periodeLoyer.toISOString()} - ${finPeriodeLoyer.toISOString()}`);
  
  // Le contrat doit être actif (condition principale avec reconduction tacite)
  if (contrat.statut !== 'ACTIF') {
    console.log(`   ❌ Contrat non actif: ${contrat.statut}`);
    return false;
  }
  
  // Le contrat doit avoir commencé avant ou pendant le mois demandé
  if (dateDebut > finPeriodeLoyer) {
    console.log(`   ❌ Contrat pas encore commencé: ${dateDebut.toISOString()} > ${finPeriodeLoyer.toISOString()}`);
    return false;
  }
  
  // Avec la reconduction tacite, on peut générer les loyers pour tous les mois
  // tant que le contrat est actif et a commencé
  console.log(`   ✅ Contrat valide pour génération`);
  
  return true;
}

// @route   POST /api/loyers/generer
// @desc    Generate loyers automatically for active contracts
// @access  Private
router.post('/generer', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const validatedData = generationSchema.parse(req.body);
  const { mois, annee, contratIds, forceRegeneration } = validatedData;

  console.log(`🚀 Génération des loyers pour ${mois}/${annee}`);
  console.log(`🔧 VERSION DEBUG ACTIVE - Récupération de TOUS les contrats`);
  console.log(`📅 Date actuelle: ${new Date().toISOString()}`);

  // Récupérer tous les contrats (le filtrage par statut se fait dans estContratActif)
  let whereClause: any = {};

  if (contratIds && contratIds.length > 0) {
    whereClause.id = { in: contratIds };
  }

  const tousLesContrats = await prisma.contrat.findMany({
    where: whereClause,
    include: {
      bien: {
        select: {
          id: true,
          adresse: true,
          ville: true,
        },
      },
      locataires: {
        include: {
          locataire: {
            select: {
              id: true,
              nom: true,
              prenom: true,
              email: true,
            },
          },
        },
      },
    },
  });

  console.log(`📋 ${tousLesContrats.length} contrats trouvés`);

  console.log(`📋 Liste des contrats trouvés:`);
  tousLesContrats.forEach(contrat => {
    console.log(`   - Contrat ${contrat.id}: statut=${contrat.statut}, dateDebut=${contrat.dateDebut}`);
  });

  // Filtrer les contrats qui sont actifs pour cette période
  const contratsAPayer = tousLesContrats.filter(contrat => 
    estContratActif(contrat, mois, annee)
  );

  console.log(`✅ ${contratsAPayer.length} contrats actifs pour cette période`);

  if (contratsAPayer.length === 0) {
    return res.json({
      success: true,
      data: {
        loyersGeneres: [],
        loyersExistants: [],
        contratsTraites: 0,
      },
      message: 'Aucun contrat actif trouvé pour cette période',
    });
  }

  // Vérifier les loyers existants si on ne force pas la régénération
  let loyersExistants: any[] = [];
  if (!forceRegeneration) {
    loyersExistants = await prisma.loyer.findMany({
      where: {
        mois,
        annee,
        contratId: { in: contratsAPayer.map(c => c.id) },
      },
    });
  }

  const contratsAvecLoyerExistant = new Set(loyersExistants.map(l => l.contratId));
  console.log(`⚠️  ${loyersExistants.length} loyers existent déjà`);

  // Contrats pour lesquels générer des loyers
  const contratsAGenerer = forceRegeneration 
    ? contratsAPayer 
    : contratsAPayer.filter(c => !contratsAvecLoyerExistant.has(c.id));

  console.log(`🔄 ${contratsAGenerer.length} loyers à générer`);

  const loyersGeneres: any[] = [];
  const erreurs: any[] = [];

  // Générer les loyers dans une transaction
  try {
    await prisma.$transaction(async (tx) => {
      for (const contrat of contratsAGenerer) {
        try {
          // Si on force la régénération, supprimer l'existant
          if (forceRegeneration) {
            await tx.loyer.deleteMany({
              where: {
                contratId: contrat.id,
                mois,
                annee,
              },
            });
          }

          // Calculer la date d'échéance
          const dateEcheance = calculerDateEcheance(mois, annee, contrat.jourPaiement);
          
          // Calculer le montant dû (loyer + charges)
          const montantDu = contrat.loyer + contrat.chargesMensuelles;

          // Créer le loyer
          const loyer = await tx.loyer.create({
            data: {
              contratId: contrat.id,
              mois,
              annee,
              montantDu,
              montantPaye: 0,
              dateEcheance,
              statut: 'EN_ATTENTE',
              commentaires: `Loyer généré automatiquement pour ${mois}/${annee}`,
            },
            include: {
              contrat: {
                include: {
                  bien: {
                    select: {
                      adresse: true,
                      ville: true,
                    },
                  },
                  locataires: {
                    include: {
                      locataire: {
                        select: {
                          nom: true,
                          prenom: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          });

          loyersGeneres.push(loyer);
          console.log(`✅ Loyer généré pour contrat ${contrat.id} - ${montantDu}€`);

        } catch (error) {
          console.error(`❌ Erreur pour contrat ${contrat.id}:`, error);
          erreurs.push({
            contratId: contrat.id,
            adresse: contrat.bien?.adresse,
            erreur: error instanceof Error ? error.message : 'Erreur inconnue',
          });
        }
      }
    });

    // Créer un historique de génération
    await prisma.contratHistorique.createMany({
      data: loyersGeneres.map(loyer => ({
        contratId: loyer.contratId,
        action: 'CREATION' as const,
        description: `Génération automatique du loyer pour ${mois}/${annee}`,
        dateAction: new Date(),
        metadata: JSON.stringify({
          loyerId: loyer.id,
          montant: loyer.montantDu,
          periode: `${mois}/${annee}`,
        }),
      })),
    });

    console.log(`🎉 Génération terminée: ${loyersGeneres.length} loyers créés`);

    res.status(201).json({
      success: true,
      data: {
        loyersGeneres,
        loyersExistants: loyersExistants.length,
        contratsTraites: contratsAGenerer.length,
        erreurs,
        statistiques: {
          totalContrats: tousLesContrats.length,
          contratsActifs: contratsAPayer.length,
          loyersGeneres: loyersGeneres.length,
          loyersExistants: loyersExistants.length,
          erreurs: erreurs.length,
        },
      },
      message: `${loyersGeneres.length} loyers générés avec succès pour ${mois}/${annee}`,
    });

  } catch (error) {
    console.error('❌ Erreur lors de la génération des loyers:', error);
    throw createError('Erreur lors de la génération des loyers', 500);
  }
}));

// @route   POST /api/loyers/generer-mois-suivant
// @desc    Generate loyers for next month for all active contracts
// @access  Private
router.post('/generer-mois-suivant', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const maintenant = new Date();
  let mois = maintenant.getMonth() + 2; // Mois suivant (getMonth() est 0-indexé)
  let annee = maintenant.getFullYear();

  // Gérer le passage à l'année suivante
  if (mois > 12) {
    mois = 1;
    annee += 1;
  }

  console.log(`🗓️  Génération automatique pour le mois suivant: ${mois}/${annee}`);

  // Réutiliser la logique de génération
  const result = await router.stack[0].handle({
    ...req,
    body: { mois, annee, forceRegeneration: false },
  }, res);

  return result;
}));

// @route   GET /api/loyers/debug-contrats
// @desc    Debug contracts for a specific period
// @access  Private
router.get('/debug-contrats', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { mois = 8, annee = 2025 } = req.query;
  
  const moisNum = parseInt(mois as string);
  const anneeNum = parseInt(annee as string);
  
  // Récupérer TOUS les contrats avec détails complets
  const tousLesContrats = await prisma.contrat.findMany({
    include: {
      bien: {
        select: {
          id: true,
          adresse: true,
          ville: true,
          codePostal: true,
        },
      },
      locataires: {
        include: {
          locataire: {
            select: {
              nom: true,
              prenom: true,
              email: true,
            },
          },
        },
      },
    },
  });
  
  // Vérifier les loyers existants pour cette période
  const loyersExistants = await prisma.loyer.findMany({
    where: {
      mois: moisNum,
      annee: anneeNum,
    },
    include: {
      contrat: {
        include: {
          bien: true,
          locataires: {
            include: {
              locataire: true
            }
          }
        }
      }
    }
  });
  
  const currentDate = new Date();
  
  // Analyser chaque contrat
  const analyse = tousLesContrats.map(contrat => {
    const dateDebut = new Date(contrat.dateDebut);
    const dateFin = contrat.dateFin ? new Date(contrat.dateFin) : null;
    const periodeLoyer = new Date(anneeNum, moisNum - 1, 1);
    
    const loyerExiste = loyersExistants.find(l => l.contratId === contrat.id);
    
    const diagnostic = {
      contratId: contrat.id,
      adresse: `${contrat.bien?.adresse}, ${contrat.bien?.ville}`,
      locataires: contrat.locataires?.map(cl => `${cl.locataire.prenom} ${cl.locataire.nom}`).join(', '),
      statut: contrat.statut,
      dateDebut: dateDebut.toISOString(),
      dateFin: dateFin?.toISOString() || null,
      jourPaiement: contrat.jourPaiement,
      loyer: contrat.loyer,
      charges: contrat.chargesMensuelles,
      loyerExiste: !!loyerExiste,
      loyerExisteDetails: loyerExiste ? {
        id: loyerExiste.id,
        montantDu: loyerExiste.montantDu,
        statut: loyerExiste.statut
      } : null,
      diagnostics: {
        estActif: contrat.statut === 'ACTIF',
        aCommence: dateDebut <= currentDate,
        pasFini: !dateFin || dateFin >= currentDate,
        periodeValide: periodeLoyer <= currentDate,
        dateDebutOk: dateDebut <= new Date(anneeNum, moisNum - 1, 31, 23, 59, 59),
        dateFinOk: !dateFin || dateFin >= periodeLoyer,
      }
    };
    
    const estValide = diagnostic.diagnostics.estActif && 
                     diagnostic.diagnostics.aCommence && 
                     diagnostic.diagnostics.pasFini && 
                     diagnostic.diagnostics.periodeValide && 
                     diagnostic.diagnostics.dateDebutOk && 
                     diagnostic.diagnostics.dateFinOk;
    
    return {
      ...diagnostic,
      devraitAvoirLoyer: estValide && !diagnostic.loyerExiste,
      estValide
    };
  });
  
  res.json({
    success: true,
    data: {
      periode: `${moisNum}/${anneeNum}`,
      dateActuelle: currentDate.toISOString(),
      totalContrats: tousLesContrats.length,
      contratsActifs: analyse.filter(c => c.statut === 'ACTIF').length,
      contratsValides: analyse.filter(c => c.estValide).length,
      loyersExistants: loyersExistants.length,
      contratsSansLoyer: analyse.filter(c => c.devraitAvoirLoyer).length,
      analyse: analyse.sort((a, b) => {
        // Mettre les contrats sans loyer en premier
        if (a.devraitAvoirLoyer && !b.devraitAvoirLoyer) return -1;
        if (!a.devraitAvoirLoyer && b.devraitAvoirLoyer) return 1;
        return a.adresse.localeCompare(b.adresse);
      })
    }
  });
}));

// @route   GET /api/loyers/preview-generation
// @desc    Preview what loyers would be generated
// @access  Private
router.get('/preview-generation', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { mois, annee } = req.query;

  if (!mois || !annee) {
    throw createError('Les paramètres mois et annee sont requis', 400);
  }

  const moisNum = parseInt(mois as string);
  const anneeNum = parseInt(annee as string);

  // Validation
  if (moisNum < 1 || moisNum > 12 || anneeNum < 2020 || anneeNum > 2050) {
    throw createError('Mois ou année invalide', 400);
  }

  // Récupérer les contrats actifs
  const contratsActifs = await prisma.contrat.findMany({
    where: {
      statut: 'ACTIF',
    },
    include: {
      bien: {
        select: {
          id: true,
          adresse: true,
          ville: true,
          codePostal: true,
        },
      },
      locataires: {
        include: {
          locataire: {
            select: {
              nom: true,
              prenom: true,
              email: true,
            },
          },
        },
      },
    },
  });

  // Filtrer les contrats actifs pour cette période
  const contratsAPayer = contratsActifs.filter(contrat => 
    estContratActif(contrat, moisNum, anneeNum)
  );

  // Vérifier les loyers existants
  const loyersExistants = await prisma.loyer.findMany({
    where: {
      mois: moisNum,
      annee: anneeNum,
      contratId: { in: contratsAPayer.map(c => c.id) },
    },
  });

  const contratsAvecLoyerExistant = new Set(loyersExistants.map(l => l.contratId));

  // Préparer la preview
  const preview = contratsAPayer.map(contrat => {
    const dateEcheance = calculerDateEcheance(moisNum, anneeNum, contrat.jourPaiement);
    const montantDu = contrat.loyer + contrat.chargesMensuelles;
    const loyerExiste = contratsAvecLoyerExistant.has(contrat.id);

    return {
      contratId: contrat.id,
      bien: {
        adresse: contrat.bien?.adresse,
        ville: contrat.bien?.ville,
        codePostal: contrat.bien?.codePostal,
      },
      locataires: contrat.locataires?.map(cl => ({
        nom: cl.locataire.nom,
        prenom: cl.locataire.prenom,
        email: cl.locataire.email,
      })),
      montantDu,
      dateEcheance,
      loyerExiste,
      action: loyerExiste ? 'EXISTE_DEJA' : 'A_GENERER',
    };
  });

  const statistiques = {
    totalContrats: contratsActifs.length,
    contratsActifs: contratsAPayer.length,
    aGenerer: preview.filter(p => !p.loyerExiste).length,
    existeDeja: preview.filter(p => p.loyerExiste).length,
    montantTotal: preview.reduce((sum, p) => sum + (p.loyerExiste ? 0 : p.montantDu), 0),
  };

  res.json({
    success: true,
    data: {
      periode: { mois: moisNum, annee: anneeNum },
      preview,
      statistiques,
    },
  });
}));

export default router;