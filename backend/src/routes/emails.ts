import express from 'express';
import { z } from 'zod';
import { asyncHandler, createError } from '../middleware/errorHandler.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import nodemailer from 'nodemailer';
import { prisma } from '../server.js';
const router = express.Router();

// Validation schemas
const emailConfigSchema = z.object({
  nom: z.string().min(1, 'Le nom est requis'),
  fournisseur: z.enum(['GMAIL', 'ORANGE', 'OUTLOOK', 'YAHOO', 'CUSTOM']),
  email: z.string().email('Email invalide'),
  motDePasse: z.string().min(1, 'Le mot de passe est requis'),
  serveurSMTP: z.string().min(1, 'Le serveur SMTP est requis'),
  portSMTP: z.number().min(1).max(65535),
  securite: z.enum(['TLS', 'SSL', 'NONE']),
  actif: z.boolean().default(true),
  parDefaut: z.boolean().default(false),
});

const emailTemplateSchema = z.object({
  nom: z.string().min(1, 'Le nom est requis'),
  sujet: z.string().min(1, 'Le sujet est requis'),
  contenu: z.string().min(1, 'Le contenu est requis'),
  type: z.enum(['RETARD', 'RELANCE', 'MISE_EN_DEMEURE', 'INFORMATION', 'QUITTANCE', 'BIENVENUE', 'CUSTOM']),
  variables: z.array(z.string()).default([]),
  actif: z.boolean().default(true),
});

// @route   GET /api/emails/configs
// @desc    Get all email configurations
// @access  Private
router.get('/configs', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { page = '1', limit = '10', search, actif } = req.query;
  
  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;

  const where: any = {};

  if (search) {
    where.OR = [
      { nom: { contains: search as string } },
      { email: { contains: search as string } },
      { fournisseur: { contains: search as string } },
    ];
  }

  if (actif !== undefined) {
    where.actif = actif === 'true';
  }

  const [configs, total] = await Promise.all([
    prisma.emailConfig.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: [
        { parDefaut: 'desc' },
        { createdAt: 'desc' }
      ],
      select: {
        id: true,
        nom: true,
        fournisseur: true,
        email: true,
        serveurSMTP: true,
        portSMTP: true,
        securite: true,
        actif: true,
        parDefaut: true,
        createdAt: true,
        updatedAt: true,
        // Exclure le mot de passe des résultats
      },
    }),
    prisma.emailConfig.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      configs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    },
  });
}));

// @route   GET /api/emails/configs/:id
// @desc    Get single email configuration
// @access  Private
router.get('/configs/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const config = await prisma.emailConfig.findUnique({
    where: { id: req.params.id },
    select: {
      id: true,
      nom: true,
      fournisseur: true,
      email: true,
      serveurSMTP: true,
      portSMTP: true,
      securite: true,
      actif: true,
      parDefaut: true,
      createdAt: true,
      updatedAt: true,
      // Exclure le mot de passe
    },
  });

  if (!config) {
    throw createError('Configuration email non trouvée', 404);
  }

  res.json({
    success: true,
    data: config,
  });
}));

