import { api } from '../lib/api';

interface DashboardStats {
  loyers: {
    totaux: {
      enAttente: number;
      enRetard: number;
      partiels: number;
      payes: number;
      total: number;
    };
    revenus: {
      annee: number;
      parMois: Array<{
        annee: number;
        mois: number;
        _sum: {
          montantDu: number | null;
          montantPaye: number | null;
        };
        _count: number;
      }>;
    };
  };
  charges: {
    total: {
      montant: number;
      nombre: number;
    };
    payees: {
      montant: number;
      nombre: number;
    };
    nonPayees: {
      montant: number;
      nombre: number;
    };
    parMois?: Array<{
      mois: string;
      total: number;
      nombre: number;
    }>;
  };
  biens: {
    total: number;
    occupes: number;
    vacants: number;
  };
  locataires: {
    total: number;
    actifs: number;
  };
}

export const dashboardService = {
  async getStats(year: number = new Date().getFullYear()): Promise<DashboardStats> {
    try {
      console.log('🔄 Récupération des statistiques dashboard...');
      
      // Récupérer toutes les statistiques en parallèle avec gestion d'erreur individuelle
      const [loyersResponse, chargesResponse, biensResponse, locatairesResponse] = await Promise.allSettled([
        api.get('/loyers/stats').catch(err => {
          console.error('❌ Erreur loyers stats:', err.response?.data || err.message);
          return { data: { data: { totaux: {}, revenus: { annee: 0, parMois: [] } } } };
        }),
        api.get(`/charges/stats?annee=${year}`).catch(err => {
          console.error('❌ Erreur charges stats:', err.response?.data || err.message);
          return { data: { data: { total: { montant: 0, nombre: 0 }, payees: { montant: 0, nombre: 0 }, nonPayees: { montant: 0, nombre: 0 }, parMois: [] } } };
        }),
        api.get('/biens?limit=1000').catch(err => {
          console.error('❌ Erreur biens:', err.response?.data || err.message);
          return { data: { data: { biens: [] } } };
        }),
        api.get('/locataires?limit=1000').catch(err => {
          console.error('❌ Erreur locataires:', err.response?.data || err.message);
          return { data: { data: { locataires: [] } } };
        })
      ]);

      // Extraire les valeurs des résultats
      const loyersResult = loyersResponse.status === 'fulfilled' ? loyersResponse.value : loyersResponse.reason;
      const chargesResult = chargesResponse.status === 'fulfilled' ? chargesResponse.value : chargesResponse.reason;
      const biensResult = biensResponse.status === 'fulfilled' ? biensResponse.value : biensResponse.reason;
      const locatairesResult = locatairesResponse.status === 'fulfilled' ? locatairesResponse.value : locatairesResponse.reason;

      console.log('🔄 APIs Status:', loyersResponse.status, chargesResponse.status, biensResponse.status, locatairesResponse.status);

      const loyersData = loyersResult.data?.data || { totaux: {}, revenus: { annee: 0, parMois: [] } };
      const chargesData = chargesResult.data?.data || { total: { montant: 0, nombre: 0 }, payees: { montant: 0, nombre: 0 }, nonPayees: { montant: 0, nombre: 0 }, parMois: [] };
      const biensData = biensResult.data?.data?.biens || [];
      const locatairesData = locatairesResult.data?.data?.locataires || [];

      console.log('💰 Dashboard Stats:', `${loyersData.revenus?.annee}€`, `${chargesData.total?.montant}€`, `${biensData.length} biens`, `${locatairesData.length} locataires`);

      // Construire les statistiques consolidées
      const stats: DashboardStats = {
        loyers: {
          totaux: loyersData.totaux || {
            enAttente: 0,
            enRetard: 0,
            partiels: 0,
            payes: 0,
            total: 0
          },
          revenus: {
            annee: loyersData.revenus?.annee || 0,
            parMois: loyersData.revenus?.parMois || []
          }
        },
        charges: {
          total: chargesData.total || { montant: 0, nombre: 0 },
          payees: chargesData.payees || { montant: 0, nombre: 0 },
          nonPayees: chargesData.nonPayees || { montant: 0, nombre: 0 },
          parMois: chargesData.parMois || []
        },
        biens: {
          total: biensData.length || 0,
          occupes: biensData.filter((b: any) => b.statut === 'OCCUPE').length || 0,
          vacants: biensData.filter((b: any) => b.statut === 'VACANT').length || 0
        },
        locataires: {
          total: locatairesData.length || 0,
          actifs: locatairesData.filter((l: any) => l.statut === 'ACTIF').length || 0
        }
      };

      console.log('✅ Dashboard ready:', `${stats.loyers.revenus.annee}€ revenus`, `${stats.charges.total.montant}€ charges`);
      return stats;
      
    } catch (error) {
      console.error('❌ Erreur récupération stats dashboard:', error);
      
      // Retourner des données par défaut en cas d'erreur
      return {
        loyers: {
          totaux: { enAttente: 0, enRetard: 0, partiels: 0, payes: 0, total: 0 },
          revenus: { annee: 0, parMois: [] }
        },
        charges: {
          total: { montant: 0, nombre: 0 },
          payees: { montant: 0, nombre: 0 },
          nonPayees: { montant: 0, nombre: 0 },
          parMois: []
        },
        biens: { total: 0, occupes: 0, vacants: 0 },
        locataires: { total: 0, actifs: 0 }
      };
    }
  },

  // Préparer les données pour les graphiques
  prepareChartData(stats: DashboardStats, year?: number) {
    const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun',
                       'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

    const currentMonth = new Date().getMonth() + 1; // Mois en cours (1-12)
    const currentYear = new Date().getFullYear();
    const selectedYear = year || currentYear;
    
    // Si on affiche l'année courante, limiter aux mois <= mois en cours
    const maxMonth = selectedYear === currentYear ? currentMonth : 12;

    return monthNames.map((name, index) => {
      const mois = index + 1;
      
      // Ne pas afficher les mois futurs
      if (mois > maxMonth) {
        return null;
      }
      
      // Trouver les données du mois dans les statistiques loyers
      const loyersMois = stats.loyers.revenus.parMois.find(m => m.mois === mois);
      const revenus = loyersMois ? (loyersMois._sum.montantPaye || 0) : 0;
      
      // Trouver les données du mois dans les statistiques charges
      const chargesMois = stats.charges.parMois?.find(m => {
        const [, month] = m.mois.split('-');
        return parseInt(month) === mois;
      });
      const charges = chargesMois ? chargesMois.total : 0;

      return {
        name,
        revenus,
        charges,
        benefice: revenus - charges
      };
    }).filter(Boolean); // Supprimer les valeurs null
  },

  // Préparer les données pour le tableau par bien
  async getFinancialTableData(year: number = new Date().getFullYear(), proprietaireId?: string) {
    try {
      console.log('🔄 Récupération données tableau financier...');
      
      // Récupérer tous les biens
      const biensResponse = await api.get('/biens', {
        params: { limit: 1000, ...(proprietaireId && { proprietaireId }) }
      });

      // Récupérer tous les loyers de l'année en une seule fois
      const loyersAllResponse = await api.get('/loyers', {
        params: { annee: year, limit: 10000 }
      });

      // Récupérer toutes les charges de l'année (incluant récurrentes projetées)
      const chargesAllResponse = await api.get('/charges/financial-table', {
        params: { annee: year }
      });

      const biens = biensResponse.data.data.biens;
      const allLoyers = loyersAllResponse.data.data?.loyers || [];
      const allCharges = chargesAllResponse.data.data?.charges || [];

      const tableData = [];

      for (const bien of biens) {
        // Filtrer les loyers pour ce bien spécifique
        const loyersBien = allLoyers.filter((l: any) => l.contrat?.bienId === bien.id);
        
        // Filtrer les charges pour ce bien spécifique
        const chargesBien = allCharges.filter((c: any) => c.bienId === bien.id);

        // Calculer par mois avec détails loyers et charges
        const monthlyData: { [key: number]: { 
          loyer: number; 
          loyerDu: number; 
          charges: number; 
          net: number; 
          tauxPaiement: number;
          hasContract: boolean;
        } } = {};
        let total = 0;

        for (let mois = 1; mois <= 12; mois++) {
          // Revenus du mois pour ce bien
          const loyersMois = loyersBien.filter((l: any) => l.mois === mois);
          const revenusMois = loyersMois.reduce((sum: number, l: any) => sum + (l.montantPaye || 0), 0);
          const loyerDuMois = loyersMois.reduce((sum: number, l: any) => sum + (l.montantDu || 0), 0);

          // Charges du mois pour ce bien
          const chargesMois = chargesBien.filter((c: any) => {
            const chargeDate = new Date(c.date);
            return chargeDate.getMonth() + 1 === mois;
          });
          const chargesMoisTotal = chargesMois.reduce((sum: number, c: any) => sum + c.montant, 0);

          const montantNet = revenusMois - chargesMoisTotal;
          const tauxPaiement = loyerDuMois > 0 ? (revenusMois / loyerDuMois) * 100 : 0;
          
          monthlyData[mois] = {
            loyer: revenusMois,
            loyerDu: loyerDuMois,
            charges: chargesMoisTotal,
            net: montantNet,
            tauxPaiement: tauxPaiement,
            hasContract: loyerDuMois > 0
          };
          total += montantNet;
        }

        tableData.push({
          bienId: bien.id,
          adresse: `${bien.adresse}, ${bien.ville}`,
          mois: monthlyData,
          total,
          difference: total
        });
      }

      console.log('✅ Données tableau financier préparées pour', tableData.length, 'biens');
      return tableData;

    } catch (error) {
      console.error('❌ Erreur récupération données tableau:', error);
      return [];
    }
  }
};