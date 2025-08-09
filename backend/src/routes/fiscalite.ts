import express from 'express';
import { z } from 'zod';
import { prisma } from '../server.js';
import { logger } from '../utils/logger.js';
import PDFDocument from 'pdfkit';

const router = express.Router();

// Fonction partagée pour calculer les occurrences de charges récurrentes (identique à charges.ts)
function generateRecurringCharges(charge: any, year: number) {
  if (charge.type === 'PONCTUELLE') return [];
  
  const occurrences = [];
  const startDate = charge.dateDebut ? new Date(charge.dateDebut) : new Date(charge.date);
  const endDate = charge.dateFin ? new Date(charge.dateFin) : new Date(year, 11, 31);
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31);
  
  let intervalMonths = 0;
  switch (charge.type) {
    case 'MENSUELLE': intervalMonths = 1; break;
    case 'TRIMESTRIELLE': intervalMonths = 3; break;
    case 'SEMESTRIELLE': intervalMonths = 6; break;
    case 'ANNUELLE': intervalMonths = 12; break;
  }
  
  if (intervalMonths === 0) return [];
  
  let currentDate = new Date(Math.max(startDate.getTime(), yearStart.getTime()));
  
  while (currentDate <= endDate && currentDate <= yearEnd) {
    if (currentDate >= yearStart) {
      occurrences.push({
        ...charge,
        date: new Date(currentDate),
        montantProjecte: charge.montant
      });
    }
    currentDate.setMonth(currentDate.getMonth() + intervalMonths);
  }
  
  return occurrences;
}

// Schémas de validation
const fiscalDataSchema = z.object({
  annee: z.number().min(2020).max(new Date().getFullYear()),
  proprietaireId: z.string().optional()
});

const declaration2044Schema = z.object({
  annee: z.number().min(2020).max(new Date().getFullYear()),
  proprietaireId: z.string().optional()
});

