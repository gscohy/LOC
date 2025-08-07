class BiensModule {
    constructor() {
        this.currentBien = null;
        this.isEditing = false;
    }

    refresh() {
        this.loadBiens();
    }

    loadBiens() {
        const container = document.getElementById('biens-grid');
        const biens = storage.getBiens();
        
        if (biens.length === 0) {
            ui.showEmptyState(container, 'Aucun bien enregistré. Cliquez sur "Nouveau bien" pour commencer.');
            return;
        }

        let html = '';
        biens.forEach(bien => {
            const proprietaires = storage.getProprietaires().filter(p => 
                bien.proprietaires.some(prop => prop.id === p.id)
            );
            const proprietairesNames = proprietaires.map(p => p.getFullName()).join(', ');
            const contratActif = this.getContratActif(bien.id);
            const statut = contratActif ? 'loue' : 'vacant';
            
            html += `
                <div class="bien-card">
                    <div class="bien-image">
                        <i class="fas fa-home"></i>
                    </div>
                    <div class="bien-content">
                        <div class="bien-title">${bien.getFullAddress()}</div>
                        <div class="bien-details">
                            <div class="bien-detail">
                                <i class="fas fa-expand-arrows-alt"></i>
                                ${bien.surface}m² - ${bien.nbPieces} pièces
                            </div>
                            <div class="bien-detail">
                                <i class="fas fa-euro-sign"></i>
                                ${ui.formatCurrency(bien.loyer)} + ${ui.formatCurrency(bien.charges)} charges
                            </div>
                            <div class="bien-detail">
                                <i class="fas fa-user-tie"></i>
                                ${proprietairesNames}
                            </div>
                            ${contratActif ? `
                                <div class="bien-detail">
                                    <i class="fas fa-users"></i>
                                    Locataire: ${this.getLocatairesNames(contratActif.locataireIds)}
                                </div>
                            ` : ''}
                        </div>
                        <div class="bien-status ${statut === 'loue' ? 'status-loue' : 'status-vacant'}">
                            ${statut === 'loue' ? 'Loué' : 'Vacant'}
                        </div>
                        <div class="bien-actions">
                            <button class="btn-secondary" onclick="biensModule.editBien('${bien.id}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-secondary" onclick="biensModule.viewBien('${bien.id}')">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn-success" onclick="biensModule.manageLoyersBien('${bien.id}')">
                                <i class="fas fa-euro-sign"></i>
                            </button>
                            <button class="btn-danger" onclick="biensModule.deleteBien('${bien.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    }

    getContratActif(bienId) {
        const contrats = storage.getContrats();
        return contrats.find(contrat => 
            contrat.bienId === bienId && 
            contrat.statut === 'actif' && 
            (!contrat.dateFin || new Date(contrat.dateFin) > new Date())
        );
    }

    getLocatairesNames(locataireIds) {
        const locataires = storage.getLocataires();
        return locataireIds
            .map(id => {
                const locataire = locataires.find(l => l.id === id);
                return locataire ? locataire.getFullName() : 'Inconnu';
            })
            .join(', ');
    }

    populateProprietairesSelect() {
        const select = document.getElementById('proprietaires-select');
        const proprietaires = storage.getProprietaires();
        
        select.innerHTML = '';
        proprietaires.forEach(proprietaire => {
            const option = document.createElement('option');
            option.value = proprietaire.id;
            option.textContent = proprietaire.getFullName();
            select.appendChild(option);
        });
    }

    handleFormSubmit(formData) {
        const data = {};
        for (let [key, value] of formData.entries()) {
            if (key === 'proprietaires') {
                if (!data.proprietaires) data.proprietaires = [];
                data.proprietaires.push({ id: value, quotePart: 100 });
            } else {
                data[key] = value.trim();
            }
        }

        if (data.proprietaires && data.proprietaires.length > 1) {
            const quotePart = 100 / data.proprietaires.length;
            data.proprietaires.forEach(prop => {
                prop.quotePart = quotePart;
            });
        }

        data.surface = parseFloat(data.surface) || 0;
        data.nbPieces = parseInt(data.nbPieces) || 1;
        data.nbChambres = parseInt(data.nbChambres) || 0;
        data.loyer = parseFloat(data.loyer) || 0;
        data.charges = parseFloat(data.charges) || 0;
        data.depotGarantie = parseFloat(data.depotGarantie) || 0;

        const bien = new Bien(data);
        const errors = bien.validate();

        if (errors.length > 0) {
            ui.showNotification(errors.join(', '), 'error');
            return;
        }

        try {
            if (this.isEditing && this.currentBien) {
                storage.updateBien(this.currentBien.id, data);
                ui.showNotification('Bien modifié avec succès');
            } else {
                storage.addBien(data);
                ui.showNotification('Bien ajouté avec succès');
            }

            setTimeout(() => {
                ui.closeModal('bien-modal');
                this.refresh();
                this.resetForm();
            }, 100);
        } catch (error) {
            ui.showNotification('Erreur lors de l\'enregistrement', 'error');
            console.error(error);
        }
    }

    editBien(id) {
        const bien = storage.getBiens().find(b => b.id === id);
        if (!bien) {
            ui.showNotification('Bien introuvable', 'error');
            return;
        }

        this.currentBien = bien;
        this.isEditing = true;

        const modal = document.getElementById('bien-modal');
        const form = modal.querySelector('form');
        const title = modal.querySelector('.modal-title');

        title.textContent = 'Modifier le bien';

        Object.keys(bien).forEach(key => {
            const input = form.querySelector(`[name="${key}"]`);
            if (input && key !== 'id' && key !== 'dateCreation' && key !== 'proprietaires') {
                input.value = bien[key] || '';
            }
        });

        this.populateProprietairesSelect();
        
        const proprietairesSelect = document.getElementById('proprietaires-select');
        bien.proprietaires.forEach(prop => {
            const option = proprietairesSelect.querySelector(`option[value="${prop.id}"]`);
            if (option) {
                option.selected = true;
            }
        });

        openModal('bien-modal');
    }

    viewBien(id) {
        const bien = storage.getBiens().find(b => b.id === id);
        if (!bien) {
            ui.showNotification('Bien introuvable', 'error');
            return;
        }

        const proprietaires = storage.getProprietaires().filter(p => 
            bien.proprietaires.some(prop => prop.id === p.id)
        );
        const contratActif = this.getContratActif(id);
        const loyers = this.getLoyersBien(id);

        let proprietairesHtml = '<h4>Propriétaires :</h4><ul>';
        proprietaires.forEach(prop => {
            const quotePart = bien.proprietaires.find(p => p.id === prop.id)?.quotePart || 100;
            proprietairesHtml += `<li>${prop.getFullName()} (${quotePart}%)</li>`;
        });
        proprietairesHtml += '</ul>';

        let contratHtml = '';
        if (contratActif) {
            const locataires = this.getLocatairesNames(contratActif.locataireIds);
            contratHtml = `
                <h4>Contrat actif :</h4>
                <div class="contrat-info">
                    <p><strong>Locataire(s) :</strong> ${locataires}</p>
                    <p><strong>Période :</strong> ${ui.formatDate(contratActif.dateDebut)} - ${contratActif.dateFin ? ui.formatDate(contratActif.dateFin) : 'Indéterminée'}</p>
                    <p><strong>Loyer :</strong> ${ui.formatCurrency(contratActif.loyer)} + ${ui.formatCurrency(contratActif.charges)} charges</p>
                </div>
            `;
        } else {
            contratHtml = '<p><em>Aucun contrat actif - Bien vacant</em></p>';
        }

        let loyersHtml = '';
        if (loyers.length > 0) {
            loyersHtml = '<h4>Derniers loyers :</h4><ul>';
            loyers.slice(-5).forEach(loyer => {
                const statusClass = loyer.statut === 'paye' ? 'success' : loyer.statut === 'retard' ? 'danger' : 'warning';
                loyersHtml += `
                    <li>
                        <span>${loyer.mois}/${loyer.annee} - ${ui.formatCurrency(loyer.montantDu)}</span>
                        <span class="status-badge status-${loyer.statut}">${loyer.statut.toUpperCase()}</span>
                    </li>
                `;
            });
            loyersHtml += '</ul>';
        }

        const modalContent = `
            <div class="bien-details">
                <h3>${bien.getFullAddress()}</h3>
                <div class="details-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin: 1rem 0;">
                    <div><strong>Type :</strong> ${bien.type}</div>
                    <div><strong>Surface :</strong> ${bien.surface}m²</div>
                    <div><strong>Pièces :</strong> ${bien.nbPieces}</div>
                    <div><strong>Chambres :</strong> ${bien.nbChambres}</div>
                    <div><strong>Loyer :</strong> ${ui.formatCurrency(bien.loyer)}</div>
                    <div><strong>Charges :</strong> ${ui.formatCurrency(bien.charges)}</div>
                </div>
                ${bien.description ? `<p><strong>Description :</strong> ${bien.description}</p>` : ''}
                ${proprietairesHtml}
                ${contratHtml}
                ${loyersHtml}
                <div style="margin-top: 1rem;">
                    <small><strong>Créé le :</strong> ${ui.formatDateTime(bien.dateCreation)}</small>
                </div>
            </div>
        `;

        this.showViewModal('Détails du bien', modalContent);
    }

    getLoyersBien(bienId) {
        const loyers = storage.getLoyers();
        return loyers.filter(loyer => loyer.bienId === bienId);
    }

    manageLoyersBien(id) {
        ui.loadModule('loyers');
        
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(nav => nav.classList.remove('active'));
        document.querySelector('.nav-item[data-module="loyers"]').classList.add('active');
        
        setTimeout(() => {
            const bienFilter = document.getElementById('loyer-bien-filter');
            if (bienFilter) {
                bienFilter.value = id;
                loyersModule.applyFilters();
            }
        }, 100);
    }

    deleteBien(id) {
        const bien = storage.getBiens().find(b => b.id === id);
        if (!bien) {
            ui.showNotification('Bien introuvable', 'error');
            return;
        }

        const contrats = storage.getContrats().filter(c => c.bienId === id);
        if (contrats.length > 0) {
            ui.showNotification('Impossible de supprimer ce bien car il a des contrats associés', 'error');
            return;
        }

        ui.confirmDelete(
            `Êtes-vous sûr de vouloir supprimer le bien "${bien.getFullAddress()}" ?`,
            () => {
                storage.deleteBien(id);
                ui.showNotification('Bien supprimé avec succès');
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
        this.currentBien = null;
        this.isEditing = false;
        
        const modal = document.getElementById('bien-modal');
        const title = modal.querySelector('.modal-title');
        title.textContent = 'Nouveau Bien';
    }
}

const biensModule = new BiensModule();