// @route   POST /api/emails/configs
// @desc    Create email configuration
// @access  Private
router.post('/configs', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const validatedData = emailConfigSchema.parse(req.body);

  // Vérifier que l'email n'existe pas déjà
  const existing = await prisma.emailConfig.findFirst({
    where: { email: validatedData.email },
  });

  if (existing) {
    throw createError('Une configuration avec cet email existe déjà', 400);
  }

  // Si c'est marqué comme par défaut, désactiver les autres
  if (validatedData.parDefaut) {
    await prisma.emailConfig.updateMany({
      where: { parDefaut: true },
      data: { parDefaut: false },
    });
  }

  const config = await prisma.emailConfig.create({
    data: validatedData,
    select: {
      id: true,
      nom: true,
      fournisseur: true,
      email: true,
      serveurSMTP: true,
      portSMTP: true,
      securite: true,
      actif: true,
      parDefaut: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  res.status(201).json({
    success: true,
    data: config,
    message: 'Configuration email créée avec succès',
  });
}));

// @route   PUT /api/emails/configs/:id
// @desc    Update email configuration
// @access  Private
router.put('/configs/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const validatedData = emailConfigSchema.partial().parse(req.body);

  const existing = await prisma.emailConfig.findUnique({
    where: { id: req.params.id },
  });

  if (!existing) {
    throw createError('Configuration email non trouvée', 404);
  }

  // Vérifier que l'email n'est pas déjà utilisé par une autre config
  if (validatedData.email) {
    const emailExists = await prisma.emailConfig.findFirst({
      where: {
        email: validatedData.email,
        id: { not: req.params.id },
      },
    });

    if (emailExists) {
      throw createError('Une configuration avec cet email existe déjà', 400);
    }
  }

  // Si c'est marqué comme par défaut, désactiver les autres
  if (validatedData.parDefaut) {
    await prisma.emailConfig.updateMany({
      where: { 
        parDefaut: true,
        id: { not: req.params.id }
      },
      data: { parDefaut: false },
    });
  }

  const config = await prisma.emailConfig.update({
    where: { id: req.params.id },
    data: validatedData,
    select: {
      id: true,
      nom: true,
      fournisseur: true,
      email: true,
      serveurSMTP: true,
      portSMTP: true,
      securite: true,
      actif: true,
      parDefaut: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  res.json({
    success: true,
    data: config,
    message: 'Configuration email mise à jour avec succès',
  });
}));

// @route   PUT /api/emails/configs/:id/default
// @desc    Set email configuration as default
// @access  Private
router.put('/configs/:id/default', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const existing = await prisma.emailConfig.findUnique({
    where: { id: req.params.id },
  });

  if (!existing) {
    throw createError('Configuration email non trouvée', 404);
  }

  // Désactiver toutes les autres configurations par défaut
  await prisma.emailConfig.updateMany({
    where: { parDefaut: true },
    data: { parDefaut: false },
  });

  // Activer celle-ci comme par défaut
  await prisma.emailConfig.update({
    where: { id: req.params.id },
    data: { 
      parDefaut: true,
      actif: true // S'assurer qu'elle est aussi active
    },
  });

  res.json({
    success: true,
    message: 'Configuration définie comme par défaut',
  });
}));

// @route   POST /api/emails/configs/:id/test
// @desc    Test email configuration
// @access  Private
router.post('/configs/:id/test', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const config = await prisma.emailConfig.findUnique({
    where: { id: req.params.id },
  });

  if (!config) {
    throw createError('Configuration email non trouvée', 404);
  }

  try {
    // Configuration spécifique selon le fournisseur
    let transportConfig: any = {
      host: config.serveurSMTP,
      port: config.portSMTP,
      secure: config.securite === 'SSL',
      auth: {
        user: config.email,
        pass: config.motDePasse,
      },
    };

    // Configuration spécifique pour Orange
    if (config.fournisseur === 'ORANGE') {
      if (config.securite === 'SSL') {
        // Configuration SSL pour Orange (port 465)
        transportConfig.secure = true;
        transportConfig.tls = {
          rejectUnauthorized: false,
          minVersion: 'TLSv1.2'
        };
      } else {
        // Configuration TLS pour Orange (port 587)
        transportConfig.tls = {
          rejectUnauthorized: false,
          minVersion: 'TLSv1.2'
        };
      }
      // Configuration d'authentification pour Orange
      transportConfig.authMethod = 'PLAIN';
    } else if (config.securite === 'TLS') {
      transportConfig.tls = {
        rejectUnauthorized: false
      };
    }

    // Créer le transporteur avec la configuration
    const transporter = nodemailer.createTransport(transportConfig);

    // Vérifier la connexion
    await transporter.verify();

    // Envoyer un email de test
    await transporter.sendMail({
      from: config.email,
      to: config.email,
      subject: 'Test de configuration - Gestion Locative',
      text: 'Ceci est un email de test pour vérifier la configuration SMTP.',
      html: `
        <h2>Test de configuration réussi</h2>
        <p>Ceci est un email de test pour vérifier la configuration SMTP.</p>
        <p><strong>Configuration:</strong> ${config.nom}</p>
        <p><strong>Serveur:</strong> ${config.serveurSMTP}:${config.portSMTP}</p>
        <p><strong>Sécurité:</strong> ${config.securite}</p>
      `,
    });

    res.json({
      success: true,
      data: {
        success: true,
        message: 'Test réussi ! Email de test envoyé.'
      }
    });
  } catch (error: any) {
    res.json({
      success: true,
      data: {
        success: false,
        message: `Échec du test: ${error.message}`
      }
    });
  }
}));

