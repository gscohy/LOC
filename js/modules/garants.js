class GarantsModule {
    constructor() {
        this.currentGarant = null;
        this.isEditing = false;
    }

    refresh() {
        this.loadGarants();
    }

    loadGarants() {
        const tableBody = document.getElementById('garants-table');
        const garants = storage.getGarants();
        
        if (garants.length === 0) {
            ui.showEmptyState(tableBody.parentElement, 'Aucun garant enregistré. Cliquez sur "Nouveau garant" pour commencer.');
            return;
        }

        let html = '';
        garants.forEach(garant => {
            const locataireGaranti = this.getLocataireGaranti(garant.id);
            const locataireText = locataireGaranti ? locataireGaranti.getFullName() : 'Aucun';
            
            html += `
                <tr>
                    <td>${garant.civilite}</td>
                    <td>${garant.nom}</td>
                    <td>${garant.prenom}</td>
                    <td>${garant.email}</td>
                    <td>${garant.telephone}</td>
                    <td>${locataireText}</td>
                    <td>
                        <div class="actions-menu">
                            <button class="btn-secondary" onclick="garantsModule.editGarant('${garant.id}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-secondary" onclick="garantsModule.viewGarant('${garant.id}')">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn-danger" onclick="garantsModule.deleteGarant('${garant.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });
        
        tableBody.innerHTML = html;
    }

    getLocataireGaranti(garantId) {
        const locataires = storage.getLocataires();
        return locataires.find(locataire => 
            locataire.garants && locataire.garants.includes(garantId)
        );
    }

    handleFormSubmit(formData) {
        const data = {};
        for (let [key, value] of formData.entries()) {
            data[key] = value.trim();
        }

        data.revenus = parseFloat(data.revenus) || 0;

        const garant = new Garant(data);
        const errors = garant.validate();

        if (errors.length > 0) {
            ui.showNotification(errors.join(', '), 'error');
            return;
        }

        try {
            if (this.isEditing && this.currentGarant) {
                storage.updateGarant(this.currentGarant.id, data);
                ui.showNotification('Garant modifié avec succès');
            } else {
                storage.addGarant(data);
                ui.showNotification('Garant ajouté avec succès');
            }

            setTimeout(() => {
                ui.closeModal('garant-modal');
                this.refresh();
                this.resetForm();
            }, 100);
        } catch (error) {
            ui.showNotification('Erreur lors de l\'enregistrement', 'error');
            console.error(error);
        }
    }

    editGarant(id) {
        const garant = storage.getGarants().find(g => g.id === id);
        if (!garant) {
            ui.showNotification('Garant introuvable', 'error');
            return;
        }

        this.currentGarant = garant;
        this.isEditing = true;

        const modal = document.getElementById('garant-modal');
        const form = modal.querySelector('form');
        const title = modal.querySelector('.modal-title');

        title.textContent = 'Modifier le garant';

        Object.keys(garant).forEach(key => {
            const input = form.querySelector(`[name="${key}"]`);
            if (input && key !== 'id' && key !== 'dateCreation') {
                input.value = garant[key] || '';
            }
        });

        openModal('garant-modal');
    }

    viewGarant(id) {
        const garant = storage.getGarants().find(g => g.id === id);
        if (!garant) {
            ui.showNotification('Garant introuvable', 'error');
            return;
        }

        const locataireGaranti = this.getLocataireGaranti(id);

        let locataireHtml = '';
        if (locataireGaranti) {
            locataireHtml = `
                <h4>Locataire garanti :</h4>
                <p>${locataireGaranti.getFullName()}</p>
                <p><strong>Email :</strong> ${locataireGaranti.email}</p>
                <p><strong>Téléphone :</strong> ${locataireGaranti.telephone}</p>
            `;
        } else {
            locataireHtml = '<p><em>Aucun locataire associé à ce garant</em></p>';
        }

        const modalContent = `
            <div class="garant-details">
                <h3>${garant.getFullName()}</h3>
                <div class="details-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin: 1rem 0;">
                    <div><strong>Email :</strong> ${garant.email}</div>
                    <div><strong>Téléphone :</strong> ${garant.telephone}</div>
                    <div><strong>Type de garantie :</strong> ${garant.typeGarantie}</div>
                    <div><strong>Profession :</strong> ${garant.profession || 'Non renseignée'}</div>
                    <div><strong>Revenus :</strong> ${garant.revenus ? ui.formatCurrency(garant.revenus) : 'Non renseignés'}</div>
                    <div><strong>Adresse :</strong> ${garant.adresse || 'Non renseignée'}</div>
                </div>
                ${locataireHtml}
                <div style="margin-top: 1rem;">
                    <small><strong>Créé le :</strong> ${ui.formatDateTime(garant.dateCreation)}</small>
                </div>
            </div>
        `;

        this.showViewModal('Détails du garant', modalContent);
    }

    deleteGarant(id) {
        const garant = storage.getGarants().find(g => g.id === id);
        if (!garant) {
            ui.showNotification('Garant introuvable', 'error');
            return;
        }

        const locataireGaranti = this.getLocataireGaranti(id);
        if (locataireGaranti) {
            ui.showNotification('Impossible de supprimer ce garant car il est associé à un locataire', 'error');
            return;
        }

        ui.confirmDelete(
            `Êtes-vous sûr de vouloir supprimer le garant "${garant.getFullName()}" ?`,
            () => {
                storage.deleteGarant(id);
                ui.showNotification('Garant supprimé avec succès');
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
        this.currentGarant = null;
        this.isEditing = false;
        
        const modal = document.getElementById('garant-modal');
        const title = modal.querySelector('.modal-title');
        title.textContent = 'Nouveau Garant';
    }
}

const garantsModule = new GarantsModule();