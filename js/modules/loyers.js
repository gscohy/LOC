class LoyersModule {
    constructor() {
        this.currentLoyer = null;
        this.filters = {
            mois: '',
            annee: '',
            statut: ''
        };
    }

    refresh() {
        this.populateFilters();
        this.loadLoyers();
    }

    populateFilters() {
        const moisSelect = document.getElementById('loyer-mois');
        const anneeSelect = document.getElementById('loyer-annee');
        
        const mois = [
            'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
            'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
        ];

        moisSelect.innerHTML = '<option value="">Tous les mois</option>';
        mois.forEach((nom, index) => {
            const option = document.createElement('option');
            option.value = (index + 1).toString().padStart(2, '0');
            option.textContent = nom;
            moisSelect.appendChild(option);
        });

        const currentYear = new Date().getFullYear();
        anneeSelect.innerHTML = '<option value="">Toutes les années</option>';
        for (let year = currentYear - 2; year <= currentYear + 1; year++) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            anneeSelect.appendChild(option);
        }

        moisSelect.addEventListener('change', () => this.applyFilters());
        anneeSelect.addEventListener('change', () => this.applyFilters());
        document.getElementById('loyer-statut').addEventListener('change', () => this.applyFilters());
    }

    applyFilters() {
        this.filters.mois = document.getElementById('loyer-mois').value;
        this.filters.annee = document.getElementById('loyer-annee').value;
        this.filters.statut = document.getElementById('loyer-statut').value;
        this.loadLoyers();
    }

    loadLoyers() {
        const tableBody = document.getElementById('loyers-table');
        let loyers = storage.getLoyers();
        
        if (this.filters.mois) {
            loyers = loyers.filter(loyer => loyer.mois === this.filters.mois);
        }
        if (this.filters.annee) {
            loyers = loyers.filter(loyer => loyer.annee.toString() === this.filters.annee);
        }
        if (this.filters.statut) {
            loyers = loyers.filter(loyer => loyer.statut === this.filters.statut);
        }

        loyers.sort((a, b) => {
            if (a.annee !== b.annee) return b.annee - a.annee;
            return parseInt(b.mois) - parseInt(a.mois);
        });
        
        if (loyers.length === 0) {
            ui.showEmptyState(tableBody.parentElement, 'Aucun loyer trouvé pour les critères sélectionnés.');
            return;
        }

        let html = '';
        loyers.forEach(loyer => {
            const bien = this.getBienById(loyer.bienId);
            const locataires = this.getLocatairesByIds(loyer.locataireIds);
            const locatairesNames = locataires.map(l => l.getFullName()).join(', ');
            
            const solde = loyer.getSolde();
            const soldeClass = solde === 0 ? '' : solde > 0 ? 'success' : 'danger';
            
            html += `
                <tr>
                    <td>${bien ? bien.getFullAddress() : 'Bien supprimé'}</td>
                    <td>${locatairesNames}</td>
                    <td>${this.getMoisName(loyer.mois)} ${loyer.annee}</td>
                    <td>${ui.formatCurrency(loyer.montantDu)}</td>
                    <td>${ui.formatCurrency(loyer.montantPaye)}</td>
                    <td class="${soldeClass}" style="font-weight: bold;">
                        ${ui.formatCurrency(Math.abs(solde))}
                        ${solde < 0 ? ' (dû)' : solde > 0 ? ' (trop-perçu)' : ''}
                    </td>
                    <td>
                        <span class="status-badge status-${loyer.statut}">
                            ${loyer.statut.toUpperCase()}
                        </span>
                    </td>
                    <td>
                        <div class="actions-menu">
                            <button class="btn-success" onclick="loyersModule.addPaiement('${loyer.id}')" title="Ajouter paiement">
                                <i class="fas fa-plus"></i>
                            </button>
                            <button class="btn-secondary" onclick="loyersModule.viewLoyer('${loyer.id}')" title="Détails">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn-warning" onclick="loyersModule.generateQuittance('${loyer.id}')" title="Quittance">
                                <i class="fas fa-receipt"></i>
                            </button>
                            <button class="btn-secondary" onclick="loyersModule.sendReminder('${loyer.id}')" title="Relance">
                                <i class="fas fa-bell"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });
        
        tableBody.innerHTML = html;
    }

    getMoisName(moisNumber) {
        const mois = [
            'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
            'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
        ];
        return mois[parseInt(moisNumber) - 1] || moisNumber;
    }

    getBienById(bienId) {
        const biens = storage.getBiens();
        return biens.find(bien => bien.id === bienId);
    }

    getLocatairesByIds(locataireIds) {
        const locataires = storage.getLocataires();
        return locataireIds.map(id => locataires.find(l => l.id === id)).filter(Boolean);
    }

    addPaiement(loyerId) {
        const loyer = storage.getLoyers().find(l => l.id === loyerId);
        if (!loyer) {
            ui.showNotification('Loyer introuvable', 'error');
            return;
        }

        this.currentLoyer = loyer;
        
        const modal = document.getElementById('paiement-modal');
        const loyerIdInput = document.getElementById('paiement-loyer-id');
        const montantInput = modal.querySelector('input[name="montant"]');
        const dateInput = modal.querySelector('input[name="date"]');
        
        loyerIdInput.value = loyerId;
        
        const montantRestant = loyer.montantDu - loyer.montantPaye;
        if (montantRestant > 0) {
            montantInput.value = montantRestant.toFixed(2);
        }
        
        dateInput.value = new Date().toISOString().split('T')[0];
        
        openModal('paiement-modal');
    }

    handlePaiementSubmit(formData) {
        const data = {};
        for (let [key, value] of formData.entries()) {
            data[key] = value.trim();
        }

        const loyerId = data.loyerId;
        const loyer = storage.getLoyers().find(l => l.id === loyerId);
        
        if (!loyer) {
            ui.showNotification('Loyer introuvable', 'error');
            return;
        }

        const montant = parseFloat(data.montant);
        if (isNaN(montant) || montant <= 0) {
            ui.showNotification('Le montant doit être supérieur à 0', 'error');
            return;
        }

        if (!data.date) {
            ui.showNotification('La date est requise', 'error');
            return;
        }

        const paiement = {
            id: Math.random().toString(36).substr(2, 9),
            montant: montant,
            date: data.date,
            mode: data.mode || 'virement',
            payeur: data.payeur || 'Locataire',
            reference: data.reference || '',
            commentaire: data.commentaire || ''
        };

        const loyerObj = new Loyer(loyer);
        loyerObj.addPaiement(paiement);
        
        storage.updateLoyer(loyerId, loyerObj);
        
        ui.showNotification('Paiement ajouté avec succès');
        setTimeout(() => {
            ui.closeModal('paiement-modal');
            this.refresh();
        }, 100);
    }

    viewLoyer(id) {
        const loyer = storage.getLoyers().find(l => l.id === id);
        if (!loyer) {
            ui.showNotification('Loyer introuvable', 'error');
            return;
        }

        const bien = this.getBienById(loyer.bienId);
        const locataires = this.getLocatairesByIds(loyer.locataireIds);
        const contrat = this.getContratById(loyer.contratId);

        let paiementsHtml = '';
        if (loyer.paiements && loyer.paiements.length > 0) {
            paiementsHtml = '<h4>Paiements :</h4>';
            paiementsHtml += '<div class="paiements-list">';
            
            loyer.paiements.forEach(paiement => {
                paiementsHtml += `
                    <div class="paiement-item" style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; border: 1px solid var(--border-color); border-radius: var(--radius); margin-bottom: 0.5rem;">
                        <div>
                            <strong>${ui.formatCurrency(paiement.montant)}</strong> - ${paiement.mode}
                            <br><small>Payé par: ${paiement.payeur} le ${ui.formatDate(paiement.date)}</small>
                            ${paiement.reference ? `<br><small>Réf: ${paiement.reference}</small>` : ''}
                            ${paiement.commentaire ? `<br><small>${paiement.commentaire}</small>` : ''}
                        </div>
                        <button class="btn-danger btn-sm" onclick="loyersModule.deletePaiement('${loyer.id}', '${paiement.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `;
            });
            
            paiementsHtml += '</div>';
        } else {
            paiementsHtml = '<p><em>Aucun paiement enregistré</em></p>';
        }

        const solde = loyer.getSolde();
        const soldeText = solde === 0 ? 'Soldé' : 
                         solde > 0 ? `Trop-perçu de ${ui.formatCurrency(solde)}` : 
                         `Reste dû: ${ui.formatCurrency(Math.abs(solde))}`;

        const modalContent = `
            <div class="loyer-details">
                <h3>Loyer ${this.getMoisName(loyer.mois)} ${loyer.annee}</h3>
                <div class="details-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin: 1rem 0;">
                    <div><strong>Bien :</strong> ${bien ? bien.getFullAddress() : 'Bien supprimé'}</div>
                    <div><strong>Locataire(s) :</strong> ${locataires.map(l => l.getFullName()).join(', ')}</div>
                    <div><strong>Montant dû :</strong> ${ui.formatCurrency(loyer.montantDu)}</div>
                    <div><strong>Montant payé :</strong> ${ui.formatCurrency(loyer.montantPaye)}</div>
                    <div><strong>Solde :</strong> ${soldeText}</div>
                    <div><strong>Statut :</strong> <span class="status-badge status-${loyer.statut}">${loyer.statut.toUpperCase()}</span></div>
                    <div><strong>Date d'échéance :</strong> ${ui.formatDate(loyer.dateEcheance)}</div>
                </div>
                ${loyer.commentaires ? `<p><strong>Commentaires :</strong> ${loyer.commentaires}</p>` : ''}
                ${paiementsHtml}
                <div style="margin-top: 1rem;">
                    <small><strong>Créé le :</strong> ${ui.formatDateTime(loyer.dateCreation)}</small>
                </div>
            </div>
        `;

        this.showViewModal('Détails du loyer', modalContent);
    }

    getContratById(contratId) {
        const contrats = storage.getContrats();
        return contrats.find(contrat => contrat.id === contratId);
    }

    deletePaiement(loyerId, paiementId) {
        ui.confirmDelete(
            'Êtes-vous sûr de vouloir supprimer ce paiement ?',
            () => {
                const loyer = storage.getLoyers().find(l => l.id === loyerId);
                if (loyer) {
                    loyer.paiements = loyer.paiements.filter(p => p.id !== paiementId);
                    loyer.montantPaye = loyer.paiements.reduce((total, p) => total + p.montant, 0);
                    
                    const loyerObj = new Loyer(loyer);
                    loyerObj.updateStatut();
                    
                    storage.updateLoyer(loyerId, loyerObj);
                    ui.showNotification('Paiement supprimé avec succès');
                    
                    closeViewModal();
                    this.refresh();
                }
            }
        );
    }

    generateQuittance(loyerId) {
        const loyer = storage.getLoyers().find(l => l.id === loyerId);
        if (!loyer) {
            ui.showNotification('Loyer introuvable', 'error');
            return;
        }

        if (loyer.montantPaye === 0) {
            ui.showNotification('Impossible de générer une quittance pour un loyer non payé', 'error');
            return;
        }

        const bien = this.getBienById(loyer.bienId);
        const locataires = this.getLocatairesByIds(loyer.locataireIds);
        
        const quittanceData = {
            loyerId: loyer.id,
            contratId: loyer.contratId,
            bienId: loyer.bienId,
            locataireIds: loyer.locataireIds,
            periode: `${this.getMoisName(loyer.mois)} ${loyer.annee}`,
            montant: loyer.montantPaye,
            dateGeneration: new Date().toISOString(),
            statut: 'generee'
        };

        const quittance = storage.addQuittance(quittanceData);
        
        ui.showNotification('Quittance générée avec succès');
        
        setTimeout(() => {
            ui.loadModule('quittances');
            const navItems = document.querySelectorAll('.nav-item');
            navItems.forEach(nav => nav.classList.remove('active'));
            document.querySelector('.nav-item[data-module="quittances"]').classList.add('active');
        }, 1000);
    }

    sendReminder(loyerId) {
        const loyer = storage.getLoyers().find(l => l.id === loyerId);
        if (!loyer) {
            ui.showNotification('Loyer introuvable', 'error');
            return;
        }

        if (loyer.isPaye()) {
            ui.showNotification('Ce loyer est déjà payé', 'warning');
            return;
        }

        const locataires = this.getLocatairesByIds(loyer.locataireIds);
        const bien = this.getBienById(loyer.bienId);
        
        const locatairesEmails = locataires.map(l => l.email).join(', ');
        
        ui.confirmDelete(
            `Envoyer un rappel de paiement à ${locatairesEmails} pour le loyer de ${this.getMoisName(loyer.mois)} ${loyer.annee} ?`,
            () => {
                ui.showNotification('Fonctionnalité d\'envoi d\'email en cours de développement. Rappel enregistré.', 'warning');
                
                if (!loyer.rappels) loyer.rappels = [];
                loyer.rappels.push({
                    date: new Date().toISOString(),
                    type: 'email',
                    destinataires: locatairesEmails
                });
                
                storage.updateLoyer(loyerId, loyer);
            }
        );
    }

    showViewModal(title, content) {
        const existingModal = document.getElementById('view-modal');
        if (existingModal) {
            existingModal.remove();
        }

        const modal = document.createElement('div');
        modal.id = 'view-modal';
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-header">
                <h3 class="modal-title">${title}</h3>
                <button type="button" class="modal-close" onclick="closeViewModal()">&times;</button>
            </div>
            <div class="modal-body">
                ${content}
            </div>
            <div class="modal-footer">
                <button type="button" class="btn-secondary" onclick="closeViewModal()">Fermer</button>
            </div>
        `;

        document.body.appendChild(modal);
        document.getElementById('overlay').classList.add('active');
    }

    generateMissingLoyers() {
        const contrats = storage.getContrats().filter(c => c.statut === 'actif');
        const today = new Date();
        let generated = 0;

        contrats.forEach(contrat => {
            for (let i = 0; i < 3; i++) {
                const date = new Date(today);
                date.setMonth(date.getMonth() + i);
                
                const mois = (date.getMonth() + 1).toString().padStart(2, '0');
                const annee = date.getFullYear();
                
                const existingLoyer = storage.getLoyers().find(l => 
                    l.contratId === contrat.id && l.mois === mois && l.annee === annee
                );
                
                if (!existingLoyer) {
                    const dateEcheance = new Date(annee, date.getMonth(), contrat.jourPaiement);
                    
                    const loyerData = {
                        contratId: contrat.id,
                        bienId: contrat.bienId,
                        locataireIds: contrat.locataireIds,
                        mois: mois,
                        annee: annee,
                        montantDu: contrat.loyer + contrat.charges,
                        montantPaye: 0,
                        paiements: [],
                        statut: 'attente',
                        dateEcheance: dateEcheance.toISOString().split('T')[0]
                    };
                    
                    storage.addLoyer(loyerData);
                    generated++;
                }
            }
        });

        if (generated > 0) {
            ui.showNotification(`${generated} loyers générés automatiquement`);
            this.refresh();
        }
    }
}

const loyersModule = new LoyersModule();