// GET /api/fiscalite/data - Récupérer les données fiscales
router.get('/data', async (req, res) => {
  try {
    const annee = parseInt(req.query.annee as string) || new Date().getFullYear();
    const proprietaireId = req.query.proprietaireId as string;

    // Construire les filtres
    const whereClause: any = { annee };
    if (proprietaireId) {
      whereClause.contrat = {
        bien: {
          proprietaires: {
            some: { proprietaireId }
          }
        }
      };
    }

    // Récupérer les loyers
    const loyers = await prisma.loyer.findMany({
      where: whereClause,
      include: {
        contrat: {
          include: {
            bien: {
              include: {
                proprietaires: {
                  include: {
                    proprietaire: true
                  }
                }
              }
            }
          }
        }
      }
    });

    // Récupérer les charges (ponctuelles + récurrentes)
    const chargesWherePonctuelles: any = {
      type: 'PONCTUELLE',
      date: {
        gte: new Date(annee, 0, 1),
        lte: new Date(annee, 11, 31)
      }
    };

    const chargesWhereRecurrentes: any = {
      type: { not: 'PONCTUELLE' },
      OR: [
        { dateFin: null },
        { dateFin: { gte: new Date(annee, 0, 1) } },
      ],
      AND: [
        {
          OR: [
            { dateDebut: null },
            { dateDebut: { lte: new Date(annee, 11, 31) } },
          ]
        }
      ]
    };

    if (proprietaireId) {
      const proprietaireFilter = {
        bien: {
          proprietaires: {
            some: { proprietaireId }
          }
        }
      };
      chargesWherePonctuelles.bien = proprietaireFilter.bien;
      chargesWhereRecurrentes.bien = proprietaireFilter.bien;
    }

    const [chargesPonctuelles, chargesRecurrentes] = await Promise.all([
      prisma.charge.findMany({
        where: chargesWherePonctuelles,
        include: {
          bien: {
            include: {
              proprietaires: {
                include: {
                  proprietaire: true
                }
              }
            }
          }
        }
      }),
      prisma.charge.findMany({
        where: chargesWhereRecurrentes,
        include: {
          bien: {
            include: {
              proprietaires: {
                include: {
                  proprietaire: true
                }
              }
            }
          }
        }
      })
    ]);

    // Générer les occurrences des charges récurrentes pour l'année
    const chargesRecurrentesProjectees = chargesRecurrentes.flatMap(charge => 
      generateRecurringCharges(charge, annee)
    );

    // Combiner toutes les charges
    const charges = [...chargesPonctuelles, ...chargesRecurrentesProjectees];

    // Calculer les revenus
    const totalLoyers = loyers.reduce((sum, loyer) => sum + (loyer.montantPaye || 0), 0);
    
    // Calculer les charges par catégorie
    let travaux = 0, fraisGestion = 0, assurances = 0, taxeFonciere = 0, interetsEmprunt = 0, autres = 0;
    
    charges.forEach(charge => {
      switch (charge.categorie) {
        case 'TRAVAUX':
        case 'ENTRETIEN':
          travaux += charge.montant;
          break;
        case 'GESTION':
        case 'SYNDIC':
          fraisGestion += charge.montant;
          break;
        case 'ASSURANCE':
          assurances += charge.montant;
          break;
        case 'TAXE_FONCIERE':
          taxeFonciere += charge.montant;
          break;
        case 'CREDIT_IMMO':
          interetsEmprunt += charge.montant;
          break;
        default:
          autres += charge.montant;
          break;
      }
    });

    const totalCharges = travaux + fraisGestion + assurances + taxeFonciere + interetsEmprunt + autres;
    const resultatFoncier = totalLoyers - totalCharges;

    // Calculer l'optimisation
    const microFoncierEligible = totalLoyers <= 15000;
    const abattementMicroFoncier = microFoncierEligible ? totalLoyers * 0.3 : 0;

    const fiscalData = {
      annee,
      revenus: {
        loyers: totalLoyers,
        autresRevenus: 0,
        total: totalLoyers
      },
      charges: {
        travaux,
        interetsEmprunt,
        fraisGestion,
        assurances,
        taxeFonciere,
        autres,
        total: totalCharges
      },
      resultat: {
        benefice: Math.max(0, resultatFoncier),
        deficit: Math.max(0, -resultatFoncier),
        netFoncier: resultatFoncier
      },
      optimisation: {
        microFoncierEligible,
        abattementMicroFoncier,
        conseilsOptimisation: generateConseilsOptimisation(totalLoyers, totalCharges, resultatFoncier)
      }
    };

    res.json({
      success: true,
      data: fiscalData
    });

    logger.info(`Données fiscales calculées pour l'année ${annee}`);
  } catch (error) {
    logger.error('Erreur lors du calcul des données fiscales:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur lors du calcul des données fiscales'
    });
  }
});

