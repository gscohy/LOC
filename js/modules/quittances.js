class QuittancesModule {
    constructor() {
        this.currentQuittance = null;
    }

    refresh() {
        this.loadQuittances();
    }

    loadQuittances() {
        const tableBody = document.getElementById('quittances-table');
        const quittances = storage.getQuittances();
        
        if (quittances.length === 0) {
            ui.showEmptyState(tableBody.parentElement, 'Aucune quittance générée. Les quittances sont créées automatiquement depuis le module loyers.');
            return;
        }

        quittances.sort((a, b) => new Date(b.dateGeneration) - new Date(a.dateGeneration));

        let html = '';
        quittances.forEach(quittance => {
            const bien = this.getBienById(quittance.bienId);
            const locataires = this.getLocatairesByIds(quittance.locataireIds);
            const locatairesNames = locataires.map(l => l.getFullName()).join(', ');
            
            html += `
                <tr>
                    <td>${ui.formatDate(quittance.dateGeneration)}</td>
                    <td>${bien ? bien.getFullAddress() : 'Bien supprimé'}</td>
                    <td>${locatairesNames}</td>
                    <td>${quittance.periode}</td>
                    <td>${ui.formatCurrency(quittance.montant)}</td>
                    <td>
                        <span class="status-badge status-${quittance.statut}">
                            ${quittance.statut === 'generee' ? 'GÉNÉRÉE' : 'ENVOYÉE'}
                        </span>
                    </td>
                    <td>
                        <div class="actions-menu">
                            <button class="btn-primary" onclick="quittancesModule.downloadPDF('${quittance.id}')" title="Télécharger PDF">
                                <i class="fas fa-download"></i>
                            </button>
                            <button class="btn-secondary" onclick="quittancesModule.previewQuittance('${quittance.id}')" title="Aperçu">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn-success" onclick="quittancesModule.sendByEmail('${quittance.id}')" title="Envoyer par email">
                                <i class="fas fa-envelope"></i>
                            </button>
                            <button class="btn-danger" onclick="quittancesModule.deleteQuittance('${quittance.id}')" title="Supprimer">
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

    getContratById(contratId) {
        const contrats = storage.getContrats();
        return contrats.find(contrat => contrat.id === contratId);
    }

    getLoyerById(loyerId) {
        const loyers = storage.getLoyers();
        return loyers.find(loyer => loyer.id === loyerId);
    }

    previewQuittance(id) {
        const quittance = storage.getQuittances().find(q => q.id === id);
        if (!quittance) {
            ui.showNotification('Quittance introuvable', 'error');
            return;
        }

        const bien = this.getBienById(quittance.bienId);
        const locataires = this.getLocatairesByIds(quittance.locataireIds);
        const contrat = this.getContratById(quittance.contratId);
        const loyer = this.getLoyerById(quittance.loyerId);

        const proprietaires = storage.getProprietaires().filter(p => 
            bien && bien.proprietaires.some(prop => prop.id === p.id)
        );

        const modalContent = `
            <div class="quittance-preview" style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
                <div style="text-align: center; margin-bottom: 2rem; border-bottom: 2px solid #333; padding-bottom: 1rem;">
                    <h2 style="margin: 0; color: #333;">QUITTANCE DE LOYER</h2>
                    <p style="margin: 0.5rem 0; font-size: 1.1rem;">N° ${quittance.id.toUpperCase()}</p>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 2rem;">
                    <div>
                        <h4 style="margin-bottom: 1rem; color: #333; border-bottom: 1px solid #ccc; padding-bottom: 0.5rem;">BAILLEUR</h4>
                        ${proprietaires.map(prop => `
                            <p style="margin: 0.25rem 0;"><strong>${prop.getFullName()}</strong></p>
                            <p style="margin: 0.25rem 0;">${prop.adresse || ''}</p>
                            <p style="margin: 0.25rem 0;">${prop.ville || ''} ${prop.codePostal || ''}</p>
                            <p style="margin: 0.25rem 0;">Email: ${prop.email}</p>
                        `).join('')}
                    </div>
                    <div>
                        <h4 style="margin-bottom: 1rem; color: #333; border-bottom: 1px solid #ccc; padding-bottom: 0.5rem;">LOCATAIRE(S)</h4>
                        ${locataires.map(loc => `
                            <p style="margin: 0.25rem 0;"><strong>${loc.getFullName()}</strong></p>
                            <p style="margin: 0.25rem 0;">${loc.adresse || ''}</p>
                            <p style="margin: 0.25rem 0;">${loc.ville || ''} ${loc.codePostal || ''}</p>
                            <p style="margin: 0.25rem 0;">Email: ${loc.email}</p>
                        `).join('')}
                    </div>
                </div>

                <div style="margin-bottom: 2rem;">
                    <h4 style="color: #333; border-bottom: 1px solid #ccc; padding-bottom: 0.5rem;">BIEN LOUÉ</h4>
                    <p style="margin: 0.5rem 0;"><strong>${bien ? bien.getFullAddress() : 'Bien supprimé'}</strong></p>
                    <p style="margin: 0.25rem 0;">Type: ${bien ? bien.type : 'N/A'} - Surface: ${bien ? bien.surface : 'N/A'}m²</p>
                </div>

                <div style="margin-bottom: 2rem;">
                    <h4 style="color: #333; border-bottom: 1px solid #ccc; padding-bottom: 0.5rem;">DÉTAIL DU PAIEMENT</h4>
                    <table style="width: 100%; border-collapse: collapse; margin-top: 1rem;">
                        <tr style="background: #f5f5f5;">
                            <td style="padding: 0.75rem; border: 1px solid #ddd; font-weight: bold;">Période</td>
                            <td style="padding: 0.75rem; border: 1px solid #ddd; text-align: right;">${quittance.periode}</td>
                        </tr>
                        ${contrat ? `
                            <tr>
                                <td style="padding: 0.75rem; border: 1px solid #ddd;">Loyer</td>
                                <td style="padding: 0.75rem; border: 1px solid #ddd; text-align: right;">${ui.formatCurrency(contrat.loyer)}</td>
                            </tr>
                            <tr>
                                <td style="padding: 0.75rem; border: 1px solid #ddd;">Charges</td>
                                <td style="padding: 0.75rem; border: 1px solid #ddd; text-align: right;">${ui.formatCurrency(contrat.charges)}</td>
                            </tr>
                        ` : ''}
                        <tr style="background: #f0f8ff; font-weight: bold;">
                            <td style="padding: 0.75rem; border: 1px solid #ddd;">TOTAL PAYÉ</td>
                            <td style="padding: 0.75rem; border: 1px solid #ddd; text-align: right;">${ui.formatCurrency(quittance.montant)}</td>
                        </tr>
                    </table>
                </div>

                ${loyer && loyer.paiements ? `
                    <div style="margin-bottom: 2rem;">
                        <h4 style="color: #333; border-bottom: 1px solid #ccc; padding-bottom: 0.5rem;">PAIEMENTS REÇUS</h4>
                        ${loyer.paiements.map(paiement => `
                            <div style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid #eee;">
                                <span>${ui.formatDate(paiement.date)} - ${paiement.mode} ${paiement.payeur ? `(${paiement.payeur})` : ''}</span>
                                <span style="font-weight: bold;">${ui.formatCurrency(paiement.montant)}</span>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}

                <div style="text-align: center; margin-top: 3rem; padding-top: 2rem; border-top: 1px solid #ccc;">
                    <p style="margin: 0.5rem 0;">Quittance générée le ${ui.formatDateTime(quittance.dateGeneration)}</p>
                    <p style="margin: 0.5rem 0; font-style: italic;">Quittance libératoire pour la période mentionnée ci-dessus</p>
                </div>
            </div>
        `;

        this.showViewModal('Aperçu de la quittance', modalContent);
    }

    downloadPDF(id) {
        ui.showNotification('Fonctionnalité de génération PDF en cours de développement', 'warning');
        
        const quittance = storage.getQuittances().find(q => q.id === id);
        if (quittance) {
            this.previewQuittance(id);
        }
    }

    sendByEmail(id) {
        const quittance = storage.getQuittances().find(q => q.id === id);
        if (!quittance) {
            ui.showNotification('Quittance introuvable', 'error');
            return;
        }

        const locataires = this.getLocatairesByIds(quittance.locataireIds);
        const emails = locataires.map(l => l.email).join(', ');

        ui.confirmDelete(
            `Envoyer la quittance par email à : ${emails} ?`,
            () => {
                quittance.statut = 'envoyee';
                quittance.dateEnvoi = new Date().toISOString();
                quittance.emailEnvoye = true;
                
                storage.updateQuittance(id, quittance);
                
                ui.showNotification('Fonctionnalité d\'envoi d\'email en cours de développement. Quittance marquée comme envoyée.', 'warning');
                this.refresh();
            }
        );
    }

    deleteQuittance(id) {
        const quittance = storage.getQuittances().find(q => q.id === id);
        if (!quittance) {
            ui.showNotification('Quittance introuvable', 'error');
            return;
        }

        ui.confirmDelete(
            'Êtes-vous sûr de vouloir supprimer cette quittance ?',
            () => {
                storage.deleteQuittance(id);
                ui.showNotification('Quittance supprimée avec succès');
                this.refresh();
            }
        );
    }

    generateBulkQuittances() {
        const loyers = storage.getLoyers().filter(l => l.montantPaye > 0);
        let generated = 0;

        loyers.forEach(loyer => {
            const existingQuittance = storage.getQuittances().find(q => q.loyerId === loyer.id);
            
            if (!existingQuittance) {
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

                storage.addQuittance(quittanceData);
                generated++;
            }
        });

        if (generated > 0) {
            ui.showNotification(`${generated} quittances générées automatiquement`);
            this.refresh();
        } else {
            ui.showNotification('Aucune nouvelle quittance à générer', 'warning');
        }
    }

    getMoisName(moisNumber) {
        const mois = [
            'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
            'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
        ];
        return mois[parseInt(moisNumber) - 1] || moisNumber;
    }

    showViewModal(title, content) {
        const existingModal = document.getElementById('view-modal');
        if (existingModal) {
            existingModal.remove();
        }

        const modal = document.createElement('div');
        modal.id = 'view-modal';
        modal.className = 'modal active';
        modal.style.maxWidth = '900px';
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
                <button type="button" class="btn-primary" onclick="window.print()">
                    <i class="fas fa-print"></i> Imprimer
                </button>
            </div>
        `;

        document.body.appendChild(modal);
        document.getElementById('overlay').classList.add('active');
    }
}

const quittancesModule = new QuittancesModule();