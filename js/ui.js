class UI {
    constructor() {
        this.currentModule = 'dashboard';
        this.modals = new Map();
        this.initializeUI();
    }

    initializeUI() {
        this.setupNavigation();
        this.setupModals();
        this.loadModule('dashboard');
    }

    setupNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const module = item.dataset.module;
                this.loadModule(module);
                
                navItems.forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');
            });
        });
    }

    loadModule(moduleName) {
        const modules = document.querySelectorAll('.module');
        modules.forEach(module => module.classList.remove('active'));
        
        const targetModule = document.getElementById(moduleName);
        if (targetModule) {
            targetModule.classList.add('active');
            this.currentModule = moduleName;
            
            switch (moduleName) {
                case 'dashboard':
                    dashboard.refresh();
                    break;
                case 'proprietaires':
                    proprietairesModule.refresh();
                    break;
                case 'biens':
                    biensModule.refresh();
                    break;
                case 'locataires':
                    locatairesModule.refresh();
                    break;
                case 'garants':
                    garantsModule.refresh();
                    break;
                case 'contrats':
                    contratsModule.refresh();
                    break;
                case 'loyers':
                    loyersModule.refresh();
                    break;
                case 'quittances':
                    quittancesModule.refresh();
                    break;
                case 'charges':
                    chargesModule.refresh();
                    break;
            }
        }
    }

    setupModals() {
        this.createProprietaireModal();
        this.createBienModal();
        this.createLocataireModal();
        this.createGarantModal();
        this.createContratModal();
        this.createChargeModal();
        this.createPaiementModal();
    }

    createProprietaireModal() {
        const modal = this.createModal('proprietaire-modal', 'Nouveau Propriétaire', `
            <form id="proprietaire-form">
                <div class="form-grid">
                    <div class="form-field">
                        <label>Nom *</label>
                        <input type="text" name="nom" required>
                    </div>
                    <div class="form-field">
                        <label>Prénom *</label>
                        <input type="text" name="prenom" required>
                    </div>
                    <div class="form-field">
                        <label>Email *</label>
                        <input type="email" name="email" required>
                    </div>
                    <div class="form-field">
                        <label>Téléphone</label>
                        <input type="tel" name="telephone">
                    </div>
                </div>
                <div class="form-field">
                    <label>Adresse</label>
                    <input type="text" name="adresse">
                </div>
                <div class="form-grid">
                    <div class="form-field">
                        <label>Ville</label>
                        <input type="text" name="ville">
                    </div>
                    <div class="form-field">
                        <label>Code postal</label>
                        <input type="text" name="codePostal">
                    </div>
                </div>
            </form>
        `);

        modal.querySelector('form').addEventListener('submit', (e) => {
            e.preventDefault();
            if (typeof proprietairesModule !== 'undefined') {
                proprietairesModule.handleFormSubmit(new FormData(e.target));
            } else {
                console.error('proprietairesModule non défini');
                ui.showNotification('Erreur: Module propriétaires non chargé', 'error');
            }
        });
    }

    createBienModal() {
        const modal = this.createModal('bien-modal', 'Nouveau Bien', `
            <form id="bien-form">
                <div class="form-field">
                    <label>Adresse *</label>
                    <input type="text" name="adresse" required>
                </div>
                <div class="form-grid">
                    <div class="form-field">
                        <label>Ville *</label>
                        <input type="text" name="ville" required>
                    </div>
                    <div class="form-field">
                        <label>Code postal *</label>
                        <input type="text" name="codePostal" required>
                    </div>
                </div>
                <div class="form-grid">
                    <div class="form-field">
                        <label>Type *</label>
                        <select name="type" required>
                            <option value="appartement">Appartement</option>
                            <option value="maison">Maison</option>
                            <option value="studio">Studio</option>
                            <option value="local">Local commercial</option>
                            <option value="garage">Garage</option>
                        </select>
                    </div>
                    <div class="form-field">
                        <label>Surface (m²) *</label>
                        <input type="number" name="surface" required min="1">
                    </div>
                </div>
                <div class="form-grid">
                    <div class="form-field">
                        <label>Nombre de pièces</label>
                        <input type="number" name="nbPieces" min="1" value="1">
                    </div>
                    <div class="form-field">
                        <label>Nombre de chambres</label>
                        <input type="number" name="nbChambres" min="0" value="0">
                    </div>
                </div>
                <div class="form-grid">
                    <div class="form-field">
                        <label>Loyer (€) *</label>
                        <input type="number" name="loyer" required min="0" step="0.01">
                    </div>
                    <div class="form-field">
                        <label>Charges (€)</label>
                        <input type="number" name="charges" min="0" step="0.01" value="0">
                    </div>
                </div>
                <div class="form-field">
                    <label>Dépôt de garantie (€)</label>
                    <input type="number" name="depotGarantie" min="0" step="0.01" value="0">
                </div>
                <div class="form-field">
                    <label>Propriétaires *</label>
                    <select name="proprietaires" multiple id="proprietaires-select" required>
                    </select>
                    <small>Maintenez Ctrl pour sélectionner plusieurs propriétaires</small>
                </div>
                <div class="form-field">
                    <label>Description</label>
                    <textarea name="description" rows="3"></textarea>
                </div>
            </form>
        `);

        modal.querySelector('form').addEventListener('submit', (e) => {
            e.preventDefault();
            if (typeof biensModule !== 'undefined') {
                biensModule.handleFormSubmit(new FormData(e.target));
            } else {
                console.error('biensModule non défini');
                ui.showNotification('Erreur: Module biens non chargé', 'error');
            }
        });
    }

    createLocataireModal() {
        const modal = this.createModal('locataire-modal', 'Nouveau Locataire', `
            <form id="locataire-form">
                <div class="form-grid">
                    <div class="form-field">
                        <label>Civilité</label>
                        <select name="civilite">
                            <option value="M.">M.</option>
                            <option value="Mme">Mme</option>
                            <option value="Mlle">Mlle</option>
                        </select>
                    </div>
                    <div class="form-field">
                        <label>Nom *</label>
                        <input type="text" name="nom" required>
                    </div>
                    <div class="form-field">
                        <label>Prénom *</label>
                        <input type="text" name="prenom" required>
                    </div>
                </div>
                <div class="form-grid">
                    <div class="form-field">
                        <label>Email *</label>
                        <input type="email" name="email" required>
                    </div>
                    <div class="form-field">
                        <label>Téléphone *</label>
                        <input type="tel" name="telephone" required>
                    </div>
                </div>
                <div class="form-field">
                    <label>Adresse</label>
                    <input type="text" name="adresse">
                </div>
                <div class="form-grid">
                    <div class="form-field">
                        <label>Ville</label>
                        <input type="text" name="ville">
                    </div>
                    <div class="form-field">
                        <label>Code postal</label>
                        <input type="text" name="codePostal">
                    </div>
                </div>
                <div class="form-grid">
                    <div class="form-field">
                        <label>Date de naissance</label>
                        <input type="date" name="dateNaissance">
                    </div>
                    <div class="form-field">
                        <label>Profession</label>
                        <input type="text" name="profession">
                    </div>
                </div>
                <div class="form-field">
                    <label>Revenus mensuels (€)</label>
                    <input type="number" name="revenus" min="0" step="0.01">
                </div>
            </form>
        `);

        modal.querySelector('form').addEventListener('submit', (e) => {
            e.preventDefault();
            if (typeof locatairesModule !== 'undefined') {
                locatairesModule.handleFormSubmit(new FormData(e.target));
            } else {
                console.error('locatairesModule non défini');
                ui.showNotification('Erreur: Module locataires non chargé', 'error');
            }
        });
    }

    createGarantModal() {
        const modal = this.createModal('garant-modal', 'Nouveau Garant', `
            <form id="garant-form">
                <div class="form-grid">
                    <div class="form-field">
                        <label>Civilité</label>
                        <select name="civilite">
                            <option value="M.">M.</option>
                            <option value="Mme">Mme</option>
                            <option value="Mlle">Mlle</option>
                        </select>
                    </div>
                    <div class="form-field">
                        <label>Nom *</label>
                        <input type="text" name="nom" required>
                    </div>
                    <div class="form-field">
                        <label>Prénom *</label>
                        <input type="text" name="prenom" required>
                    </div>
                </div>
                <div class="form-grid">
                    <div class="form-field">
                        <label>Email *</label>
                        <input type="email" name="email" required>
                    </div>
                    <div class="form-field">
                        <label>Téléphone *</label>
                        <input type="tel" name="telephone" required>
                    </div>
                </div>
                <div class="form-field">
                    <label>Adresse</label>
                    <input type="text" name="adresse">
                </div>
                <div class="form-grid">
                    <div class="form-field">
                        <label>Ville</label>
                        <input type="text" name="ville">
                    </div>
                    <div class="form-field">
                        <label>Code postal</label>
                        <input type="text" name="codePostal">
                    </div>
                </div>
                <div class="form-grid">
                    <div class="form-field">
                        <label>Type de garantie</label>
                        <select name="typeGarantie">
                            <option value="physique">Personne physique</option>
                            <option value="morale">Personne morale</option>
                            <option value="bancaire">Garantie bancaire</option>
                        </select>
                    </div>
                    <div class="form-field">
                        <label>Profession</label>
                        <input type="text" name="profession">
                    </div>
                </div>
                <div class="form-field">
                    <label>Revenus mensuels (€)</label>
                    <input type="number" name="revenus" min="0" step="0.01">
                </div>
            </form>
        `);

        modal.querySelector('form').addEventListener('submit', (e) => {
            e.preventDefault();
            if (typeof garantsModule !== 'undefined') {
                garantsModule.handleFormSubmit(new FormData(e.target));
            } else {
                console.error('garantsModule non défini');
                ui.showNotification('Erreur: Module garants non chargé', 'error');
            }
        });
    }

    createContratModal() {
        const modal = this.createModal('contrat-modal', 'Nouveau Contrat', `
            <form id="contrat-form">
                <div class="form-grid">
                    <div class="form-field">
                        <label>Bien *</label>
                        <select name="bienId" id="contrat-bien-select" required>
                            <option value="">Sélectionner un bien</option>
                        </select>
                    </div>
                    <div class="form-field">
                        <label>Type</label>
                        <select name="type">
                            <option value="habitation">Habitation</option>
                            <option value="commercial">Commercial</option>
                            <option value="mixte">Mixte</option>
                        </select>
                    </div>
                </div>
                <div class="form-field">
                    <label>Locataires *</label>
                    <select name="locataireIds" multiple id="contrat-locataires-select" required>
                    </select>
                    <small>Maintenez Ctrl pour sélectionner plusieurs locataires</small>
                </div>
                <div class="form-grid">
                    <div class="form-field">
                        <label>Date de début *</label>
                        <input type="date" name="dateDebut" required>
                    </div>
                    <div class="form-field">
                        <label>Date de fin</label>
                        <input type="date" name="dateFin">
                    </div>
                </div>
                <div class="form-grid">
                    <div class="form-field">
                        <label>Durée (mois)</label>
                        <input type="number" name="duree" value="12" min="1">
                    </div>
                    <div class="form-field">
                        <label>Jour de paiement</label>
                        <input type="number" name="jourPaiement" value="1" min="1" max="31">
                    </div>
                </div>
                <div class="form-grid">
                    <div class="form-field">
                        <label>Loyer (€) *</label>
                        <input type="number" name="loyer" required min="0" step="0.01">
                    </div>
                    <div class="form-field">
                        <label>Charges (€)</label>
                        <input type="number" name="charges" min="0" step="0.01" value="0">
                    </div>
                </div>
                <div class="form-field">
                    <label>Dépôt de garantie (€)</label>
                    <input type="number" name="depotGarantie" min="0" step="0.01">
                </div>
                <div class="form-grid">
                    <div class="form-field">
                        <label>Frais de notaire (€)</label>
                        <input type="number" name="fraisNotaire" min="0" step="0.01" value="0">
                    </div>
                    <div class="form-field">
                        <label>Frais d'huissier (€)</label>
                        <input type="number" name="fraisHuissier" min="0" step="0.01" value="0">
                    </div>
                </div>
                <div class="form-field">
                    <label>Clauses particulières</label>
                    <textarea name="clausesParticulieres" rows="3"></textarea>
                </div>
            </form>
        `);

        modal.querySelector('form').addEventListener('submit', (e) => {
            e.preventDefault();
            if (typeof contratsModule !== 'undefined') {
                contratsModule.handleFormSubmit(new FormData(e.target));
            } else {
                console.error('contratsModule non défini');
                ui.showNotification('Erreur: Module contrats non chargé', 'error');
            }
        });
    }

    createChargeModal() {
        const modal = this.createModal('charge-modal', 'Nouvelle Charge', `
            <form id="charge-form">
                <div class="form-grid">
                    <div class="form-field">
                        <label>Bien *</label>
                        <select name="bienId" id="charge-bien-select" required>
                            <option value="">Sélectionner un bien</option>
                        </select>
                    </div>
                    <div class="form-field">
                        <label>Catégorie *</label>
                        <select name="categorie" required>
                            <option value="travaux">Travaux</option>
                            <option value="assurance">Assurance</option>
                            <option value="credit">Crédit immobilier</option>
                            <option value="taxe">Taxe foncière</option>
                            <option value="gestion">Frais de gestion</option>
                            <option value="exceptionnelle">Charge exceptionnelle</option>
                        </select>
                    </div>
                </div>
                <div class="form-field">
                    <label>Description *</label>
                    <input type="text" name="description" required>
                </div>
                <div class="form-grid">
                    <div class="form-field">
                        <label>Montant (€) *</label>
                        <input type="number" name="montant" required min="0" step="0.01">
                    </div>
                    <div class="form-field">
                        <label>Date *</label>
                        <input type="date" name="date" required>
                    </div>
                </div>
                <div class="form-grid">
                    <div class="form-field">
                        <label>Type</label>
                        <select name="type" id="charge-type-select">
                            <option value="ponctuelle">Ponctuelle</option>
                            <option value="recurrente">Récurrente</option>
                        </select>
                    </div>
                    <div class="form-field" id="charge-frequence-field" style="display: none;">
                        <label>Fréquence</label>
                        <select name="frequence">
                            <option value="mensuelle">Mensuelle</option>
                            <option value="trimestrielle">Trimestrielle</option>
                            <option value="semestrielle">Semestrielle</option>
                            <option value="annuelle">Annuelle</option>
                        </select>
                    </div>
                </div>
                <div class="form-field">
                    <label>Commentaires</label>
                    <textarea name="commentaires" rows="2"></textarea>
                </div>
            </form>
        `);

        modal.querySelector('#charge-type-select').addEventListener('change', (e) => {
            const frequenceField = modal.querySelector('#charge-frequence-field');
            if (e.target.value === 'recurrente') {
                frequenceField.style.display = 'block';
            } else {
                frequenceField.style.display = 'none';
            }
        });

        modal.querySelector('form').addEventListener('submit', (e) => {
            e.preventDefault();
            if (typeof chargesModule !== 'undefined') {
                chargesModule.handleFormSubmit(new FormData(e.target));
            } else {
                console.error('chargesModule non défini');
                ui.showNotification('Erreur: Module charges non chargé', 'error');
            }
        });
    }

    createPaiementModal() {
        const modal = this.createModal('paiement-modal', 'Nouveau Paiement', `
            <form id="paiement-form">
                <input type="hidden" name="loyerId" id="paiement-loyer-id">
                <div class="form-grid">
                    <div class="form-field">
                        <label>Montant (€) *</label>
                        <input type="number" name="montant" required min="0" step="0.01">
                    </div>
                    <div class="form-field">
                        <label>Date *</label>
                        <input type="date" name="date" required>
                    </div>
                </div>
                <div class="form-grid">
                    <div class="form-field">
                        <label>Mode de paiement</label>
                        <select name="mode">
                            <option value="virement">Virement</option>
                            <option value="cheque">Chèque</option>
                            <option value="especes">Espèces</option>
                            <option value="caf">CAF</option>
                            <option value="prelevement">Prélèvement</option>
                        </select>
                    </div>
                    <div class="form-field">
                        <label>Payeur</label>
                        <input type="text" name="payeur" placeholder="Ex: Locataire, CAF, Parents...">
                    </div>
                </div>
                <div class="form-field">
                    <label>Référence</label>
                    <input type="text" name="reference" placeholder="Numéro de chèque, référence virement...">
                </div>
                <div class="form-field">
                    <label>Commentaire</label>
                    <textarea name="commentaire" rows="2"></textarea>
                </div>
            </form>
        `);

        modal.querySelector('form').addEventListener('submit', (e) => {
            e.preventDefault();
            if (typeof loyersModule !== 'undefined') {
                loyersModule.handlePaiementSubmit(new FormData(e.target));
            } else {
                console.error('loyersModule non défini');
                ui.showNotification('Erreur: Module loyers non chargé', 'error');
            }
        });
    }

    createModal(id, title, content) {
        const overlay = document.getElementById('overlay');
        
        const modal = document.createElement('div');
        modal.id = id;
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-header">
                <h3 class="modal-title">${title}</h3>
                <button type="button" class="modal-close" onclick="closeModal('${id}')">&times;</button>
            </div>
            <div class="modal-body">
                ${content}
            </div>
            <div class="modal-footer">
                <button type="button" class="btn-secondary" onclick="closeModal('${id}')">Annuler</button>
                <button type="submit" form="${id.replace('-modal', '-form')}" class="btn-primary">Enregistrer</button>
            </div>
        `;

        document.body.appendChild(modal);
        this.modals.set(id, modal);

        return modal;
    }

    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'times-circle' : 'exclamation-triangle'}"></i>
                <span>${message}</span>
            </div>
        `;

        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);

        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'EUR'
        }).format(amount);
    }

    formatDate(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('fr-FR');
    }

    formatDateTime(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleString('fr-FR');
    }

    confirmDelete(message, callback) {
        if (confirm(message)) {
            callback();
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        const overlay = document.getElementById('overlay');
        
        if (modal && overlay) {
            modal.classList.remove('active');
            overlay.classList.remove('active');
            
            const form = modal.querySelector('form');
            if (form) {
                form.reset();
            }
        }
    }

    showLoading(container) {
        container.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Chargement...</div>';
    }

    showEmptyState(container, message, icon = 'inbox') {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-${icon}"></i>
                <h3>Aucune donnée</h3>
                <p>${message}</p>
            </div>
        `;
    }
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    const overlay = document.getElementById('overlay');
    
    if (modal && overlay) {
        if (modalId === 'bien-modal') {
            biensModule.populateProprietairesSelect();
        } else if (modalId === 'contrat-modal') {
            contratsModule.populateSelects();
        } else if (modalId === 'charge-modal') {
            chargesModule.populateBiensSelect();
        }
        
        modal.classList.add('active');
        overlay.classList.add('active');
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    const overlay = document.getElementById('overlay');
    
    if (modal && overlay) {
        modal.classList.remove('active');
        overlay.classList.remove('active');
        
        const form = modal.querySelector('form');
        if (form) {
            form.reset();
        }
    }
}

function performSearch() {
    const query = document.getElementById('search-input').value;
    const type = document.getElementById('search-type').value;
    const resultsContainer = document.getElementById('search-results');
    
    if (!query.trim()) {
        ui.showEmptyState(resultsContainer, 'Veuillez saisir un terme de recherche', 'search');
        return;
    }
    
    ui.showLoading(resultsContainer);
    
    setTimeout(() => {
        const results = storage.search(query, type);
        
        if (results.length === 0) {
            ui.showEmptyState(resultsContainer, 'Aucun résultat trouvé pour votre recherche', 'search');
            return;
        }
        
        let html = '<div class="search-results-list">';
        
        results.forEach(result => {
            let icon, title, subtitle;
            
            switch (result.type) {
                case 'proprietaire':
                    icon = 'user-tie';
                    title = result.data.getFullName();
                    subtitle = result.data.email;
                    break;
                case 'bien':
                    icon = 'home';
                    title = result.data.getFullAddress();
                    subtitle = `${result.data.type} - ${result.data.surface}m²`;
                    break;
                case 'locataire':
                    icon = 'users';
                    title = result.data.getFullName();
                    subtitle = result.data.email;
                    break;
            }
            
            html += `
                <div class="search-result-item" style="display: flex; align-items: center; padding: 1rem; border-bottom: 1px solid var(--border-color);">
                    <i class="fas fa-${icon}" style="margin-right: 1rem; color: var(--primary-color);"></i>
                    <div>
                        <div style="font-weight: 500;">${title}</div>
                        <div style="color: var(--text-secondary); font-size: 0.875rem;">${subtitle}</div>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        resultsContainer.innerHTML = html;
    }, 500);
}