// POST /api/fiscalite/declaration-2044 - Générer la déclaration 2044
router.post('/declaration-2044', async (req, res) => {
  try {
    const { annee, proprietaireId } = declaration2044Schema.parse(req.body);

    // Récupérer les données fiscales
    const fiscalDataResponse = await fetch(`${req.protocol}://${req.get('host')}/api/fiscalite/data?annee=${annee}${proprietaireId ? `&proprietaireId=${proprietaireId}` : ''}`, {
      headers: {
        'Authorization': req.headers.authorization || ''
      }
    });
    
    const fiscalDataResult = await fiscalDataResponse.json();
    const fiscalData = fiscalDataResult.data;

    // Récupérer les biens concernés
    const whereClause: any = {};
    if (proprietaireId) {
      whereClause.proprietaires = {
        some: { proprietaireId }
      };
    }

    const biens = await prisma.bien.findMany({
      where: whereClause,
      include: {
        contrats: {
          include: {
            loyers: {
              where: { annee }
            }
          }
        },
        charges: {
          where: {
            date: {
              gte: new Date(annee, 0, 1),
              lte: new Date(annee, 11, 31)
            }
          }
        }
      }
    });

    // Calculer les détails par bien
    const bienDetails = biens.map(bien => {
      const revenus = bien.contrats.reduce((sum, contrat) => 
        sum + contrat.loyers.reduce((loyerSum, loyer) => loyerSum + (loyer.montantPaye || 0), 0), 0
      );
      
      // Calculer les charges par catégorie pour ce bien
      let travaux = 0, fraisGestion = 0, assurances = 0, taxesFoncieres = 0, 
          interetsEmprunt = 0, reparationsEntretien = 0, ameliorations = 0, autresCharges = 0;
      
      bien.charges.forEach(charge => {
        switch (charge.categorie) {
          case 'TRAVAUX':
            travaux += charge.montant;
            break;
          case 'ENTRETIEN':
            reparationsEntretien += charge.montant;
            break;
          case 'GESTION':
            fraisGestion += charge.montant;
            break;
          case 'ASSURANCE':
            assurances += charge.montant;
            break;
          case 'TAXE_FONCIERE':
            taxesFoncieres += charge.montant;
            break;
          case 'CHARGES_COPROPRIETE':
          case 'SYNDIC':
            fraisGestion += charge.montant;
            break;
          case 'ELECTRICITE':
          case 'GAZ':
          case 'EAU':
          case 'INTERNET':
          case 'NETTOYAGE':
          case 'GARDIENNAGE':
            autresCharges += charge.montant;
            break;
          default:
            autresCharges += charge.montant;
            break;
        }
      });
      
      const totalCharges = travaux + fraisGestion + assurances + taxesFoncieres + 
                          interetsEmprunt + reparationsEntretien + ameliorations + autresCharges;
      
      return {
        adresse: `${bien.adresse}, ${bien.ville}`,
        revenus,
        charges: totalCharges,
        resultat: revenus - totalCharges,
        detailCharges: {
          assurances,
          taxesFoncieres,
          interetsEmprunt,
          reparationsEntretien: reparationsEntretien + travaux, // Grouper travaux et entretien
          ameliorations,
          fraisGestion,
          autresCharges
        }
      };
    });

    // Générer les cases de la déclaration 2044
    const declaration2044 = {
      annee,
      cases: {
        case211: Math.round(fiscalData.revenus.total), // Revenus bruts
        case212: 0, // Revenus exceptionnels
        case221: Math.round(fiscalData.charges.total), // Frais et charges
        case222: Math.round(fiscalData.charges.interetsEmprunt), // Intérêts d'emprunt
        case223: 0, // Autres charges
        case230: fiscalData.resultat.deficit > 0 ? Math.min(Math.round(fiscalData.resultat.deficit), 10700) : 0, // Déficit imputable
        case231: fiscalData.resultat.deficit > 10700 ? Math.round(fiscalData.resultat.deficit - 10700) : 0 // Déficit reportable
      },
      biens: bienDetails
    };

    res.json({
      success: true,
      data: declaration2044
    });

    logger.info(`Déclaration 2044 générée pour l'année ${annee}`);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Données invalides',
        details: error.errors
      });
    }

    logger.error('Erreur lors de la génération de la déclaration 2044:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de la génération de la déclaration 2044'
    });
  }
});

// POST /api/fiscalite/declaration-2044/pdf - Export PDF de la déclaration 2044
router.post('/declaration-2044/pdf', async (req, res) => {
  try {
    const { annee, proprietaireId } = declaration2044Schema.parse(req.body);

    // Récupérer la déclaration 2044
    const declarationResponse = await fetch(`${req.protocol}://${req.get('host')}/api/fiscalite/declaration-2044`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || ''
      },
      body: JSON.stringify({ annee, proprietaireId })
    });
    
    const declarationResult = await declarationResponse.json();
    const declaration = declarationResult.data;

    // Générer le PDF avec PDFKit
    const pdfBuffer = await generateDeclaration2044PDF(declaration);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="declaration-2044-${annee}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    res.send(pdfBuffer);

    logger.info(`PDF de la déclaration 2044 généré pour l'année ${annee}`);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Données invalides',
        details: error.errors
      });
    }

    logger.error('Erreur lors de la génération du PDF:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de la génération du PDF'
    });
  }
});

// POST /api/fiscalite/export-excel - Export Excel des données fiscales
router.post('/export-excel', async (req, res) => {
  try {
    const { annee, proprietaireId } = declaration2044Schema.parse(req.body);

    // Récupérer la déclaration 2044
    const declarationResponse = await fetch(`${req.protocol}://${req.get('host')}/api/fiscalite/declaration-2044`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || ''
      },
      body: JSON.stringify({ annee, proprietaireId })
    });
    
    const declarationResult = await declarationResponse.json();
    const declaration = declarationResult.data;

    // Générer le contenu CSV simple (à améliorer avec une vraie lib Excel plus tard)
    const csvContent = generateDeclaration2044CSV(declaration);
    
    const buffer = Buffer.from(csvContent, 'utf-8');
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="donnees-fiscales-${annee}.csv"`);
    res.setHeader('Content-Length', buffer.length);
    
    res.send(buffer);

    logger.info(`Fichier Excel des données fiscales généré pour l'année ${annee}`);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Données invalides',
        details: error.errors
      });
    }

    logger.error('Erreur lors de la génération du fichier Excel:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de la génération du fichier Excel'
    });
  }
});

