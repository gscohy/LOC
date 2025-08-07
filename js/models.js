class Proprietaire {
    constructor(data = {}) {
        this.id = data.id || null;
        this.nom = data.nom || '';
        this.prenom = data.prenom || '';
        this.email = data.email || '';
        this.telephone = data.telephone || '';
        this.adresse = data.adresse || '';
        this.ville = data.ville || '';
        this.codePostal = data.codePostal || '';
        this.dateCreation = data.dateCreation || new Date().toISOString();
    }

    validate() {
        const errors = [];
        if (!this.nom.trim()) errors.push('Le nom est requis');
        if (!this.prenom.trim()) errors.push('Le prénom est requis');
        if (!this.email.trim()) errors.push('L\'email est requis');
        if (this.email && !this.isValidEmail(this.email)) errors.push('L\'email n\'est pas valide');
        return errors;
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    getFullName() {
        return `${this.prenom} ${this.nom}`;
    }
}

class Bien {
    constructor(data = {}) {
        this.id = data.id || null;
        this.adresse = data.adresse || '';
        this.ville = data.ville || '';
        this.codePostal = data.codePostal || '';
        this.type = data.type || 'appartement';
        this.surface = data.surface || 0;
        this.nbPieces = data.nbPieces || 1;
        this.nbChambres = data.nbChambres || 0;
        this.loyer = data.loyer || 0;
        this.charges = data.charges || 0;
        this.depotGarantie = data.depotGarantie || 0;
        this.proprietaires = data.proprietaires || [];
        this.photos = data.photos || [];
        this.documents = data.documents || [];
        this.statut = data.statut || 'vacant';
        this.description = data.description || '';
        this.dateCreation = data.dateCreation || new Date().toISOString();
        this.lots = data.lots || [];
    }

    validate() {
        const errors = [];
        if (!this.adresse.trim()) errors.push('L\'adresse est requise');
        if (!this.ville.trim()) errors.push('La ville est requise');
        if (!this.codePostal.trim()) errors.push('Le code postal est requis');
        if (this.surface <= 0) errors.push('La surface doit être supérieure à 0');
        if (this.loyer < 0) errors.push('Le loyer ne peut pas être négatif');
        if (this.charges < 0) errors.push('Les charges ne peuvent pas être négatives');
        if (this.proprietaires.length === 0) errors.push('Au moins un propriétaire est requis');
        return errors;
    }

    getFullAddress() {
        return `${this.adresse}, ${this.codePostal} ${this.ville}`;
    }

    getTotalLoyer() {
        return this.loyer + this.charges;
    }

    isVacant() {
        return this.statut === 'vacant';
    }

    isLoue() {
        return this.statut === 'loue';
    }
}

class Locataire {
    constructor(data = {}) {
        this.id = data.id || null;
        this.civilite = data.civilite || 'M.';
        this.nom = data.nom || '';
        this.prenom = data.prenom || '';
        this.email = data.email || '';
        this.telephone = data.telephone || '';
        this.adresse = data.adresse || '';
        this.ville = data.ville || '';
        this.codePostal = data.codePostal || '';
        this.dateNaissance = data.dateNaissance || '';
        this.profession = data.profession || '';
        this.revenus = data.revenus || 0;
        this.garants = data.garants || [];
        this.documents = data.documents || [];
        this.dateCreation = data.dateCreation || new Date().toISOString();
    }

    validate() {
        const errors = [];
        if (!this.nom.trim()) errors.push('Le nom est requis');
        if (!this.prenom.trim()) errors.push('Le prénom est requis');
        if (!this.email.trim()) errors.push('L\'email est requis');
        if (this.email && !this.isValidEmail(this.email)) errors.push('L\'email n\'est pas valide');
        if (!this.telephone.trim()) errors.push('Le téléphone est requis');
        return errors;
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    getFullName() {
        return `${this.civilite} ${this.prenom} ${this.nom}`;
    }
}

class Garant {
    constructor(data = {}) {
        this.id = data.id || null;
        this.civilite = data.civilite || 'M.';
        this.nom = data.nom || '';
        this.prenom = data.prenom || '';
        this.email = data.email || '';
        this.telephone = data.telephone || '';
        this.adresse = data.adresse || '';
        this.ville = data.ville || '';
        this.codePostal = data.codePostal || '';
        this.profession = data.profession || '';
        this.revenus = data.revenus || 0;
        this.typeGarantie = data.typeGarantie || 'physique';
        this.documents = data.documents || [];
        this.dateCreation = data.dateCreation || new Date().toISOString();
    }

    validate() {
        const errors = [];
        if (!this.nom.trim()) errors.push('Le nom est requis');
        if (!this.prenom.trim()) errors.push('Le prénom est requis');
        if (!this.email.trim()) errors.push('L\'email est requis');
        if (this.email && !this.isValidEmail(this.email)) errors.push('L\'email n\'est pas valide');
        if (!this.telephone.trim()) errors.push('Le téléphone est requis');
        return errors;
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    getFullName() {
        return `${this.civilite} ${this.prenom} ${this.nom}`;
    }
}

class Contrat {
    constructor(data = {}) {
        this.id = data.id || null;
        this.bienId = data.bienId || '';
        this.locataireIds = data.locataireIds || [];
        this.dateDebut = data.dateDebut || '';
        this.dateFin = data.dateFin || '';
        this.duree = data.duree || 12;
        this.loyer = data.loyer || 0;
        this.charges = data.charges || 0;
        this.depotGarantie = data.depotGarantie || 0;
        this.jourPaiement = data.jourPaiement || 1;
        this.fraisNotaire = data.fraisNotaire || 0;
        this.fraisHuissier = data.fraisHuissier || 0;
        this.type = data.type || 'habitation';
        this.statut = data.statut || 'actif';
        this.clausesParticulieres = data.clausesParticulieres || '';
        this.documents = data.documents || [];
        this.dateCreation = data.dateCreation || new Date().toISOString();
        this.historique = data.historique || [];
    }

    validate() {
        const errors = [];
        if (!this.bienId) errors.push('Un bien doit être sélectionné');
        if (this.locataireIds.length === 0) errors.push('Au moins un locataire doit être sélectionné');
        if (!this.dateDebut) errors.push('La date de début est requise');
        if (this.loyer <= 0) errors.push('Le montant du loyer doit être supérieur à 0');
        if (this.charges < 0) errors.push('Le montant des charges ne peut pas être négatif');
        if (this.jourPaiement < 1 || this.jourPaiement > 31) errors.push('Le jour de paiement doit être entre 1 et 31');
        return errors;
    }

    getTotalLoyer() {
        return this.loyer + this.charges;
    }

    isActif() {
        return this.statut === 'actif';
    }

    isExpire() {
        if (!this.dateFin) return false;
        return new Date(this.dateFin) < new Date();
    }

    getDureeRestante() {
        if (!this.dateFin) return null;
        const aujourd = new Date();
        const fin = new Date(this.dateFin);
        const diff = fin - aujourd;
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    }
}

class Loyer {
    constructor(data = {}) {
        this.id = data.id || null;
        this.contratId = data.contratId || '';
        this.bienId = data.bienId || '';
        this.locataireIds = data.locataireIds || [];
        this.mois = data.mois || '';
        this.annee = data.annee || new Date().getFullYear();
        this.montantDu = data.montantDu || 0;
        this.montantPaye = data.montantPaye || 0;
        this.paiements = data.paiements || [];
        this.statut = data.statut || 'attente';
        this.dateEcheance = data.dateEcheance || '';
        this.dateCreation = data.dateCreation || new Date().toISOString();
        this.commentaires = data.commentaires || '';
    }

    validate() {
        const errors = [];
        if (!this.contratId) errors.push('Un contrat doit être associé');
        if (!this.bienId) errors.push('Un bien doit être associé');
        if (!this.mois) errors.push('Le mois est requis');
        if (!this.annee) errors.push('L\'année est requise');
        if (this.montantDu <= 0) errors.push('Le montant dû doit être supérieur à 0');
        return errors;
    }

    getSolde() {
        return this.montantPaye - this.montantDu;
    }

    isPaye() {
        return this.montantPaye >= this.montantDu;
    }

    isEnRetard() {
        if (this.isPaye()) return false;
        return new Date(this.dateEcheance) < new Date();
    }

    isPartiel() {
        return this.montantPaye > 0 && this.montantPaye < this.montantDu;
    }

    addPaiement(paiement) {
        paiement.id = Math.random().toString(36).substr(2, 9);
        paiement.date = paiement.date || new Date().toISOString();
        this.paiements.push(paiement);
        this.montantPaye = this.paiements.reduce((total, p) => total + p.montant, 0);
        this.updateStatut();
    }

    updateStatut() {
        if (this.isPaye()) {
            this.statut = 'paye';
        } else if (this.isPartiel()) {
            this.statut = 'partiel';
        } else if (this.isEnRetard()) {
            this.statut = 'retard';
        } else {
            this.statut = 'attente';
        }
    }
}

class Quittance {
    constructor(data = {}) {
        this.id = data.id || null;
        this.loyerId = data.loyerId || '';
        this.contratId = data.contratId || '';
        this.bienId = data.bienId || '';
        this.locataireIds = data.locataireIds || [];
        this.periode = data.periode || '';
        this.montant = data.montant || 0;
        this.dateGeneration = data.dateGeneration || new Date().toISOString();
        this.dateEnvoi = data.dateEnvoi || null;
        this.modeEnvoi = data.modeEnvoi || 'email';
        this.statut = data.statut || 'generee';
        this.pdfPath = data.pdfPath || null;
        this.emailEnvoye = data.emailEnvoye || false;
    }

    validate() {
        const errors = [];
        if (!this.loyerId) errors.push('Un loyer doit être associé');
        if (!this.bienId) errors.push('Un bien doit être associé');
        if (this.locataireIds.length === 0) errors.push('Au moins un locataire doit être associé');
        if (!this.periode) errors.push('La période est requise');
        if (this.montant <= 0) errors.push('Le montant doit être supérieur à 0');
        return errors;
    }

    isEnvoyee() {
        return this.statut === 'envoyee';
    }

    marquerEnvoyee() {
        this.statut = 'envoyee';
        this.dateEnvoi = new Date().toISOString();
        this.emailEnvoye = true;
    }
}

class Charge {
    constructor(data = {}) {
        this.id = data.id || null;
        this.bienId = data.bienId || '';
        this.categorie = data.categorie || 'travaux';
        this.description = data.description || '';
        this.montant = data.montant || 0;
        this.date = data.date || new Date().toISOString().split('T')[0];
        this.type = data.type || 'ponctuelle';
        this.frequence = data.frequence || null;
        this.dateDebut = data.dateDebut || null;
        this.dateFin = data.dateFin || null;
        this.facture = data.facture || null;
        this.payee = data.payee || false;
        this.dateCreation = data.dateCreation || new Date().toISOString();
        this.commentaires = data.commentaires || '';
    }

    validate() {
        const errors = [];
        if (!this.bienId) errors.push('Un bien doit être sélectionné');
        if (!this.description.trim()) errors.push('La description est requise');
        if (this.montant <= 0) errors.push('Le montant doit être supérieur à 0');
        if (!this.date) errors.push('La date est requise');
        if (this.type === 'recurrente' && !this.frequence) errors.push('La fréquence est requise pour les charges récurrentes');
        return errors;
    }

    getMontantMensuel() {
        if (this.type === 'ponctuelle') return this.montant;
        
        switch (this.frequence) {
            case 'mensuelle': return this.montant;
            case 'trimestrielle': return this.montant / 3;
            case 'semestrielle': return this.montant / 6;
            case 'annuelle': return this.montant / 12;
            default: return this.montant;
        }
    }

    isRecurrente() {
        return this.type === 'recurrente';
    }
}