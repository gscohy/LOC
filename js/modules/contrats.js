class ContratsModule {
    constructor() {
        this.currentContrat = null;
        this.isEditing = false;
    }

    refresh() {
        this.loadContrats();
    }

    loadContrats() {
        const tableBody = document.getElementById('contrats-table');
        const contrats = storage.getContrats();
        
        if (contrats.length === 0) {
            ui.showEmptyState(tableBody.parentElement, 'Aucun contrat enregistré. Cliquez sur "Nouveau contrat" pour commencer.');
            return;
        }

        let html = '';
        contrats.forEach(contrat => {
            const bien = this.getBienById(contrat.bienId);
            const locataires = this.getLocatairesByIds(contrat.locataireIds);
            const locatairesNames = locataires.map(l => l.getFullName()).join(', ');
            
            const statut = this.getContractStatus(contrat);
            const statutClass = statut === 'Actif' ? 'status-actif' : 'status-expire';
            
            html += `
                <tr>
                    <td>${bien ? bien.getFullAddress() : 'Bien supprimé'}</td>
                    <td>${locatairesNames}</td>
                    <td>${ui.formatDate(contrat.dateDebut)}</td>
                    <td>${contrat.dateFin ? ui.formatDate(contrat.dateFin) : 'Indéterminée'}</td>
                    <td>${ui.formatCurrency(contrat.loyer)}</td>
                    <td>${ui.formatCurrency(contrat.charges)}</td>
                    <td>
                        <span class="status-badge ${statutClass}">
                            ${statut}
                        </span>
                    </td>
                    <td>
                        <div class="actions-menu">
                            <button class="btn-secondary" onclick="contratsModule.editContrat('${contrat.id}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-secondary" onclick="contratsModule.viewContrat('${contrat.id}')">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn-warning" onclick="contratsModule.generateLoyers('${contrat.id}')">
                                <i class="fas fa-calendar-plus"></i>
                            </button>
                            <button class="btn-danger" onclick="contratsModule.deleteContrat('${contrat.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });
        
        tableBody.innerHTML = html;
    }

    getBienById(bienId) {
        const biens = storage.getBiens();
        return biens.find(bien => bien.id === bienId);
    }

    getLocatairesByIds(locataireIds) {
        const locataires = storage.getLocataires();
        return locataireIds.map(id => locataires.find(l => l.id === id)).filter(Boolean);
    }

    getContractStatus(contrat) {
        if (contrat.statut === 'expire' || contrat.statut === 'resilie') {
            return 'Expiré';
        }
        
        if (contrat.dateFin && new Date(contrat.dateFin) < new Date()) {
            return 'Expiré';
        }
        
        return 'Actif';
    }

    populateSelects() {
        this.populateBiensSelect();
        this.populateLocatairesSelect();
    }

    populateBiensSelect() {
        const select = document.getElementById('contrat-bien-select');
        const biens = storage.getBiens();
        
        select.innerHTML = '<option value="">Sélectionner un bien</option>';
        
        const biensVacants = biens.filter(bien => {
            const contratActif = this.getContratActif(bien.id);
            return !contratActif;
        });
        
        biensVacants.forEach(bien => {
            const option = document.createElement('option');
            option.value = bien.id;
            option.textContent = `${bien.getFullAddress()} - ${ui.formatCurrency(bien.loyer)}`;
            select.appendChild(option);
        });
    }

    populateLocatairesSelect() {
        const select = document.getElementById('contrat-locataires-select');
        const locataires = storage.getLocataires();
        
        select.innerHTML = '';
        locataires.forEach(locataire => {
            const option = document.createElement('option');
            option.value = locataire.id;
            option.textContent = locataire.getFullName();
            select.appendChild(option);
        });
    }

    getContratActif(bienId) {
        const contrats = storage.getContrats();
        return contrats.find(contrat => 
            contrat.bienId === bienId && 
            contrat.statut === 'actif' && 
            (!contrat.dateFin || new Date(contrat.dateFin) > new Date())
        );
    }

    handleFormSubmit(formData) {
        const data = {};
        const locataireIds = [];
        
        for (let [key, value] of formData.entries()) {
            if (key === 'locataireIds') {
                locataireIds.push(value);
            } else {
                data[key] = value.trim();
            }
        }
        
        data.locataireIds = locataireIds;
        data.duree = parseInt(data.duree) || 12;
        data.loyer = parseFloat(data.loyer) || 0;
        data.charges = parseFloat(data.charges) || 0;
        data.depotGarantie = parseFloat(data.depotGarantie) || 0;
        data.jourPaiement = parseInt(data.jourPaiement) || 1;
        data.fraisNotaire = parseFloat(data.fraisNotaire) || 0;
        data.fraisHuissier = parseFloat(data.fraisHuissier) || 0;

        if (data.dateDebut && !data.dateFin && data.duree) {
            const dateDebut = new Date(data.dateDebut);
            const dateFin = new Date(dateDebut);
            dateFin.setMonth(dateFin.getMonth() + data.duree);
            data.dateFin = dateFin.toISOString().split('T')[0];
        }

        const contrat = new Contrat(data);
        const errors = contrat.validate();

        if (errors.length > 0) {
            ui.showNotification(errors.join(', '), 'error');
            return;
        }

        try {
            if (this.isEditing && this.currentContrat) {
                storage.updateContrat(this.currentContrat.id, data);
                ui.showNotification('Contrat modifié avec succès');
            } else {
                const newContrat = storage.addContrat(data);
                
                const bien = this.getBienById(data.bienId);
                if (bien) {
                    storage.updateBien(bien.id, { statut: 'loue' });
                }
                
                this.generateInitialLoyers(newContrat);
                ui.showNotification('Contrat ajouté avec succès');
            }

            setTimeout(() => {
                ui.closeModal('contrat-modal');
                this.refresh();
                this.resetForm();
            }, 100);
        } catch (error) {
            ui.showNotification('Erreur lors de l\'enregistrement', 'error');
            console.error(error);
        }
    }

    generateInitialLoyers(contrat) {
        const dateDebut = new Date(contrat.dateDebut);
        const dateFin = contrat.dateFin ? new Date(contrat.dateFin) : null;
        const current = new Date(dateDebut);
        
        const loyers = [];
        let count = 0;
        const maxLoyers = 24;
        
        while (count < maxLoyers && (!dateFin || current <= dateFin)) {
            const mois = current.getMonth() + 1;
            const annee = current.getFullYear();
            
            const dateEcheance = new Date(current.getFullYear(), current.getMonth(), contrat.jourPaiement);
            
            const loyerData = {
                contratId: contrat.id,
                bienId: contrat.bienId,
                locataireIds: contrat.locataireIds,
                mois: mois.toString().padStart(2, '0'),
                annee: annee,
                montantDu: contrat.loyer + contrat.charges,
                montantPaye: 0,
                paiements: [],
                statut: 'attente',
                dateEcheance: dateEcheance.toISOString().split('T')[0]
            };
            
            storage.addLoyer(loyerData);
            
            current.setMonth(current.getMonth() + 1);
            count++;
        }
    }

    editContrat(id) {
        const contrat = storage.getContrats().find(c => c.id === id);
        if (!contrat) {
            ui.showNotification('Contrat introuvable', 'error');
            return;
        }

        this.currentContrat = contrat;
        this.isEditing = true;

        const modal = document.getElementById('contrat-modal');
        const form = modal.querySelector('form');
        const title = modal.querySelector('.modal-title');

        title.textContent = 'Modifier le contrat';

        this.populateSelects();

        Object.keys(contrat).forEach(key => {
            const input = form.querySelector(`[name="${key}"]`);
            if (input && key !== 'id' && key !== 'dateCreation' && key !== 'locataireIds') {
                input.value = contrat[key] || '';
            }
        });

        const locatairesSelect = document.getElementById('contrat-locataires-select');
        contrat.locataireIds.forEach(id => {
            const option = locatairesSelect.querySelector(`option[value="${id}"]`);
            if (option) {
                option.selected = true;
            }
        });

        openModal('contrat-modal');
    }

    viewContrat(id) {
        const contrat = storage.getContrats().find(c => c.id === id);
        if (!contrat) {
            ui.showNotification('Contrat introuvable', 'error');
            return;
        }

        const bien = this.getBienById(contrat.bienId);
        const locataires = this.getLocatairesByIds(contrat.locataireIds);
        const loyers = this.getLoyersContrat(id);

        let locatairesHtml = '<h4>Locataires :</h4><ul>';
        locataires.forEach(locataire => {
            locatairesHtml += `
                <li>
                    ${locataire.getFullName()}
                    <br><small>${locataire.email} - ${locataire.telephone}</small>
                </li>
            `;
        });
        locatairesHtml += '</ul>';

        let loyersHtml = '';
        if (loyers.length > 0) {
            const loyersRecents = loyers.slice(-6);
            loyersHtml = '<h4>Derniers loyers :</h4><ul>';
            loyersRecents.forEach(loyer => {
                loyersHtml += `
                    <li style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0;">
                        <span>${loyer.mois}/${loyer.annee} - ${ui.formatCurrency(loyer.montantDu)}</span>
                        <span class="status-badge status-${loyer.statut}">${loyer.statut.toUpperCase()}</span>
                    </li>
                `;
            });
            loyersHtml += '</ul>';
        }

        const modalContent = `
            <div class="contrat-details">
                <h3>Contrat de location</h3>
                <div class="details-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin: 1rem 0;">
                    <div><strong>Bien :</strong> ${bien ? bien.getFullAddress() : 'Bien supprimé'}</div>
                    <div><strong>Type :</strong> ${contrat.type}</div>
                    <div><strong>Date début :</strong> ${ui.formatDate(contrat.dateDebut)}</div>
                    <div><strong>Date fin :</strong> ${contrat.dateFin ? ui.formatDate(contrat.dateFin) : 'Indéterminée'}</div>
                    <div><strong>Durée :</strong> ${contrat.duree} mois</div>
                    <div><strong>Jour de paiement :</strong> ${contrat.jourPaiement}</div>
                    <div><strong>Loyer :</strong> ${ui.formatCurrency(contrat.loyer)}</div>
                    <div><strong>Charges :</strong> ${ui.formatCurrency(contrat.charges)}</div>
                    <div><strong>Dépôt de garantie :</strong> ${ui.formatCurrency(contrat.depotGarantie)}</div>
                    <div><strong>Total mensuel :</strong> ${ui.formatCurrency(contrat.getTotalLoyer())}</div>
                </div>
                ${contrat.fraisNotaire > 0 ? `<p><strong>Frais de notaire :</strong> ${ui.formatCurrency(contrat.fraisNotaire)}</p>` : ''}
                ${contrat.fraisHuissier > 0 ? `<p><strong>Frais d'huissier :</strong> ${ui.formatCurrency(contrat.fraisHuissier)}</p>` : ''}
                ${contrat.clausesParticulieres ? `<p><strong>Clauses particulières :</strong></p><p>${contrat.clausesParticulieres}</p>` : ''}
                ${locatairesHtml}
                ${loyersHtml}
                <div style="margin-top: 1rem;">
                    <small><strong>Créé le :</strong> ${ui.formatDateTime(contrat.dateCreation)}</small>
                </div>
            </div>
        `;

        this.showViewModal('Détails du contrat', modalContent);
    }

    getLoyersContrat(contratId) {
        const loyers = storage.getLoyers();
        return loyers.filter(loyer => loyer.contratId === contratId);
    }

    generateLoyers(id) {
        const contrat = storage.getContrats().find(c => c.id === id);
        if (!contrat) {
            ui.showNotification('Contrat introuvable', 'error');
            return;
        }

        ui.confirmDelete(
            'Générer les loyers pour les 6 prochains mois ?',
            () => {
                const today = new Date();
                const loyers = [];
                
                for (let i = 0; i < 6; i++) {
                    const date = new Date(today);
                    date.setMonth(date.getMonth() + i);
                    
                    const mois = (date.getMonth() + 1).toString().padStart(2, '0');
                    const annee = date.getFullYear();
                    
                    const existingLoyer = storage.getLoyers().find(l => 
                        l.contratId === id && l.mois === mois && l.annee === annee
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
                        loyers.push(loyerData);
                    }
                }
                
                ui.showNotification(`${loyers.length} loyers générés avec succès`);
            }
        );
    }

    deleteContrat(id) {
        const contrat = storage.getContrats().find(c => c.id === id);
        if (!contrat) {
            ui.showNotification('Contrat introuvable', 'error');
            return;
        }

        const loyers = this.getLoyersContrat(id);
        const loyersPayes = loyers.filter(l => l.montantPaye > 0);
        
        if (loyersPayes.length > 0) {
            ui.showNotification('Impossible de supprimer ce contrat car il a des loyers payés', 'error');
            return;
        }

        ui.confirmDelete(
            `Êtes-vous sûr de vouloir supprimer ce contrat ? Cela supprimera aussi tous les loyers associés.`,
            () => {
                loyers.forEach(loyer => {
                    storage.deleteLoyer(loyer.id);
                });
                
                const bien = this.getBienById(contrat.bienId);
                if (bien) {
                    storage.updateBien(bien.id, { statut: 'vacant' });
                }
                
                storage.deleteContrat(id);
                ui.showNotification('Contrat supprimé avec succès');
                this.refresh();
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

    resetForm() {
        this.currentContrat = null;
        this.isEditing = false;
        
        const modal = document.getElementById('contrat-modal');
        const title = modal.querySelector('.modal-title');
        title.textContent = 'Nouveau Contrat';
    }
}

const contratsModule = new ContratsModule();