// GET /api/fiscalite/optimisation - Conseils d'optimisation fiscale
router.get('/optimisation', async (req, res) => {
  try {
    const annee = parseInt(req.query.annee as string) || new Date().getFullYear();
    const proprietaireId = req.query.proprietaireId as string;

    // Récupérer les données fiscales
    const fiscalDataResponse = await fetch(`${req.protocol}://${req.get('host')}/api/fiscalite/data?annee=${annee}${proprietaireId ? `&proprietaireId=${proprietaireId}` : ''}`, {
      headers: {
        'Authorization': req.headers.authorization || ''
      }
    });
    
    const fiscalDataResult = await fiscalDataResponse.json();
    const fiscalData = fiscalDataResult.data;

    // Générer les scénarios d'optimisation
    const scenarios = generateOptimisationScenarios(fiscalData);
    
    // Générer les conseils
    const conseils = generateConseilsOptimisation(
      fiscalData.revenus.total,
      fiscalData.charges.total,
      fiscalData.resultat.netFoncier
    );

    // Générer les échéances importantes
    const echeances = [
      {
        date: `${annee + 1}-05-20`,
        description: 'Date limite déclaration papier',
        importance: 'haute' as const
      },
      {
        date: `${annee + 1}-05-31`,
        description: 'Date limite déclaration en ligne',
        importance: 'haute' as const
      },
      {
        date: `${annee + 1}-12-31`,
        description: 'Fin de l\'année fiscale suivante',
        importance: 'moyenne' as const
      }
    ];

    const optimisation = {
      annee,
      scenarios,
      conseils,
      echeances
    };

    res.json({
      success: true,
      data: optimisation
    });

    logger.info(`Optimisation fiscale calculée pour l'année ${annee}`);
  } catch (error) {
    logger.error('Erreur lors du calcul de l\'optimisation fiscale:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur lors du calcul de l\'optimisation fiscale'
    });
  }
});

// POST /api/fiscalite/comparer-regimes - Comparer micro-foncier vs réel
router.post('/comparer-regimes', async (req, res) => {
  try {
    const { annee, revenus, charges } = req.body;

    if (!revenus || !charges || !annee) {
      return res.status(400).json({
        success: false,
        error: 'Paramètres manquants'
      });
    }

    // Régime réel
    const resultatReel = revenus - charges;
    const imposableReel = Math.max(0, resultatReel);

    // Régime micro-foncier
    const eligibleMicroFoncier = revenus <= 15000;
    const abattement = eligibleMicroFoncier ? revenus * 0.3 : 0;
    const imposableMicroFoncier = eligibleMicroFoncier ? Math.max(0, revenus - abattement) : 0;

    // Calcul de l'avantage
    let avantage = '';
    let economie = 0;

    if (eligibleMicroFoncier) {
      if (imposableReel < imposableMicroFoncier) {
        avantage = 'reel';
        economie = imposableMicroFoncier - imposableReel;
      } else {
        avantage = 'micro-foncier';
        economie = imposableReel - imposableMicroFoncier;
      }
    } else {
      avantage = 'reel-obligatoire';
    }

    const comparaison = {
      annee,
      reel: {
        revenus,
        charges,
        resultat: resultatReel,
        imposable: imposableReel
      },
      microFoncier: {
        eligible: eligibleMicroFoncier,
        revenus,
        abattement,
        imposable: imposableMicroFoncier
      },
      recommandation: {
        regime: avantage,
        economie,
        explication: getExplicationRegime(avantage, economie, eligibleMicroFoncier)
      }
    };

    res.json({
      success: true,
      data: comparaison
    });

    logger.info(`Comparaison des régimes fiscaux effectuée pour l'année ${annee}`);
  } catch (error) {
    logger.error('Erreur lors de la comparaison des régimes:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de la comparaison des régimes'
    });
  }
});

