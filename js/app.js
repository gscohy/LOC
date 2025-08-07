class GestionLocativeApp {
    constructor() {
        this.version = '1.0.0';
        this.initialized = false;
        this.init();
    }

    init() {
        if (this.initialized) return;
        
        console.log(`Gestion Locative v${this.version} - Initialisation...`);
        
        this.checkBrowserCompatibility();
        this.loadInitialData();
        this.setupEventListeners();
        this.generateMissingData();
        this.initialized = true;
        
        console.log('Application initialisée avec succès');
        ui.showNotification('Application chargée avec succès', 'success');
    }

    checkBrowserCompatibility() {
        const requiredFeatures = [
            'localStorage',
            'JSON',
            'addEventListener'
        ];

        const unsupported = requiredFeatures.filter(feature => {
            switch (feature) {
                case 'localStorage':
                    return typeof Storage === 'undefined';
                case 'JSON':
                    return typeof JSON === 'undefined';
                case 'addEventListener':
                    return typeof document.addEventListener === 'undefined';
                default:
                    return false;
            }
        });

        if (unsupported.length > 0) {
            alert('Votre navigateur n\'est pas compatible avec cette application. Veuillez utiliser une version récente de Chrome, Firefox, Safari ou Edge.');
            return false;
        }

        return true;
    }

    loadInitialData() {
        try {
            const hasData = this.checkExistingData();
            
            if (!hasData) {
                this.createSampleData();
                ui.showNotification('Données d\'exemple créées pour la démonstration', 'warning');
            }

            this.validateDataIntegrity();
        } catch (error) {
            console.error('Erreur lors du chargement des données:', error);
            ui.showNotification('Erreur lors du chargement des données', 'error');
        }
    }

    checkExistingData() {
        const proprietaires = storage.getProprietaires();
        const biens = storage.getBiens();
        const locataires = storage.getLocataires();
        
        return proprietaires.length > 0 || biens.length > 0 || locataires.length > 0;
    }

    createSampleData() {
        const proprietaire1 = storage.addProprietaire({
            nom: 'Dupont',
            prenom: 'Jean',
            email: 'jean.dupont@email.com',
            telephone: '01 23 45 67 89',
            adresse: '123 Rue de la République',
            ville: 'Paris',
            codePostal: '75001'
        });

        const proprietaire2 = storage.addProprietaire({
            nom: 'Martin',
            prenom: 'Marie',
            email: 'marie.martin@email.com',
            telephone: '01 98 76 54 32',
            adresse: '456 Avenue des Champs',
            ville: 'Lyon',
            codePostal: '69001'
        });

        const bien1 = storage.addBien({
            adresse: '10 Rue du Commerce',
            ville: 'Paris',
            codePostal: '75011',
            type: 'appartement',
            surface: 45,
            nbPieces: 2,
            nbChambres: 1,
            loyer: 1200,
            charges: 150,
            depotGarantie: 1200,
            proprietaires: [{ id: proprietaire1.id, quotePart: 100 }],
            description: 'Appartement 2 pièces lumineux, proche métro'
        });

        const bien2 = storage.addBien({
            adresse: '25 Boulevard Victor Hugo',
            ville: 'Lyon',
            codePostal: '69003',
            type: 'appartement',
            surface: 60,
            nbPieces: 3,
            nbChambres: 2,
            loyer: 900,
            charges: 100,
            depotGarantie: 900,
            proprietaires: [{ id: proprietaire2.id, quotePart: 100 }],
            description: 'Appartement 3 pièces rénové avec balcon'
        });

        const locataire1 = storage.addLocataire({
            civilite: 'M.',
            nom: 'Durand',
            prenom: 'Pierre',
            email: 'pierre.durand@email.com',
            telephone: '06 12 34 56 78',
            adresse: '10 Rue du Commerce',
            ville: 'Paris',
            codePostal: '75011',
            profession: 'Ingénieur',
            revenus: 3500
        });

        const locataire2 = storage.addLocataire({
            civilite: 'Mme',
            nom: 'Leblanc',
            prenom: 'Sophie',
            email: 'sophie.leblanc@email.com',
            telephone: '06 98 76 54 32',
            profession: 'Professeur',
            revenus: 2800
        });

        const contrat1 = storage.addContrat({
            bienId: bien1.id,
            locataireIds: [locataire1.id],
            dateDebut: '2024-01-01',
            duree: 12,
            loyer: 1200,
            charges: 150,
            depotGarantie: 1200,
            jourPaiement: 1,
            type: 'habitation'
        });

        storage.updateBien(bien1.id, { statut: 'loue' });

        this.generateInitialLoyers(contrat1);
        this.generateSampleCharges(bien1, bien2);
    }

    generateInitialLoyers(contrat) {
        const dateDebut = new Date('2024-01-01');
        const today = new Date();
        
        for (let i = 0; i < 12; i++) {
            const date = new Date(dateDebut);
            date.setMonth(date.getMonth() + i);
            
            if (date > today) break;
            
            const mois = (date.getMonth() + 1).toString().padStart(2, '0');
            const annee = date.getFullYear();
            const dateEcheance = new Date(annee, date.getMonth(), 1);
            
            const loyerData = {
                contratId: contrat.id,
                bienId: contrat.bienId,
                locataireIds: contrat.locataireIds,
                mois: mois,
                annee: annee,
                montantDu: 1350,
                montantPaye: 0,
                paiements: [],
                statut: 'attente',
                dateEcheance: dateEcheance.toISOString().split('T')[0]
            };

            if (i < 6) {
                loyerData.montantPaye = 1350;
                loyerData.statut = 'paye';
                loyerData.paiements = [{
                    id: Math.random().toString(36).substr(2, 9),
                    montant: 1350,
                    date: dateEcheance.toISOString().split('T')[0],
                    mode: 'virement',
                    payeur: 'Locataire'
                }];
            } else if (i === 6) {
                loyerData.montantPaye = 800;
                loyerData.statut = 'partiel';
                loyerData.paiements = [{
                    id: Math.random().toString(36).substr(2, 9),
                    montant: 800,
                    date: dateEcheance.toISOString().split('T')[0],
                    mode: 'virement',
                    payeur: 'Locataire'
                }];
            }

            storage.addLoyer(loyerData);
        }
    }

    generateSampleCharges(bien1, bien2) {
        const charges = [
            {
                bienId: bien1.id,
                categorie: 'assurance',
                description: 'Assurance habitation annuelle',
                montant: 350,
                date: '2024-01-15',
                type: 'annuelle',
                payee: true
            },
            {
                bienId: bien1.id,
                categorie: 'travaux',
                description: 'Réparation plomberie',
                montant: 180,
                date: '2024-03-10',
                type: 'ponctuelle',
                payee: true
            },
            {
                bienId: bien2.id,
                categorie: 'taxe',
                description: 'Taxe foncière 2024',
                montant: 1200,
                date: '2024-10-15',
                type: 'annuelle',
                payee: false
            }
        ];

        charges.forEach(charge => {
            storage.addCharge(charge);
        });
    }

    validateDataIntegrity() {
        const issues = [];
        
        const contrats = storage.getContrats();
        contrats.forEach(contrat => {
            const bien = storage.getBiens().find(b => b.id === contrat.bienId);
            if (!bien) {
                issues.push(`Contrat ${contrat.id} référence un bien inexistant`);
            }
            
            contrat.locataireIds.forEach(locataireId => {
                const locataire = storage.getLocataires().find(l => l.id === locataireId);
                if (!locataire) {
                    issues.push(`Contrat ${contrat.id} référence un locataire inexistant`);
                }
            });
        });

        const loyers = storage.getLoyers();
        loyers.forEach(loyer => {
            const contrat = contrats.find(c => c.id === loyer.contratId);
            if (!contrat) {
                issues.push(`Loyer ${loyer.id} référence un contrat inexistant`);
            }
        });

        if (issues.length > 0) {
            console.warn('Problèmes d\'intégrité détectés:', issues);
        }

        return issues.length === 0;
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const activeModal = document.querySelector('.modal.active');
                if (activeModal) {
                    const modalId = activeModal.id;
                    if (modalId === 'view-modal') {
                        closeViewModal();
                    } else {
                        closeModal(modalId);
                    }
                }
            }
        });

        window.addEventListener('beforeunload', (e) => {
            const hasUnsavedChanges = false;
            if (hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = '';
            }
        });

        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('overlay')) {
                const activeModal = document.querySelector('.modal.active');
                if (activeModal) {
                    const modalId = activeModal.id;
                    if (modalId === 'view-modal') {
                        closeViewModal();
                    } else {
                        closeModal(modalId);
                    }
                }
            }
        });
    }

    generateMissingData() {
        setTimeout(() => {
            if (typeof loyersModule !== 'undefined') {
                loyersModule.generateMissingLoyers();
            }
            
            if (typeof chargesModule !== 'undefined') {
                chargesModule.generateRecurringCharges();
            }
        }, 1000);
    }

    exportAllData() {
        const data = {
            version: this.version,
            exportDate: new Date().toISOString(),
            data: storage.exportData()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gestion-locative-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        ui.showNotification('Données exportées avec succès');
    }

    importData(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const imported = JSON.parse(e.target.result);
                
                if (imported.data) {
                    const success = storage.importData(imported.data);
                    if (success) {
                        ui.showNotification('Données importées avec succès');
                        location.reload();
                    } else {
                        ui.showNotification('Erreur lors de l\'importation', 'error');
                    }
                } else {
                    ui.showNotification('Format de fichier invalide', 'error');
                }
            } catch (error) {
                ui.showNotification('Erreur lors de la lecture du fichier', 'error');
                console.error(error);
            }
        };
        reader.readAsText(file);
    }

    resetApplication() {
        if (confirm('Êtes-vous sûr de vouloir réinitialiser toutes les données ? Cette action est irréversible.')) {
            storage.clearAll();
            ui.showNotification('Application réinitialisée');
            location.reload();
        }
    }

    getAppStats() {
        return {
            version: this.version,
            initialized: this.initialized,
            dataCount: {
                proprietaires: storage.getProprietaires().length,
                biens: storage.getBiens().length,
                locataires: storage.getLocataires().length,
                contrats: storage.getContrats().length,
                loyers: storage.getLoyers().length,
                charges: storage.getCharges().length,
                quittances: storage.getQuittances().length
            },
            storageSize: JSON.stringify(storage.getData()).length
        };
    }
}

const app = new GestionLocativeApp();

window.app = app;

document.addEventListener('DOMContentLoaded', () => {
    if (!app.initialized) {
        app.init();
    }
});