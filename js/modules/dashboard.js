class DashboardModule {
    constructor() {
        this.chart = null;
    }

    refresh() {
        this.loadDashboardData();
        this.initializeChart();
    }

    loadDashboardData() {
        const today = new Date();
        const currentMonth = today.getMonth() + 1;
        const currentYear = today.getFullYear();

        const loyers = storage.getLoyers();
        const biens = storage.getBiens();
        const contrats = storage.getContrats();
        const charges = storage.getCharges();

        const loyersDuMois = loyers.filter(l => 
            parseInt(l.mois) === currentMonth && l.annee === currentYear
        );

        const loyersAttendus = loyersDuMois.reduce((total, l) => total + l.montantDu, 0);
        const loyersEncaisses = loyersDuMois.reduce((total, l) => total + l.montantPaye, 0);

        const retards = loyersDuMois.filter(l => l.statut === 'retard').length;

        const biensVacants = biens.filter(bien => {
            const contratActif = contrats.find(c => 
                c.bienId === bien.id && 
                c.statut === 'actif' && 
                (!c.dateFin || new Date(c.dateFin) > today)
            );
            return !contratActif;
        }).length;

        const contratsExpirants = contrats.filter(contrat => {
            if (!contrat.dateFin) return false;
            const dateFin = new Date(contrat.dateFin);
            const troismois = new Date(today);
            troismois.setMonth(troismois.getMonth() + 3);
            return dateFin <= troismois && dateFin > today;
        }).length;

        this.updateDashboardCards({
            loyersEncaisses,
            loyersAttendus,
            retards,
            biensVacants,
            contratsExpirants
        });

        this.updateRecentActivity();
    }

    updateDashboardCards(data) {
        const cards = document.querySelectorAll('.dashboard-card');
        
        if (cards[0]) {
            const statValue = cards[0].querySelector('.stat-value');
            const statDetail = cards[0].querySelector('.stat-detail');
            statValue.textContent = ui.formatCurrency(data.loyersEncaisses);
            statDetail.textContent = `Sur ${ui.formatCurrency(data.loyersAttendus)} attendus`;
        }

        if (cards[1]) {
            const statValue = cards[1].querySelector('.stat-value');
            statValue.textContent = data.retards;
            statValue.className = `stat-value ${data.retards > 0 ? 'warning' : ''}`;
        }

        if (cards[2]) {
            const statValue = cards[2].querySelector('.stat-value');
            statValue.textContent = data.biensVacants;
        }

        if (cards[3]) {
            const statValue = cards[3].querySelector('.stat-value');
            statValue.textContent = data.contratsExpirants;
            statValue.className = `stat-value ${data.contratsExpirants > 0 ? 'attention' : ''}`;
        }
    }

    updateRecentActivity() {
        const loyers = storage.getLoyers();
        const recentPayments = [];

        loyers.forEach(loyer => {
            if (loyer.paiements) {
                loyer.paiements.forEach(paiement => {
                    const paymentDate = new Date(paiement.date);
                    const weekAgo = new Date();
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    
                    if (paymentDate >= weekAgo) {
                        const bien = storage.getBiens().find(b => b.id === loyer.bienId);
                        recentPayments.push({
                            date: paiement.date,
                            montant: paiement.montant,
                            bien: bien ? bien.getFullAddress() : 'Bien supprimé',
                            payeur: paiement.payeur || 'Locataire'
                        });
                    }
                });
            }
        });

        recentPayments.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    initializeChart() {
        const canvas = document.getElementById('revenueChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        
        if (this.chart) {
            this.chart.destroy();
        }

        const today = new Date();
        const months = [];
        const revenus = [];
        const charges = [];

        for (let i = 5; i >= 0; i--) {
            const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const year = date.getFullYear();
            
            months.push(date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }));
            
            const loyersMois = storage.getLoyers().filter(l => 
                l.mois === month && l.annee === year
            );
            const revenuMois = loyersMois.reduce((total, l) => total + l.montantPaye, 0);
            revenus.push(revenuMois);
            
            const chargesMois = storage.getCharges().filter(c => {
                const chargeDate = new Date(c.date);
                return chargeDate.getMonth() === date.getMonth() && 
                       chargeDate.getFullYear() === date.getFullYear();
            });
            const chargeMois = chargesMois.reduce((total, c) => total + c.montant, 0);
            charges.push(chargeMois);
        }

        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: months,
                datasets: [{
                    label: 'Revenus',
                    data: revenus,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    fill: true
                }, {
                    label: 'Charges',
                    data: charges,
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return new Intl.NumberFormat('fr-FR', {
                                    style: 'currency',
                                    currency: 'EUR'
                                }).format(value);
                            }
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            }
        });
    }

    getPortfolioStats() {
        const biens = storage.getBiens();
        const contrats = storage.getContrats();
        const loyers = storage.getLoyers();
        const charges = storage.getCharges();

        const totalBiens = biens.length;
        const biensLoues = biens.filter(bien => {
            return contrats.some(c => 
                c.bienId === bien.id && 
                c.statut === 'actif' && 
                (!c.dateFin || new Date(c.dateFin) > new Date())
            );
        }).length;

        const tauxOccupation = totalBiens > 0 ? (biensLoues / totalBiens) * 100 : 0;

        const currentYear = new Date().getFullYear();
        const loyersAnnee = loyers.filter(l => l.annee === currentYear);
        const revenusAnnee = loyersAnnee.reduce((total, l) => total + l.montantPaye, 0);
        const chargesAnnee = charges
            .filter(c => new Date(c.date).getFullYear() === currentYear)
            .reduce((total, c) => total + c.montant, 0);
        
        const beneficeAnnee = revenusAnnee - chargesAnnee;

        const loyersMoyenMensuel = biens.reduce((total, bien) => total + bien.loyer, 0);

        return {
            totalBiens,
            biensLoues,
            tauxOccupation: Math.round(tauxOccupation),
            revenusAnnee,
            chargesAnnee,
            beneficeAnnee,
            loyersMoyenMensuel
        };
    }

    generatePortfolioReport() {
        const stats = this.getPortfolioStats();
        
        const reportHtml = `
            <div class="portfolio-report">
                <h3>Rapport de portfolio</h3>
                <div class="stats-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin: 1rem 0;">
                    <div class="stat-item" style="padding: 1rem; background: var(--surface-color); border-radius: var(--radius); text-align: center;">
                        <div style="font-size: 2rem; font-weight: bold; color: var(--primary-color);">${stats.totalBiens}</div>
                        <div style="color: var(--text-secondary);">Biens au total</div>
                    </div>
                    <div class="stat-item" style="padding: 1rem; background: var(--surface-color); border-radius: var(--radius); text-align: center;">
                        <div style="font-size: 2rem; font-weight: bold; color: var(--success-color);">${stats.biensLoues}</div>
                        <div style="color: var(--text-secondary);">Biens loués</div>
                    </div>
                    <div class="stat-item" style="padding: 1rem; background: var(--surface-color); border-radius: var(--radius); text-align: center;">
                        <div style="font-size: 2rem; font-weight: bold; color: var(--warning-color);">${stats.tauxOccupation}%</div>
                        <div style="color: var(--text-secondary);">Taux d'occupation</div>
                    </div>
                    <div class="stat-item" style="padding: 1rem; background: var(--surface-color); border-radius: var(--radius); text-align: center;">
                        <div style="font-size: 2rem; font-weight: bold; color: var(--primary-color);">${ui.formatCurrency(stats.loyersMoyenMensuel)}</div>
                        <div style="color: var(--text-secondary);">Loyers mensuels totaux</div>
                    </div>
                </div>
                
                <h4>Résultats annuels ${new Date().getFullYear()}</h4>
                <div class="annual-stats" style="margin: 1rem 0;">
                    <div style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid var(--border-color);">
                        <span>Revenus locatifs:</span>
                        <strong style="color: var(--success-color);">${ui.formatCurrency(stats.revenusAnnee)}</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid var(--border-color);">
                        <span>Charges déductibles:</span>
                        <strong style="color: var(--danger-color);">${ui.formatCurrency(stats.chargesAnnee)}</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-top: 2px solid var(--border-color); margin-top: 1rem;">
                        <span><strong>Bénéfice net:</strong></span>
                        <strong style="color: ${stats.beneficeAnnee >= 0 ? 'var(--success-color)' : 'var(--danger-color)'};">${ui.formatCurrency(stats.beneficeAnnee)}</strong>
                    </div>
                </div>
            </div>
        `;

        return reportHtml;
    }

    exportDashboardData() {
        const data = {
            stats: this.getPortfolioStats(),
            timestamp: new Date().toISOString(),
            periode: new Date().getFullYear()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dashboard-${new Date().getFullYear()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        ui.showNotification('Données du tableau de bord exportées');
    }
}

let Chart;

function loadChartJS() {
    if (typeof Chart !== 'undefined') {
        return Promise.resolve();
    }

    return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
        script.onload = () => {
            resolve();
        };
        document.head.appendChild(script);
    });
}

const dashboard = new DashboardModule();

loadChartJS().then(() => {
    if (ui.currentModule === 'dashboard') {
        dashboard.refresh();
    }
});