// GET /api/fiscalite/charges-ventilation - Récupérer la ventilation des charges
router.get('/charges-ventilation', async (req, res) => {
  try {
    const annee = parseInt(req.query.annee as string) || new Date().getFullYear();
    const proprietaireId = req.query.proprietaireId as string;

    // Construire les filtres de base pour les charges
    const whereClause: any = {
      date: {
        gte: new Date(annee, 0, 1),
        lte: new Date(annee, 11, 31)
      }
    };

    if (proprietaireId) {
      whereClause.bien = {
        proprietaires: {
          some: { proprietaireId }
        }
      };
    }

    // Récupérer les charges avec les détails des biens
    const charges = await prisma.charge.findMany({
      where: whereClause,
      include: {
        bien: {
          include: {
            proprietaires: {
              include: {
                proprietaire: true
              }
            }
          }
        }
      },
      orderBy: {
        date: 'desc'
      }
    });

    // Grouper les charges par catégorie et bien
    const ventilation = charges.reduce((acc: any, charge) => {
      const bienKey = `${charge.bien.adresse}_${charge.bien.id}`;
      
      if (!acc[bienKey]) {
        acc[bienKey] = {
          bien: {
            id: charge.bien.id,
            adresse: charge.bien.adresse,
            ville: charge.bien.ville,
            codePostal: charge.bien.codePostal
          },
          categories: {},
          totalBien: 0
        };
      }

      if (!acc[bienKey].categories[charge.categorie]) {
        acc[bienKey].categories[charge.categorie] = {
          charges: [],
          total: 0
        };
      }

      acc[bienKey].categories[charge.categorie].charges.push({
        id: charge.id,
        description: charge.description,
        montant: charge.montant,
        date: charge.date,
        facture: charge.facture,
        payee: charge.payee
      });

      acc[bienKey].categories[charge.categorie].total += charge.montant;
      acc[bienKey].totalBien += charge.montant;

      return acc;
    }, {});

    // Calculer les totaux globaux par catégorie
    const totauxCategories: any = {};
    let totalGeneral = 0;

    Object.values(ventilation).forEach((bien: any) => {
      Object.entries(bien.categories).forEach(([categorie, data]: [string, any]) => {
        if (!totauxCategories[categorie]) {
          totauxCategories[categorie] = 0;
        }
        totauxCategories[categorie] += data.total;
        totalGeneral += data.total;
      });
    });

    const result = {
      annee,
      ventilation: Object.values(ventilation),
      totauxCategories,
      totalGeneral,
      nombreCharges: charges.length
    };

    res.json({
      success: true,
      data: result
    });

    logger.info(`Ventilation des charges récupérée pour l'année ${annee}`);
  } catch (error) {
    logger.error('Erreur lors de la récupération de la ventilation des charges:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de la récupération de la ventilation des charges'
    });
  }
});

// POST /api/fiscalite/charges-ventilation - Sauvegarder la ventilation des charges
router.post('/charges-ventilation', async (req, res) => {
  try {
    const { annee, proprietaireId, ventilation } = req.body;

    if (!annee || !ventilation) {
      return res.status(400).json({
        success: false,
        error: 'Données manquantes'
      });
    }

    // Pour l'instant, cette route retourne juste un succès
    // Dans une version future, on pourrait sauvegarder des ajustements de ventilation
    res.json({
      success: true,
      message: 'Ventilation des charges sauvegardée',
      data: {
        annee,
        proprietaireId,
        dateSauvegarde: new Date().toISOString()
      }
    });

    logger.info(`Ventilation des charges sauvegardée pour l'année ${annee}`);
  } catch (error) {
    logger.error('Erreur lors de la sauvegarde de la ventilation des charges:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de la sauvegarde de la ventilation des charges'
    });
  }
});

