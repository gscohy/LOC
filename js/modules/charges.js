class ChargesModule {
    constructor() {
        this.currentCharge = null;
        this.isEditing = false;
    }

    refresh() {
        this.loadCharges();
    }

    loadCharges() {
        const tableBody = document.getElementById('charges-table');
        const charges = storage.getCharges();
        
        if (charges.length === 0) {
            ui.showEmptyState(tableBody.parentElement, 'Aucune charge enregistrée. Cliquez sur "Nouvelle charge" pour commencer.');
            return;
        }

        charges.sort((a, b) => new Date(b.date) - new Date(a.date));

        let html = '';
        charges.forEach(charge => {
            const bien = this.getBienById(charge.bienId);
            
            html += `
                <tr>
                    <td>${ui.formatDate(charge.date)}</td>
                    <td>${bien ? bien.getFullAddress() : 'Bien supprimé'}</td>
                    <td>
                        <span class="category-badge ${this.getCategoryClass(charge.categorie)}">
                            ${this.getCategoryLabel(charge.categorie)}
                        </span>
                    </td>
                    <td>${charge.description}</td>
                    <td>${ui.formatCurrency(charge.montant)}</td>
                    <td>
                        <span class="type-badge ${charge.type === 'recurrente' ? 'type-recurrente' : 'type-ponctuelle'}">
                            ${charge.type === 'recurrente' ? `Récurrente (${charge.frequence})` : 'Ponctuelle'}
                        </span>
                    </td>
                    <td>
                        <div class="actions-menu">
                            <button class="btn-secondary" onclick="chargesModule.editCharge('${charge.id}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-secondary" onclick="chargesModule.viewCharge('${charge.id}')">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn-${charge.payee ? 'success' : 'warning'}" onclick="chargesModule.togglePayment('${charge.id}')" title="${charge.payee ? 'Marquer comme non payée' : 'Marquer comme payée'}">
                                <i class="fas fa-${charge.payee ? 'check-circle' : 'clock'}"></i>
                            </button>
                            <button class="btn-danger" onclick="chargesModule.deleteCharge('${charge.id}')">
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

    getCategoryClass(categorie) {
        const classes = {
            'travaux': 'category-travaux',
            'assurance': 'category-assurance',
            'credit': 'category-credit',
            'taxe': 'category-taxe',
            'gestion': 'category-gestion',
            'exceptionnelle': 'category-exceptionnelle'
        };
        return classes[categorie] || 'category-default';
    }

    getCategoryLabel(categorie) {
        const labels = {
            'travaux': 'Travaux',
            'assurance': 'Assurance',
            'credit': 'Crédit immobilier',
            'taxe': 'Taxe foncière',
            'gestion': 'Frais de gestion',
            'exceptionnelle': 'Charge exceptionnelle'
        };
        return labels[categorie] || categorie;
    }

    populateBiensSelect() {
        const select = document.getElementById('charge-bien-select');
        const biens = storage.getBiens();
        
        select.innerHTML = '<option value="">Sélectionner un bien</option>';
        biens.forEach(bien => {
            const option = document.createElement('option');
            option.value = bien.id;
            option.textContent = bien.getFullAddress();
            select.appendChild(option);
        });
    }

    handleFormSubmit(formData) {
        const data = {};
        for (let [key, value] of formData.entries()) {
            data[key] = value.trim();
        }

        data.montant = parseFloat(data.montant) || 0;

        const charge = new Charge(data);
        const errors = charge.validate();

        if (errors.length > 0) {
            ui.showNotification(errors.join(', '), 'error');
            return;
        }

        try {
            if (this.isEditing && this.currentCharge) {
                storage.updateCharge(this.currentCharge.id, data);
                ui.showNotification('Charge modifiée avec succès');
            } else {
                storage.addCharge(data);
                ui.showNotification('Charge ajoutée avec succès');
            }

            setTimeout(() => {
                ui.closeModal('charge-modal');
                this.refresh();
                this.resetForm();
            }, 100);
        } catch (error) {
            ui.showNotification('Erreur lors de l\'enregistrement', 'error');
            console.error(error);
        }
    }

    editCharge(id) {
        const charge = storage.getCharges().find(c => c.id === id);
        if (!charge) {
            ui.showNotification('Charge introuvable', 'error');
            return;
        }

        this.currentCharge = charge;
        this.isEditing = true;

        const modal = document.getElementById('charge-modal');
        const form = modal.querySelector('form');
        const title = modal.querySelector('.modal-title');

        title.textContent = 'Modifier la charge';

        this.populateBiensSelect();

        Object.keys(charge).forEach(key => {
            const input = form.querySelector(`[name="${key}"]`);
            if (input && key !== 'id' && key !== 'dateCreation') {
                input.value = charge[key] || '';
            }
        });

        const typeSelect = document.getElementById('charge-type-select');
        const frequenceField = document.getElementById('charge-frequence-field');
        if (charge.type === 'recurrente') {
            frequenceField.style.display = 'block';
        }

        openModal('charge-modal');
    }

    viewCharge(id) {
        const charge = storage.getCharges().find(c => c.id === id);
        if (!charge) {
            ui.showNotification('Charge introuvable', 'error');
            return;
        }

        const bien = this.getBienById(charge.bienId);

        const modalContent = `
            <div class="charge-details">
                <h3>Détails de la charge</h3>
                <div class="details-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin: 1rem 0;">
                    <div><strong>Bien :</strong> ${bien ? bien.getFullAddress() : 'Bien supprimé'}</div>
                    <div><strong>Catégorie :</strong> <span class="category-badge ${this.getCategoryClass(charge.categorie)}">${this.getCategoryLabel(charge.categorie)}</span></div>
                    <div><strong>Description :</strong> ${charge.description}</div>
                    <div><strong>Montant :</strong> ${ui.formatCurrency(charge.montant)}</div>
                    <div><strong>Date :</strong> ${ui.formatDate(charge.date)}</div>
                    <div><strong>Type :</strong> ${charge.type === 'recurrente' ? `Récurrente (${charge.frequence})` : 'Ponctuelle'}</div>
                    <div><strong>Statut :</strong> 
                        <span class="status-badge status-${charge.payee ? 'paye' : 'attente'}">
                            ${charge.payee ? 'PAYÉE' : 'EN ATTENTE'}
                        </span>
                    </div>
                    ${charge.type === 'recurrente' ? `<div><strong>Montant mensuel :</strong> ${ui.formatCurrency(charge.getMontantMensuel())}</div>` : ''}
                </div>
                ${charge.commentaires ? `<p><strong>Commentaires :</strong> ${charge.commentaires}</p>` : ''}
                ${charge.facture ? `<p><strong>Facture :</strong> ${charge.facture}</p>` : ''}
                <div style="margin-top: 1rem;">
                    <small><strong>Créé le :</strong> ${ui.formatDateTime(charge.dateCreation)}</small>
                </div>
            </div>
        `;

        this.showViewModal('Détails de la charge', modalContent);
    }

    togglePayment(id) {
        const charge = storage.getCharges().find(c => c.id === id);
        if (!charge) {
            ui.showNotification('Charge introuvable', 'error');
            return;
        }

        const newStatus = !charge.payee;
        storage.updateCharge(id, { payee: newStatus });
        
        ui.showNotification(`Charge marquée comme ${newStatus ? 'payée' : 'non payée'}`);
        this.refresh();
    }

    deleteCharge(id) {
        const charge = storage.getCharges().find(c => c.id === id);
        if (!charge) {
            ui.showNotification('Charge introuvable', 'error');
            return;
        }

        ui.confirmDelete(
            `Êtes-vous sûr de vouloir supprimer la charge "${charge.description}" ?`,
            () => {
                storage.deleteCharge(id);
                ui.showNotification('Charge supprimée avec succès');
                this.refresh();
            }
        );
    }

    generateRecurringCharges() {
        const charges = storage.getCharges().filter(c => c.type === 'recurrente');
        const today = new Date();
        let generated = 0;

        charges.forEach(chargeBase => {
            if (chargeBase.frequence === 'mensuelle') {
                for (let i = 0; i < 3; i++) {
                    const date = new Date(today);
                    date.setMonth(date.getMonth() + i);
                    
                    const dateStr = date.toISOString().split('T')[0];
                    const existing = storage.getCharges().find(c => 
                        c.bienId === chargeBase.bienId && 
                        c.categorie === chargeBase.categorie &&
                        c.date === dateStr
                    );
                    
                    if (!existing) {
                        const newCharge = {
                            ...chargeBase,
                            id: undefined,
                            date: dateStr,
                            payee: false,
                            description: `${chargeBase.description} - ${date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`
                        };
                        
                        storage.addCharge(newCharge);
                        generated++;
                    }
                }
            }
        });

        if (generated > 0) {
            ui.showNotification(`${generated} charges récurrentes générées automatiquement`);
            this.refresh();
        }
    }

    getChargesByBien(bienId) {
        const charges = storage.getCharges();
        return charges.filter(charge => charge.bienId === bienId);
    }

    getTotalChargesByPeriod(bienId, dateDebut, dateFin) {
        const charges = this.getChargesByBien(bienId);
        const debut = new Date(dateDebut);
        const fin = new Date(dateFin);
        
        return charges
            .filter(charge => {
                const chargeDate = new Date(charge.date);
                return chargeDate >= debut && chargeDate <= fin;
            })
            .reduce((total, charge) => total + charge.montant, 0);
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
        this.currentCharge = null;
        this.isEditing = false;
        
        const modal = document.getElementById('charge-modal');
        const title = modal.querySelector('.modal-title');
        title.textContent = 'Nouvelle Charge';
    }
}

const chargesModule = new ChargesModule();