function generateFiscalReport() {
    const debut = document.getElementById('fiscale-debut').value;
    const fin = document.getElementById('fiscale-fin').value;
    const resultsContainer = document.getElementById('fiscale-results');
    
    if (!debut || !fin) {
        ui.showNotification('Veuillez sélectionner une période', 'error');
        return;
    }
    
    ui.showLoading(resultsContainer);
    
    setTimeout(() => {
        const loyers = storage.getLoyers();
        const charges = storage.getCharges();
        const biens = storage.getBiens();
        
        const debutDate = new Date(debut);
        const finDate = new Date(fin);
        
        let revenusTotal = 0;
        let chargesTotal = 0;
        
        loyers.forEach(loyer => {
            const loyerDate = new Date(loyer.annee, loyer.mois - 1);
            if (loyerDate >= debutDate && loyerDate <= finDate) {
                revenusTotal += loyer.montantPaye;
            }
        });
        
        charges.forEach(charge => {
            const chargeDate = new Date(charge.date);
            if (chargeDate >= debutDate && chargeDate <= finDate) {
                chargesTotal += charge.montant;
            }
        });
        
        const revenuNet = revenusTotal - chargesTotal;
        
        const html = `
            <div class="fiscale-summary">
                <h3>Synthèse fiscale du ${ui.formatDate(debut)} au ${ui.formatDate(fin)}</h3>
                <div class="fiscale-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin: 1rem 0;">
                    <div class="fiscale-card" style="background: var(--surface-color); padding: 1rem; border-radius: var(--radius); text-align: center;">
                        <div style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 0.5rem;">Revenus bruts</div>
                        <div style="font-size: 1.5rem; font-weight: 700; color: var(--success-color);">${ui.formatCurrency(revenusTotal)}</div>
                    </div>
                    <div class="fiscale-card" style="background: var(--surface-color); padding: 1rem; border-radius: var(--radius); text-align: center;">
                        <div style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 0.5rem;">Charges déductibles</div>
                        <div style="font-size: 1.5rem; font-weight: 700; color: var(--danger-color);">${ui.formatCurrency(chargesTotal)}</div>
                    </div>
                    <div class="fiscale-card" style="background: var(--surface-color); padding: 1rem; border-radius: var(--radius); text-align: center;">
                        <div style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 0.5rem;">Revenu net foncier</div>
                        <div style="font-size: 1.5rem; font-weight: 700; color: ${revenuNet >= 0 ? 'var(--success-color)' : 'var(--danger-color)'};">${ui.formatCurrency(revenuNet)}</div>
                    </div>
                </div>
                <div style="margin-top: 2rem;">
                    <button class="btn-primary" onclick="exportFiscalReport()">
                        <i class="fas fa-file-pdf"></i> Exporter en PDF
                    </button>
                </div>
            </div>
        `;
        
        resultsContainer.innerHTML = html;
    }, 500);
}

function exportFiscalReport() {
    ui.showNotification('Fonctionnalité d\'export PDF en cours de développement', 'warning');
}

const ui = new UI();