// GET /api/fiscalite/baremes/:annee - Récupérer les barèmes fiscaux
router.get('/baremes/:annee', async (req, res) => {
  try {
    const annee = parseInt(req.params.annee);

    if (annee < 2020 || annee > new Date().getFullYear()) {
      return res.status(400).json({
        success: false,
        error: 'Année invalide'
      });
    }

    // Barèmes fiscaux (à adapter selon les années)
    const baremes = {
      annee,
      microFoncier: {
        seuil: 15000,
        abattement: 0.3
      },
      deficitFoncier: {
        imputationMax: 10700,
        reportMax: 10 // années
      },
      tranchesImpot: getTranchesPImpot(annee),
      prelevementsSociaux: {
        taux: 0.172 // 17.2%
      }
    };

    res.json({
      success: true,
      data: baremes
    });

    logger.info(`Barèmes fiscaux récupérés pour l'année ${annee}`);
  } catch (error) {
    logger.error('Erreur lors de la récupération des barèmes:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de la récupération des barèmes'
    });
  }
});

// Fonctions utilitaires
function generateConseilsOptimisation(revenus: number, charges: number, resultat: number): string[] {
  const conseils: string[] = [];

  if (revenus <= 15000) {
    conseils.push('Vous êtes éligible au régime micro-foncier avec un abattement forfaitaire de 30%');
  }

  if (resultat < 0) {
    conseils.push('Votre déficit foncier peut être imputé sur vos autres revenus dans la limite de 10 700€ par an');
    conseils.push('Le déficit excédentaire peut être reporté sur les revenus fonciers des 10 années suivantes');
  }

  if (charges > 0) {
    conseils.push('Pensez à conserver tous vos justificatifs de charges déductibles');
    conseils.push('Les travaux d\'amélioration peuvent être amortis ou déduits selon leur nature');
  }

  if (revenus > 15000) {
    conseils.push('Vous devez obligatoirement opter pour le régime réel d\'imposition');
  }

  return conseils;
}

function generateOptimisationScenarios(fiscalData: any): any[] {
  const scenarios = [];

  // Scénario micro-foncier si éligible
  if (fiscalData.optimisation.microFoncierEligible) {
    scenarios.push({
      nom: 'Régime micro-foncier',
      description: 'Appliquer l\'abattement forfaitaire de 30%',
      impact: fiscalData.optimisation.abattementMicroFoncier,
      avantages: ['Simplicité administrative', 'Pas de justificatifs à conserver'],
      inconvenients: ['Abattement forfaitaire qui peut être insuffisant']
    });
  }

  // Scénario travaux
  if (fiscalData.charges.travaux > 0) {
    scenarios.push({
      nom: 'Optimisation des travaux',
      description: 'Planifier les gros travaux sur plusieurs années',
      impact: fiscalData.charges.travaux * 0.1, // Estimation
      avantages: ['Lissage de la déduction', 'Optimisation du déficit foncier'],
      inconvenients: ['Nécessite une planification']
    });
  }

  return scenarios;
}

function getExplicationRegime(avantage: string, economie: number, eligible: boolean): string {
  if (!eligible) {
    return 'Vos revenus fonciers dépassent 15 000€, vous devez obligatoirement opter pour le régime réel.';
  }

  if (avantage === 'micro-foncier') {
    return `Le régime micro-foncier vous fait économiser environ ${economie.toFixed(0)}€ d'impôts grâce à l'abattement forfaitaire.`;
  } else if (avantage === 'reel') {
    return `Le régime réel est plus avantageux car vos charges déductibles dépassent l'abattement forfaitaire de 30%.`;
  }

  return 'Les deux régimes sont équivalents dans votre situation.';
}

function getTranchesPImpot(annee: number): any[] {
  // Barème simplifié (à adapter selon les années)
  return [
    { min: 0, max: 10777, taux: 0 },
    { min: 10778, max: 27478, taux: 0.11 },
    { min: 27479, max: 78570, taux: 0.30 },
    { min: 78571, max: 168994, taux: 0.41 },
    { min: 168995, max: Infinity, taux: 0.45 }
  ];
}

