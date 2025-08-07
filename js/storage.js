class Storage {
    constructor() {
        this.initializeStorage();
    }

    initializeStorage() {
        if (!localStorage.getItem('gestionLocative')) {
            const initialData = {
                proprietaires: [],
                biens: [],
                locataires: [],
                garants: [],
                contrats: [],
                loyers: [],
                quittances: [],
                charges: [],
                settings: {
                    logo: null,
                    signature: null,
                    cachet: null
                }
            };
            localStorage.setItem('gestionLocative', JSON.stringify(initialData));
        }
    }

    getData() {
        return JSON.parse(localStorage.getItem('gestionLocative'));
    }

    setData(data) {
        localStorage.setItem('gestionLocative', JSON.stringify(data));
    }

    getProprietaires() {
        return this.getData().proprietaires;
    }

    setProprietaires(proprietaires) {
        const data = this.getData();
        data.proprietaires = proprietaires;
        this.setData(data);
    }

    addProprietaire(proprietaire) {
        const data = this.getData();
        proprietaire.id = this.generateId();
        data.proprietaires.push(proprietaire);
        this.setData(data);
        return proprietaire;
    }

    updateProprietaire(id, proprietaire) {
        const data = this.getData();
        const index = data.proprietaires.findIndex(p => p.id === id);
        if (index !== -1) {
            data.proprietaires[index] = { ...data.proprietaires[index], ...proprietaire };
            this.setData(data);
            return data.proprietaires[index];
        }
        return null;
    }

    deleteProprietaire(id) {
        const data = this.getData();
        data.proprietaires = data.proprietaires.filter(p => p.id !== id);
        this.setData(data);
    }

    getBiens() {
        return this.getData().biens;
    }

    setBiens(biens) {
        const data = this.getData();
        data.biens = biens;
        this.setData(data);
    }

    addBien(bien) {
        const data = this.getData();
        bien.id = this.generateId();
        bien.dateCreation = new Date().toISOString();
        data.biens.push(bien);
        this.setData(data);
        return bien;
    }

    updateBien(id, bien) {
        const data = this.getData();
        const index = data.biens.findIndex(b => b.id === id);
        if (index !== -1) {
            data.biens[index] = { ...data.biens[index], ...bien };
            this.setData(data);
            return data.biens[index];
        }
        return null;
    }

    deleteBien(id) {
        const data = this.getData();
        data.biens = data.biens.filter(b => b.id !== id);
        this.setData(data);
    }

    getLocataires() {
        return this.getData().locataires;
    }

    setLocataires(locataires) {
        const data = this.getData();
        data.locataires = locataires;
        this.setData(data);
    }

    addLocataire(locataire) {
        const data = this.getData();
        locataire.id = this.generateId();
        locataire.dateCreation = new Date().toISOString();
        data.locataires.push(locataire);
        this.setData(data);
        return locataire;
    }

    updateLocataire(id, locataire) {
        const data = this.getData();
        const index = data.locataires.findIndex(l => l.id === id);
        if (index !== -1) {
            data.locataires[index] = { ...data.locataires[index], ...locataire };
            this.setData(data);
            return data.locataires[index];
        }
        return null;
    }

    deleteLocataire(id) {
        const data = this.getData();
        data.locataires = data.locataires.filter(l => l.id !== id);
        this.setData(data);
    }

    getGarants() {
        return this.getData().garants;
    }

    setGarants(garants) {
        const data = this.getData();
        data.garants = garants;
        this.setData(data);
    }

    addGarant(garant) {
        const data = this.getData();
        garant.id = this.generateId();
        garant.dateCreation = new Date().toISOString();
        data.garants.push(garant);
        this.setData(data);
        return garant;
    }

    updateGarant(id, garant) {
        const data = this.getData();
        const index = data.garants.findIndex(g => g.id === id);
        if (index !== -1) {
            data.garants[index] = { ...data.garants[index], ...garant };
            this.setData(data);
            return data.garants[index];
        }
        return null;
    }

    deleteGarant(id) {
        const data = this.getData();
        data.garants = data.garants.filter(g => g.id !== id);
        this.setData(data);
    }

    getContrats() {
        return this.getData().contrats;
    }

    setContrats(contrats) {
        const data = this.getData();
        data.contrats = contrats;
        this.setData(data);
    }

    addContrat(contrat) {
        const data = this.getData();
        contrat.id = this.generateId();
        contrat.dateCreation = new Date().toISOString();
        data.contrats.push(contrat);
        this.setData(data);
        return contrat;
    }

    updateContrat(id, contrat) {
        const data = this.getData();
        const index = data.contrats.findIndex(c => c.id === id);
        if (index !== -1) {
            data.contrats[index] = { ...data.contrats[index], ...contrat };
            this.setData(data);
            return data.contrats[index];
        }
        return null;
    }

    deleteContrat(id) {
        const data = this.getData();
        data.contrats = data.contrats.filter(c => c.id !== id);
        this.setData(data);
    }

    getLoyers() {
        return this.getData().loyers;
    }

    setLoyers(loyers) {
        const data = this.getData();
        data.loyers = loyers;
        this.setData(data);
    }

    addLoyer(loyer) {
        const data = this.getData();
        loyer.id = this.generateId();
        loyer.dateCreation = new Date().toISOString();
        data.loyers.push(loyer);
        this.setData(data);
        return loyer;
    }

    updateLoyer(id, loyer) {
        const data = this.getData();
        const index = data.loyers.findIndex(l => l.id === id);
        if (index !== -1) {
            data.loyers[index] = { ...data.loyers[index], ...loyer };
            this.setData(data);
            return data.loyers[index];
        }
        return null;
    }

    deleteLoyer(id) {
        const data = this.getData();
        data.loyers = data.loyers.filter(l => l.id !== id);
        this.setData(data);
    }

    getQuittances() {
        return this.getData().quittances;
    }

    setQuittances(quittances) {
        const data = this.getData();
        data.quittances = quittances;
        this.setData(data);
    }

    addQuittance(quittance) {
        const data = this.getData();
        quittance.id = this.generateId();
        quittance.dateCreation = new Date().toISOString();
        data.quittances.push(quittance);
        this.setData(data);
        return quittance;
    }

    updateQuittance(id, quittance) {
        const data = this.getData();
        const index = data.quittances.findIndex(q => q.id === id);
        if (index !== -1) {
            data.quittances[index] = { ...data.quittances[index], ...quittance };
            this.setData(data);
            return data.quittances[index];
        }
        return null;
    }

    deleteQuittance(id) {
        const data = this.getData();
        data.quittances = data.quittances.filter(q => q.id !== id);
        this.setData(data);
    }

    getCharges() {
        return this.getData().charges;
    }

    setCharges(charges) {
        const data = this.getData();
        data.charges = charges;
        this.setData(data);
    }

    addCharge(charge) {
        const data = this.getData();
        charge.id = this.generateId();
        charge.dateCreation = new Date().toISOString();
        data.charges.push(charge);
        this.setData(data);
        return charge;
    }

    updateCharge(id, charge) {
        const data = this.getData();
        const index = data.charges.findIndex(c => c.id === id);
        if (index !== -1) {
            data.charges[index] = { ...data.charges[index], ...charge };
            this.setData(data);
            return data.charges[index];
        }
        return null;
    }

    deleteCharge(id) {
        const data = this.getData();
        data.charges = data.charges.filter(c => c.id !== id);
        this.setData(data);
    }

    getSettings() {
        return this.getData().settings;
    }

    updateSettings(settings) {
        const data = this.getData();
        data.settings = { ...data.settings, ...settings };
        this.setData(data);
    }

    generateId() {
        return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    }

    search(query, type = 'all') {
        const data = this.getData();
        const results = [];
        const searchTerm = query.toLowerCase();

        if (type === 'all' || type === 'proprietaire') {
            data.proprietaires.forEach(prop => {
                if (prop.nom.toLowerCase().includes(searchTerm) || 
                    prop.prenom.toLowerCase().includes(searchTerm) ||
                    prop.email.toLowerCase().includes(searchTerm)) {
                    results.push({ type: 'proprietaire', data: prop });
                }
            });
        }

        if (type === 'all' || type === 'bien') {
            data.biens.forEach(bien => {
                if (bien.adresse.toLowerCase().includes(searchTerm) ||
                    bien.type.toLowerCase().includes(searchTerm) ||
                    bien.ville.toLowerCase().includes(searchTerm)) {
                    results.push({ type: 'bien', data: bien });
                }
            });
        }

        if (type === 'all' || type === 'locataire') {
            data.locataires.forEach(loc => {
                if (loc.nom.toLowerCase().includes(searchTerm) || 
                    loc.prenom.toLowerCase().includes(searchTerm) ||
                    loc.email.toLowerCase().includes(searchTerm)) {
                    results.push({ type: 'locataire', data: loc });
                }
            });
        }

        return results;
    }

    exportData() {
        return JSON.stringify(this.getData(), null, 2);
    }

    importData(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            this.setData(data);
            return true;
        } catch (error) {
            console.error('Erreur lors de l\'importation:', error);
            return false;
        }
    }

    clearAll() {
        localStorage.removeItem('gestionLocative');
        this.initializeStorage();
    }
}

const storage = new Storage();