// @route   DELETE /api/emails/configs/:id
// @desc    Delete email configuration
// @access  Private
router.delete('/configs/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const existing = await prisma.emailConfig.findUnique({
    where: { id: req.params.id },
  });

  if (!existing) {
    throw createError('Configuration email non trouvée', 404);
  }

  await prisma.emailConfig.delete({
    where: { id: req.params.id },
  });

  res.json({
    success: true,
    message: 'Configuration email supprimée avec succès',
  });
}));

// Routes pour les templates
// @route   GET /api/emails/templates
// @desc    Get all email templates
// @access  Private
router.get('/templates', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { page = '1', limit = '10', search, type } = req.query;
  
  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;

  const where: any = {};

  if (search) {
    where.OR = [
      { nom: { contains: search as string } },
      { sujet: { contains: search as string } },
    ];
  }

  if (type) {
    where.type = type as string;
  }

  const [templates, total] = await Promise.all([
    prisma.emailTemplate.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: {
        createdAt: 'desc',
      },
    }),
    prisma.emailTemplate.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      templates,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    },
  });
}));

// @route   GET /api/emails/templates/:id
// @desc    Get single email template
// @access  Private
router.get('/templates/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const template = await prisma.emailTemplate.findUnique({
    where: { id: req.params.id },
  });

  if (!template) {
    throw createError('Template email non trouvé', 404);
  }

  res.json({
    success: true,
    data: {
      ...template,
      variables: JSON.parse(template.variables as string || '[]'),
    },
  });
}));

// @route   POST /api/emails/templates
// @desc    Create email template
// @access  Private
router.post('/templates', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const validatedData = emailTemplateSchema.parse(req.body);

  const template = await prisma.emailTemplate.create({
    data: {
      ...validatedData,
      variables: JSON.stringify(validatedData.variables),
    },
  });

  res.status(201).json({
    success: true,
    data: {
      ...template,
      variables: JSON.parse(template.variables as string || '[]'),
    },
    message: 'Template email créé avec succès',
  });
}));

// @route   PUT /api/emails/templates/:id
// @desc    Update email template
// @access  Private
router.put('/templates/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const validatedData = emailTemplateSchema.partial().parse(req.body);

  const existing = await prisma.emailTemplate.findUnique({
    where: { id: req.params.id },
  });

  if (!existing) {
    throw createError('Template email non trouvé', 404);
  }

  const template = await prisma.emailTemplate.update({
    where: { id: req.params.id },
    data: {
      ...validatedData,
      variables: validatedData.variables ? JSON.stringify(validatedData.variables) : undefined,
    },
  });

  res.json({
    success: true,
    data: {
      ...template,
      variables: JSON.parse(template.variables as string || '[]'),
    },
    message: 'Template email mis à jour avec succès',
  });
}));

// @route   DELETE /api/emails/templates/:id
// @desc    Delete email template
// @access  Private
router.delete('/templates/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const existing = await prisma.emailTemplate.findUnique({
    where: { id: req.params.id },
  });

  if (!existing) {
    throw createError('Template email non trouvé', 404);
  }

  await prisma.emailTemplate.delete({
    where: { id: req.params.id },
  });

  res.json({
    success: true,
    message: 'Template email supprimé avec succès',
  });
}));