async function generateDeclaration2044PDF(declaration: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const buffers: Buffer[] = [];

    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(buffers);
      resolve(pdfBuffer);
    });
    doc.on('error', reject);

    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(amount);
    };

    // En-tête
    doc.fontSize(20).font('Helvetica-Bold');
    doc.text(`DÉCLARATION 2044 - REVENUS FONCIERS ${declaration.annee}`, { align: 'center' });
    doc.moveDown(1);

    // Cases principales
    doc.fontSize(16).font('Helvetica-Bold');
    doc.text('CASES PRINCIPALES', { underline: true });
    doc.moveDown(0.5);

    doc.fontSize(12).font('Helvetica');
    
    const cases = [
      { code: '211', label: 'Revenus bruts', value: declaration.cases.case211 },
      { code: '212', label: 'Revenus exceptionnels', value: declaration.cases.case212 },
      { code: '221', label: 'Frais et charges', value: declaration.cases.case221 },
      { code: '222', label: 'Intérêts d\'emprunt', value: declaration.cases.case222 },
      { code: '230', label: 'Déficit imputable', value: declaration.cases.case230 },
      { code: '231', label: 'Déficit reportable', value: declaration.cases.case231 }
    ];

    cases.forEach(caseItem => {
      doc.text(`Case ${caseItem.code} - ${caseItem.label}:`, 50, doc.y, { continued: false });
      doc.text(formatCurrency(caseItem.value || 0), 350, doc.y - 12, { align: 'right' });
      doc.moveDown(0.3);
    });

    // Résultat
    doc.moveDown(0.5);
    const resultat = declaration.cases.case211 - declaration.cases.case221;
    doc.fontSize(14).font('Helvetica-Bold');
    doc.text('RÉSULTAT FONCIER:', 50, doc.y, { continued: false });
    doc.fillColor(resultat >= 0 ? 'green' : 'red');
    doc.text(formatCurrency(resultat || 0), 350, doc.y - 14, { align: 'right' });
    doc.fillColor('black');
    doc.moveDown(1);

    // Détail par bien
    if (declaration.biens && declaration.biens.length > 0) {
      doc.fontSize(16).font('Helvetica-Bold');
      doc.text('DÉTAIL PAR BIEN IMMOBILIER', { underline: true });
      doc.moveDown(0.5);

      declaration.biens.forEach((bien: any, index: number) => {
        // Nouvelle page si nécessaire
        if (doc.y > 700) {
          doc.addPage();
        }

        doc.fontSize(14).font('Helvetica-Bold');
        doc.text(`${index + 1}. ${bien.adresse}`, { underline: true });
        doc.moveDown(0.3);

        doc.fontSize(12).font('Helvetica');
        
        // Résumé du bien
        doc.text(`Revenus:`, 70, doc.y, { continued: false });
        doc.text(formatCurrency(bien.revenus || 0), 400, doc.y - 12, { align: 'right' });
        doc.moveDown(0.2);
        
        doc.text(`Charges:`, 70, doc.y, { continued: false });
        doc.text(formatCurrency(bien.charges || 0), 400, doc.y - 12, { align: 'right' });
        doc.moveDown(0.2);
        
        doc.font('Helvetica-Bold');
        doc.text(`Résultat:`, 70, doc.y, { continued: false });
        doc.fillColor((bien.resultat || 0) >= 0 ? 'green' : 'red');
        doc.text(formatCurrency(bien.resultat || 0), 400, doc.y - 12, { align: 'right' });
        doc.fillColor('black');
        doc.moveDown(0.5);

        // Détail des charges
        if (bien.detailCharges) {
          doc.fontSize(11).font('Helvetica-Bold');
          doc.text('Charges déductibles détaillées par catégorie:', 70);
          doc.moveDown(0.3);

          doc.font('Helvetica');
          const chargesDetails = [
            { label: 'Primes d\'assurance', value: bien.detailCharges.assurances },
            { label: 'Taxes foncières et taxes annexes', value: bien.detailCharges.taxesFoncieres },
            { label: 'Intérêts d\'emprunt', value: bien.detailCharges.interetsEmprunt },
            { label: 'Dépenses de réparation et d\'entretien', value: bien.detailCharges.reparationsEntretien },
            { label: 'Dépenses d\'amélioration', value: bien.detailCharges.ameliorations },
            { label: 'Frais de gestion et d\'administration', value: bien.detailCharges.fraisGestion },
            { label: 'Autres charges déductibles', value: bien.detailCharges.autresCharges }
          ];

          chargesDetails.forEach(charge => {
            doc.text(`• ${charge.label}:`, 90, doc.y, { continued: false });
            doc.text(formatCurrency(charge.value || 0), 400, doc.y - 12, { align: 'right' });
            doc.moveDown(0.2);
          });
        }
        
        doc.moveDown(0.8);
      });
    }

    // Récapitulatif global par catégorie
    if (declaration.biens && declaration.biens.length > 0) {
      doc.addPage();
      doc.fontSize(16).font('Helvetica-Bold');
      doc.text('RÉCAPITULATIF GLOBAL - RÉPARTITION PAR CATÉGORIE', { align: 'center', underline: true });
      doc.moveDown(1);

      // Calculer les totaux par catégorie
      const totauxCategories = {
        assurances: 0,
        taxesFoncieres: 0,
        interetsEmprunt: 0,
        reparationsEntretien: 0,
        ameliorations: 0,
        fraisGestion: 0,
        autresCharges: 0
      };

      declaration.biens.forEach((bien: any) => {
        if (bien.detailCharges) {
          totauxCategories.assurances += bien.detailCharges.assurances || 0;
          totauxCategories.taxesFoncieres += bien.detailCharges.taxesFoncieres || 0;
          totauxCategories.interetsEmprunt += bien.detailCharges.interetsEmprunt || 0;
          totauxCategories.reparationsEntretien += bien.detailCharges.reparationsEntretien || 0;
          totauxCategories.ameliorations += bien.detailCharges.ameliorations || 0;
          totauxCategories.fraisGestion += bien.detailCharges.fraisGestion || 0;
          totauxCategories.autresCharges += bien.detailCharges.autresCharges || 0;
        }
      });

      const totalGeneral = Object.values(totauxCategories).reduce((sum, val) => sum + val, 0);

      doc.fontSize(12).font('Helvetica');
      
      const categoriesGlobales = [
        { label: 'Primes d\'assurance', value: totauxCategories.assurances },
        { label: 'Taxes foncières et taxes annexes', value: totauxCategories.taxesFoncieres },
        { label: 'Intérêts d\'emprunt', value: totauxCategories.interetsEmprunt },
        { label: 'Dépenses de réparation et d\'entretien', value: totauxCategories.reparationsEntretien },
        { label: 'Dépenses d\'amélioration', value: totauxCategories.ameliorations },
        { label: 'Frais de gestion et d\'administration', value: totauxCategories.fraisGestion },
        { label: 'Autres charges déductibles', value: totauxCategories.autresCharges }
      ];

      categoriesGlobales.forEach(categorie => {
        const pourcentage = totalGeneral > 0 ? ((categorie.value / totalGeneral) * 100).toFixed(1) : '0.0';
        
        doc.text(`${categorie.label}:`, 50, doc.y, { continued: false });
        doc.text(`${formatCurrency(categorie.value)} (${pourcentage}%)`, 400, doc.y - 12, { align: 'right' });
        doc.moveDown(0.3);
      });

      doc.moveDown(0.5);
      doc.fontSize(14).font('Helvetica-Bold');
      doc.text('TOTAL CHARGES:', 50, doc.y, { continued: false });
      doc.text(formatCurrency(totalGeneral), 400, doc.y - 14, { align: 'right' });
    }

    // Pied de page
    doc.moveDown(1);
    doc.fontSize(10).font('Helvetica');
    doc.text(`Document généré le ${new Date().toLocaleDateString('fr-FR')}`, { align: 'center' });
    doc.text('Source: Application de gestion locative', { align: 'center' });

    doc.end();
  });
}

function generateDeclaration2044CSV(declaration: any): string {
  let csv = `"Type","Valeur","Description"\n`;
  
  // Cases principales
  csv += `"Case 211","${declaration.cases.case211}","Revenus bruts"\n`;
  csv += `"Case 212","${declaration.cases.case212}","Revenus exceptionnels"\n`;
  csv += `"Case 221","${declaration.cases.case221}","Frais et charges"\n`;
  csv += `"Case 222","${declaration.cases.case222}","Intérêts d'emprunt"\n`;
  csv += `"Case 230","${declaration.cases.case230}","Déficit imputable"\n`;
  csv += `"Case 231","${declaration.cases.case231}","Déficit reportable"\n`;
  
  csv += `\n"Bien","Revenus","Charges","Résultat"\n`;
  
  if (declaration.biens && declaration.biens.length > 0) {
    declaration.biens.forEach((bien: any) => {
      csv += `"${bien.adresse}","${bien.revenus}","${bien.charges}","${bien.resultat}"\n`;
    });
  }
  
  return csv;
}

export default router;