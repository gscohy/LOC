class LocatairesModule {
    constructor() {
        this.currentLocataire = null;
        this.isEditing = false;
    }

    refresh() {
        this.loadLocataires();
    }

    loadLocataires() {
        const tableBody = document.getElementById('locataires-table');
        const locataires = storage.getLocataires();
        
        if (locataires.length === 0) {
            ui.showEmptyState(tableBody.parentElement, 'Aucun locataire enregistré. Cliquez sur "Nouveau locataire" pour commencer.');
            return;
        }

        let html = '';
        locataires.forEach(locataire => {
            const bienOccupe = this.getBienOccupe(locataire.id);
            const bienText = bienOccupe ? bienOccupe.getFullAddress() : 'Aucun';
            
            html += `
                <tr>
                    <td>${locataire.civilite}</td>
                    <td>${locataire.nom}</td>
                    <td>${locataire.prenom}</td>
                    <td>${locataire.email}</td>
                    <td>${locataire.telephone}</td>
                    <td>${bienText}</td>
                    <td>
                        <div class="actions-menu">
                            <button class="btn-secondary" onclick="locatairesModule.editLocataire('${locataire.id}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-secondary" onclick="locatairesModule.viewLocataire('${locataire.id}')">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn-success" onclick="locatairesModule.manageLoyersLocataire('${locataire.id}')">
                                <i class="fas fa-euro-sign"></i>
                            </button>
                            <button class="btn-danger" onclick="locatairesModule.deleteLocataire('${locataire.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });
        
        tableBody.innerHTML = html;
    }

    getBienOccupe(locataireId) {
        const contrats = storage.getContrats();
        const contratActif = contrats.find(contrat => 
            contrat.locataireIds.includes(locataireId) && 
            contrat.statut === 'actif' &&
            (!contrat.dateFin || new Date(contrat.dateFin) > new Date())
        );
        
        if (contratActif) {
            const biens = storage.getBiens();
            return biens.find(bien => bien.id === contratActif.bienId);
        }
        
        return null;
    }

    handleFormSubmit(formData) {
        const data = {};
        for (let [key, value] of formData.entries()) {
            data[key] = value.trim();
        }

        data.revenus = parseFloat(data.revenus) || 0;

        const locataire = new Locataire(data);
        const errors = locataire.validate();

        if (errors.length > 0) {
            ui.showNotification(errors.join(', '), 'error');
            return;
        }

        try {
            if (this.isEditing && this.currentLocataire) {
                storage.updateLocataire(this.currentLocataire.id, data);
                ui.showNotification('Locataire modifié avec succès');
            } else {
                storage.addLocataire(data);
                ui.showNotification('Locataire ajouté avec succès');
            }

            setTimeout(() => {
                ui.closeModal('locataire-modal');
                this.refresh();
                this.resetForm();
            }, 100);
        } catch (error) {
            ui.showNotification('Erreur lors de l\'enregistrement', 'error');
            console.error(error);
        }
    }

    editLocataire(id) {
        const locataire = storage.getLocataires().find(l => l.id === id);
        if (!locataire) {
            ui.showNotification('Locataire introuvable', 'error');
            return;
        }

        this.currentLocataire = locataire;
        this.isEditing = true;

        const modal = document.getElementById('locataire-modal');
        const form = modal.querySelector('form');
        const title = modal.querySelector('.modal-title');

        title.textContent = 'Modifier le locataire';

        Object.keys(locataire).forEach(key => {
            const input = form.querySelector(`[name="${key}"]`);
            if (input && key !== 'id' && key !== 'dateCreation') {
                input.value = locataire[key] || '';
            }
        });

        openModal('locataire-modal');
    }

    viewLocataire(id) {
        const locataire = storage.getLocataires().find(l => l.id === id);
        if (!locataire) {
            ui.showNotification('Locataire introuvable', 'error');
            return;
        }

        const bienOccupe = this.getBienOccupe(id);
        const contrats = this.getContratsLocataire(id);
        const loyers = this.getLoyersLocataire(id);
        const garants = this.getGarantsLocataire(id);

        let bienHtml = '';
        if (bienOccupe) {
            bienHtml = `
                <h4>Bien occupé actuellement :</h4>
                <p>${bienOccupe.getFullAddress()}</p>
                <p><strong>Loyer :</strong> ${ui.formatCurrency(bienOccupe.loyer)} + ${ui.formatCurrency(bienOccupe.charges)} charges</p>
            `;
        } else {
            bienHtml = '<p><em>Aucun bien occupé actuellement</em></p>';
        }

        let contratsHtml = '';
        if (contrats.length > 0) {
            contratsHtml = '<h4>Historique des contrats :</h4><ul>';
            contrats.forEach(contrat => {
                const bien = this.getBienByContrat(contrat);
                const statut = contrat.statut === 'actif' ? 'Actif' : 'Terminé';
                contratsHtml += `
                    <li>
                        ${bien ? bien.getFullAddress() : 'Bien supprimé'} - 
                        ${ui.formatDate(contrat.dateDebut)} → ${contrat.dateFin ? ui.formatDate(contrat.dateFin) : 'En cours'} 
                        (${statut})
                    </li>
                `;
            });
            contratsHtml += '</ul>';
        }

        let garantsHtml = '';
        if (garants.length > 0) {
            garantsHtml = '<h4>Garants :</h4><ul>';
            garants.forEach(garant => {
                garantsHtml += `<li>${garant.getFullName()} - ${garant.typeGarantie}</li>`;
            });
            garantsHtml += '</ul>';
        }

        let loyersHtml = '';
        if (loyers.length > 0) {
            const loyersRecents = loyers.slice(-6);
            loyersHtml = '<h4>Derniers loyers :</h4><ul>';
            loyersRecents.forEach(loyer => {
                const statusClass = loyer.statut === 'paye' ? 'success' : loyer.statut === 'retard' ? 'danger' : 'warning';
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
            <div class="locataire-details">
                <h3>${locataire.getFullName()}</h3>
                <div class="details-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin: 1rem 0;">
                    <div><strong>Email :</strong> ${locataire.email}</div>
                    <div><strong>Téléphone :</strong> ${locataire.telephone}</div>
                    <div><strong>Date de naissance :</strong> ${locataire.dateNaissance ? ui.formatDate(locataire.dateNaissance) : 'Non renseignée'}</div>
                    <div><strong>Profession :</strong> ${locataire.profession || 'Non renseignée'}</div>
                    <div><strong>Revenus :</strong> ${locataire.revenus ? ui.formatCurrency(locataire.revenus) : 'Non renseignés'}</div>
                    <div><strong>Adresse :</strong> ${locataire.adresse || 'Non renseignée'}</div>
                </div>
                ${bienHtml}
                ${contratsHtml}
                ${garantsHtml}
                ${loyersHtml}
                <div style="margin-top: 1rem;">
                    <small><strong>Créé le :</strong> ${ui.formatDateTime(locataire.dateCreation)}</small>
                </div>
            </div>
        `;

        this.showViewModal('Détails du locataire', modalContent);
    }

    getContratsLocataire(locataireId) {
        const contrats = storage.getContrats();
        return contrats.filter(contrat => contrat.locataireIds.includes(locataireId));
    }

    getLoyersLocataire(locataireId) {
        const loyers = storage.getLoyers();
        return loyers.filter(loyer => loyer.locataireIds.includes(locataireId));
    }

    getGarantsLocataire(locataireId) {
        const garants = storage.getGarants();
        return garants.filter(garant => 
            garant.locataireIds && garant.locataireIds.includes(locataireId)
        );
    }

    getBienByContrat(contrat) {
        const biens = storage.getBiens();
        return biens.find(bien => bien.id === contrat.bienId);
    }

    manageLoyersLocataire(id) {
        ui.loadModule('loyers');
        
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(nav => nav.classList.remove('active'));
        document.querySelector('.nav-item[data-module="loyers"]').classList.add('active');
        
        setTimeout(() => {
            const locataireFilter = document.getElementById('loyer-locataire-filter');
            if (locataireFilter) {
                locataireFilter.value = id;
                loyersModule.applyFilters();
            }
        }, 100);
    }

    deleteLocataire(id) {
        const locataire = storage.getLocataires().find(l => l.id === id);
        if (!locataire) {
            ui.showNotification('Locataire introuvable', 'error');
            return;
        }

        const contrats = this.getContratsLocataire(id);
        const contratsActifs = contrats.filter(c => c.statut === 'actif');
        
        if (contratsActifs.length > 0) {
            ui.showNotification('Impossible de supprimer ce locataire car il a des contrats actifs', 'error');
            return;
        }

        ui.confirmDelete(
            `Êtes-vous sûr de vouloir supprimer le locataire "${locataire.getFullName()}" ?`,
            () => {
                storage.deleteLocataire(id);
                ui.showNotification('Locataire supprimé avec succès');
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
        this.currentLocataire = null;
        this.isEditing = false;
        
        const modal = document.getElementById('locataire-modal');
        const title = modal.querySelector('.modal-title');
        title.textContent = 'Nouveau Locataire';
    }
}

const locatairesModule = new LocatairesModule();