// @route   POST /api/emails/templates/:id/preview
// @desc    Preview email template with sample data
// @access  Private
router.post('/templates/:id/preview', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const template = await prisma.emailTemplate.findUnique({
    where: { id: req.params.id },
  });

  if (!template) {
    throw createError('Template email non trouvé', 404);
  }

  const { variables: dataVariables } = req.body;

  // Variables d'exemple par défaut selon le type
  const defaultVariables: { [key: string]: any } = {
    RAPPEL_LOYER: {
      locataire_nom: 'Dupont',
      locataire_prenom: 'Jean',
      bien_adresse: '123 rue des Exemples',
      bien_ville: 'Paris',
      loyer_montant: '1200',
      montant_regle: '0',
      periode: 'Janvier 2025',
      montant_du: '1200',
      nb_jours_retard: '15'
    },
    QUITTANCE: {
      locataire_nom: 'Martin',
      locataire_prenom: 'Marie',
      bien_adresse: '456 avenue de la République',
      bien_ville: 'Lyon',
      loyer_montant: '950',
      periode: 'Janvier 2025',
      date_paiement: '05/01/2025'
    },
    RELANCE: {
      locataire_nom: 'Durand',
      locataire_prenom: 'Pierre',
      bien_adresse: '789 boulevard Saint-Michel',
      bien_ville: 'Marseille',
      montant_regle: '500',
      montant_du: '1500',
      nb_jours_retard: '30',
      date_limite: '15/02/2025'
    },
    BIENVENUE: {
      locataire_nom: 'Bernard',
      locataire_prenom: 'Sophie',
      bien_adresse: '321 place de la Mairie',
      bien_ville: 'Toulouse',
      date_entree: '01/02/2025',
      proprietaire_nom: 'Société ABC'
    }
  };

  // Fusionner avec les variables par défaut
  const sampleData = { ...defaultVariables[template.type] || {}, ...dataVariables };

  // Remplacer les variables dans le contenu et le sujet
  let previewSubjet = template.sujet;
  let previewContenu = template.contenu;

  Object.entries(sampleData).forEach(([key, value]) => {
    const placeholder = `{{${key}}}`;
    previewSubjet = previewSubjet.replace(new RegExp(placeholder, 'g'), String(value));
    previewContenu = previewContenu.replace(new RegExp(placeholder, 'g'), String(value));
  });

  res.json({
    success: true,
    data: {
      sujet: previewSubjet,
      contenu: previewContenu,
      variables: sampleData,
    },
  });
}));

