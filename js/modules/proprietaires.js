class ProprietairesModule {
    constructor() {
        this.currentProprietaire = null;
        this.isEditing = false;
    }

    refresh() {
        this.loadProprietaires();
    }

    loadProprietaires() {
        const tableBody = document.getElementById('proprietaires-table');
        const proprietaires = storage.getProprietaires();
        
        if (proprietaires.length === 0) {
            ui.showEmptyState(tableBody.parentElement, 'Aucun propriétaire enregistré. Cliquez sur "Nouveau propriétaire" pour commencer.');
            return;
        }

        let html = '';
        proprietaires.forEach(proprietaire => {
            const biens = this.getBiensForProprietaire(proprietaire.id);
            html += `
                <tr>
                    <td>${proprietaire.nom}</td>
                    <td>${proprietaire.prenom}</td>
                    <td>${proprietaire.email}</td>
                    <td>${biens.length}</td>
                    <td>
                        <div class="actions-menu">
                            <button class="btn-secondary" onclick="proprietairesModule.editProprietaire('${proprietaire.id}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-secondary" onclick="proprietairesModule.viewProprietaire('${proprietaire.id}')">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn-danger" onclick="proprietairesModule.deleteProprietaire('${proprietaire.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });
        
        tableBody.innerHTML = html;
    }

    getBiensForProprietaire(proprietaireId) {
        const biens = storage.getBiens();
        return biens.filter(bien => 
            bien.proprietaires.some(prop => prop.id === proprietaireId)
        );
    }

    handleFormSubmit(formData) {
        const data = {};
        for (let [key, value] of formData.entries()) {
            data[key] = value.trim();
        }

        const proprietaire = new Proprietaire(data);
        const errors = proprietaire.validate();

        if (errors.length > 0) {
            ui.showNotification(errors.join(', '), 'error');
            return;
        }

        try {
            if (this.isEditing && this.currentProprietaire) {
                storage.updateProprietaire(this.currentProprietaire.id, data);
                ui.showNotification('Propriétaire modifié avec succès');
            } else {
                storage.addProprietaire(data);
                ui.showNotification('Propriétaire ajouté avec succès');
            }

            // Fermer le modal après un court délai pour laisser la notification s'afficher
            setTimeout(() => {
                ui.closeModal('proprietaire-modal');
                this.refresh();
                this.resetForm();
            }, 100);
        } catch (error) {
            ui.showNotification('Erreur lors de l\'enregistrement', 'error');
            console.error(error);
        }
    }

    editProprietaire(id) {
        const proprietaire = storage.getProprietaires().find(p => p.id === id);
        if (!proprietaire) {
            ui.showNotification('Propriétaire introuvable', 'error');
            return;
        }

        this.currentProprietaire = proprietaire;
        this.isEditing = true;

        const modal = document.getElementById('proprietaire-modal');
        const form = modal.querySelector('form');
        const title = modal.querySelector('.modal-title');

        title.textContent = 'Modifier le propriétaire';

        Object.keys(proprietaire).forEach(key => {
            const input = form.querySelector(`[name="${key}"]`);
            if (input && key !== 'id' && key !== 'dateCreation') {
                input.value = proprietaire[key] || '';
            }
        });

        openModal('proprietaire-modal');
    }

    viewProprietaire(id) {
        const proprietaire = storage.getProprietaires().find(p => p.id === id);
        if (!proprietaire) {
            ui.showNotification('Propriétaire introuvable', 'error');
            return;
        }

        const biens = this.getBiensForProprietaire(id);
        let biensHtml = '';

        if (biens.length > 0) {
            biensHtml = '<h4>Biens associés :</h4><ul>';
            biens.forEach(bien => {
                biensHtml += `<li>${bien.getFullAddress()} - ${ui.formatCurrency(bien.loyer)}/mois</li>`;
            });
            biensHtml += '</ul>';
        } else {
            biensHtml = '<p><em>Aucun bien associé</em></p>';
        }

        const modalContent = `
            <div class="proprietaire-details">
                <h3>${proprietaire.getFullName()}</h3>
                <div class="details-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin: 1rem 0;">
                    <div><strong>Email :</strong> ${proprietaire.email}</div>
                    <div><strong>Téléphone :</strong> ${proprietaire.telephone || 'Non renseigné'}</div>
                    <div><strong>Adresse :</strong> ${proprietaire.adresse || 'Non renseignée'}</div>
                    <div><strong>Ville :</strong> ${proprietaire.ville || 'Non renseignée'} ${proprietaire.codePostal || ''}</div>
                </div>
                ${biensHtml}
                <div style="margin-top: 1rem;">
                    <small><strong>Créé le :</strong> ${ui.formatDateTime(proprietaire.dateCreation)}</small>
                </div>
            </div>
        `;

        this.showViewModal('Détails du propriétaire', modalContent);
    }

    deleteProprietaire(id) {
        const proprietaire = storage.getProprietaires().find(p => p.id === id);
        if (!proprietaire) {
            ui.showNotification('Propriétaire introuvable', 'error');
            return;
        }

        const biens = this.getBiensForProprietaire(id);
        if (biens.length > 0) {
            ui.showNotification('Impossible de supprimer ce propriétaire car il possède des biens', 'error');
            return;
        }

        ui.confirmDelete(
            `Êtes-vous sûr de vouloir supprimer le propriétaire "${proprietaire.getFullName()}" ?`,
            () => {
                storage.deleteProprietaire(id);
                ui.showNotification('Propriétaire supprimé avec succès');
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
        this.currentProprietaire = null;
        this.isEditing = false;
        
        const modal = document.getElementById('proprietaire-modal');
        const title = modal.querySelector('.modal-title');
        title.textContent = 'Nouveau Propriétaire';
    }
}

function closeViewModal() {
    const modal = document.getElementById('view-modal');
    const overlay = document.getElementById('overlay');
    
    if (modal) {
        modal.remove();
    }
    
    if (overlay) {
        overlay.classList.remove('active');
    }
}

const proprietairesModule = new ProprietairesModule();