// @route   POST /api/emails/templates/init-defaults
// @desc    Initialize default email templates if none exist
// @access  Private
router.post('/templates/init-defaults', asyncHandler(async (req: AuthenticatedRequest, res) => {
  // Vérifier si des templates existent déjà
  const existingTemplates = await prisma.emailTemplate.count();
  
  if (existingTemplates > 0) {
    return res.json({
      success: true,
      message: `Des templates existent déjà (${existingTemplates} trouvé(s)). Initialisation ignorée.`,
      data: { templatesCount: existingTemplates }
    });
  }

  // Définir les templates par défaut
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
            <p style="margin: 10px 0 0 0; font-size: 14px;">En cas de difficultés, nous vous invitons à nous contacter rapidement.</p>
          </div>

          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="color: #7f8c8d; font-size: 12px;">
              Cordialement,<br>
              L'équipe de gestion locative
            </p>
          </div>
        </div>
      `,
      type: 'RAPPEL_LOYER',
      variables: JSON.stringify([
        'locataire_nom', 'locataire_prenom', 'bien_adresse', 'bien_ville', 
        'bien_codePostal', 'periode', 'montant_du', 'nb_jours_retard'
      ]),
      actif: true
    },
    {
      nom: 'Quittance de loyer',
      sujet: 'Quittance de loyer - {{periode}} - {{bien_adresse}}',
      contenu: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #27ae60; margin: 0;">QUITTANCE DE LOYER</h1>
            <p style="color: #7f8c8d; font-size: 14px;">Gestion Locative</p>
          </div>

          <div style="background-color: #d4edda; padding: 20px; border-left: 4px solid #27ae60; margin: 20px 0;">
            <h3 style="color: #27ae60; margin-top: 0;">Paiement reçu avec succès</h3>
            <p>Nous accusons réception de votre paiement pour la période de <strong>{{periode}}</strong>.</p>
          </div>

          <div style="margin: 20px 0;">
            <h4>Détails du paiement :</h4>
            <table style="width: 100%; border-collapse: collapse; margin: 10px 0;">
              <tr style="background-color: #f8f9fa;">
                <td style="padding: 10px; border: 1px solid #ddd;"><strong>Locataire</strong></td>
                <td style="padding: 10px; border: 1px solid #ddd;">{{locataire_prenom}} {{locataire_nom}}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border: 1px solid #ddd;"><strong>Bien</strong></td>
                <td style="padding: 10px; border: 1px solid #ddd;">{{bien_adresse}}, {{bien_ville}} {{bien_codePostal}}</td>
              </tr>
              <tr style="background-color: #f8f9fa;">
                <td style="padding: 10px; border: 1px solid #ddd;"><strong>Période</strong></td>
                <td style="padding: 10px; border: 1px solid #ddd;">{{periode}}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border: 1px solid #ddd;"><strong>Montant</strong></td>
                <td style="padding: 10px; border: 1px solid #ddd;"><strong>{{loyer_montant}} €</strong></td>
              </tr>
              <tr style="background-color: #f8f9fa;">
                <td style="padding: 10px; border: 1px solid #ddd;"><strong>Date de paiement</strong></td>
                <td style="padding: 10px; border: 1px solid #ddd;">{{date_paiement}}</td>
              </tr>
            </table>
          </div>

          <div style="background-color: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0; text-align: center;"><strong>✓ Paiement confirmé et enregistré</strong></p>
          </div>

          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="color: #7f8c8d; font-size: 12px;">
              Merci pour votre ponctualité.<br>
              L'équipe de gestion locative
            </p>
          </div>
        </div>
      `,
      type: 'QUITTANCE',
      variables: JSON.stringify([
        'locataire_nom', 'locataire_prenom', 'bien_adresse', 'bien_ville', 
        'bien_codePostal', 'periode', 'loyer_montant', 'date_paiement'
      ]),
      actif: true
    },
    {
      nom: 'Relance en cas de non-paiement',
      sujet: 'RELANCE URGENTE - Loyer impayé depuis {{nb_jours_retard}} jours - {{bien_adresse}}',
      contenu: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #dc3545; margin: 0;">RELANCE URGENTE</h1>
            <p style="color: #7f8c8d; font-size: 14px;">Gestion Locative</p>
          </div>

          <div style="background-color: #f8d7da; padding: 20px; border-left: 4px solid #dc3545; margin: 20px 0;">
            <h3 style="color: #dc3545; margin-top: 0;">⚠️ Situation préoccupante</h3>
            <p>Malgré notre précédent rappel, nous n'avons toujours pas reçu le règlement de votre loyer.</p>
            <p><strong>Retard actuel : {{nb_jours_retard}} jours</strong></p>
          </div>

          <div style="margin: 20px 0;">
            <h4>Récapitulatif de la situation :</h4>
            <ul style="list-style: none; padding: 0;">
              <li style="padding: 5px 0;"><strong>Locataire :</strong> {{locataire_prenom}} {{locataire_nom}}</li>
              <li style="padding: 5px 0;"><strong>Bien :</strong> {{bien_adresse}}, {{bien_ville}} {{bien_codePostal}}</li>
              <li style="padding: 5px 0; color: #dc3545;"><strong>Montant dû :</strong> {{montant_du}} €</li>
              <li style="padding: 5px 0; color: #dc3545;"><strong>Date limite de régularisation :</strong> {{date_limite}}</li>
            </ul>
          </div>

          <div style="background-color: #fff3cd; padding: 20px; border-radius: 5px; margin: 20px 0; border: 1px solid #ffeaa7;">
            <h4 style="color: #856404; margin-top: 0;">⚡ Action requise immédiatement</h4>
            <p style="margin: 10px 0;">
              <strong>Vous devez régulariser votre situation avant le {{date_limite}}.</strong>
            </p>
            <p style="margin: 10px 0;">
              À défaut, nous serons contraints d'engager les procédures légales appropriées, 
              incluant une éventuelle procédure d'expulsion.
            </p>
          </div>

          <div style="background-color: #d1ecf1; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0; font-size: 14px;">
              <strong>💡 Besoin d'aide ?</strong><br>
              Si vous rencontrez des difficultés financières temporaires, contactez-nous immédiatement 
              pour étudier ensemble une solution amiable.
            </p>
          </div>

          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="color: #7f8c8d; font-size: 12px;">
              Dans l'attente d'une régularisation rapide,<br>
              L'équipe de gestion locative
            </p>
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
      nom: 'Email de bienvenue nouveau locataire',
      sujet: 'Bienvenue ! Informations importantes pour votre nouveau logement - {{bien_adresse}}',
      contenu: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #17a2b8; margin: 0;">🏠 BIENVENUE !</h1>
            <p style="color: #7f8c8d; font-size: 14px;">Gestion Locative</p>
          </div>

          <div style="background-color: #d1ecf1; padding: 20px; border-left: 4px solid #17a2b8; margin: 20px 0;">
            <h3 style="color: #17a2b8; margin-top: 0;">Félicitations pour votre nouveau logement !</h3>
            <p>Nous vous souhaitons la bienvenue dans votre nouveau logement et espérons que vous vous y plairez.</p>
          </div>

          <div style="margin: 20px 0;">
            <h4>🏡 Informations de votre logement :</h4>
            <ul style="list-style: none; padding: 0;">
              <li style="padding: 5px 0;"><strong>Locataire :</strong> {{locataire_prenom}} {{locataire_nom}}</li>
              <li style="padding: 5px 0;"><strong>Adresse :</strong> {{bien_adresse}}, {{bien_ville}} {{bien_codePostal}}</li>
              <li style="padding: 5px 0;"><strong>Date d'entrée :</strong> {{date_entree}}</li>
              <li style="padding: 5px 0;"><strong>Propriétaire :</strong> {{proprietaire_nom}}</li>
            </ul>
          </div>

          <div style="background-color: #fff3cd; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h4 style="color: #856404; margin-top: 0;">📋 Informations importantes à retenir :</h4>
            <ul style="color: #856404; margin: 10px 0;">
              <li style="margin: 8px 0;">✓ Vos quittances de loyer vous seront envoyées automatiquement par email</li>
              <li style="margin: 8px 0;">✓ En cas de problème technique, contactez-nous rapidement</li>
              <li style="margin: 8px 0;">✓ Pensez à effectuer les changements d'adresse nécessaires</li>
              <li style="margin: 8px 0;">✓ L'assurance habitation est obligatoire</li>
            </ul>
          </div>

          <div style="background-color: #d4edda; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h4 style="color: #155724; margin-top: 0;">📞 Nos coordonnées</h4>
            <p style="margin: 10px 0; color: #155724;">
              Notre équipe reste à votre disposition pour toute question ou assistance.<br>
              N'hésitez pas à nous contacter si vous avez besoin d'aide.
            </p>
          </div>

          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            <h4 style="color: #17a2b8;">Excellente installation ! 🎉</h4>
            <p style="color: #7f8c8d; font-size: 12px;">
              Toute l'équipe de gestion locative<br>
              vous souhaite de passer d'agréables moments<br>
              dans votre nouveau chez-vous.
            </p>
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

  // Créer les templates en une seule transaction
  const createdTemplates = await prisma.$transaction(
    defaultTemplates.map(template => 
      prisma.emailTemplate.create({ data: template })
    )
  );

  res.status(201).json({
    success: true,
    message: `${createdTemplates.length} templates par défaut créés avec succès`,
    data: {
      templatesCreated: createdTemplates.length,
      templates: createdTemplates.map(t => ({
        id: t.id,
        nom: t.nom,
        type: t.type,
        actif: t.actif
      }))
    }
  });
}));

export default router;