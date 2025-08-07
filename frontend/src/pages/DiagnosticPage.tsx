import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';

import { authService } from '@/services/auth';
import { proprietairesService } from '@/services/proprietaires';
import { biensService } from '@/services/biens';
import { locatairesService } from '@/services/locataires';
import Button from '@/components/ui/Button';

interface TestResult {
  name: string;
  status: 'success' | 'error' | 'loading';
  message: string;
  details?: any;
}

const DiagnosticPage: React.FC = () => {
  const [tests, setTests] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runTests = async () => {
    setIsRunning(true);
    const results: TestResult[] = [];

    // Test 1: Vérifier le token d'authentification
    results.push({
      name: 'Token d\'authentification',
      status: 'loading',
      message: 'Vérification en cours...'
    });
    setTests([...results]);

    try {
      const token = authService.getToken();
      if (token) {
        results[results.length - 1] = {
          name: 'Token d\'authentification',
          status: 'success',
          message: 'Token présent et valide',
          details: `Token: ${token.substring(0, 20)}...`
        };
      } else {
        results[results.length - 1] = {
          name: 'Token d\'authentification',
          status: 'error',
          message: 'Aucun token trouvé - utilisateur non connecté'
        };
      }
    } catch (error) {
      results[results.length - 1] = {
        name: 'Token d\'authentification',
        status: 'error',
        message: `Erreur: ${error}`
      };
    }
    setTests([...results]);

    // Test 2: API Auth - Current User
    results.push({
      name: 'API Auth - Current User',
      status: 'loading',
      message: 'Test en cours...'
    });
    setTests([...results]);

    try {
      const user = await authService.getCurrentUser();
      results[results.length - 1] = {
        name: 'API Auth - Current User',
        status: 'success',
        message: `Utilisateur connecté: ${user.prenom} ${user.nom}`,
        details: user
      };
    } catch (error: any) {
      results[results.length - 1] = {
        name: 'API Auth - Current User',
        status: 'error',
        message: `Erreur: ${error?.response?.data?.error?.message || error.message}`
      };
    }
    setTests([...results]);

    // Test 3: API Propriétaires
    results.push({
      name: 'API Propriétaires',
      status: 'loading',
      message: 'Test en cours...'
    });
    setTests([...results]);

    try {
      const proprietaires = await proprietairesService.getAll({ page: 1, limit: 5 });
      results[results.length - 1] = {
        name: 'API Propriétaires',
        status: 'success',
        message: `${proprietaires.data.length} propriétaires trouvés`,
        details: proprietaires.pagination
      };
    } catch (error: any) {
      results[results.length - 1] = {
        name: 'API Propriétaires',
        status: 'error',
        message: `Erreur: ${error?.response?.data?.error?.message || error.message}`
      };
    }
    setTests([...results]);

    // Test 4: API Biens
    results.push({
      name: 'API Biens',
      status: 'loading',
      message: 'Test en cours...'
    });
    setTests([...results]);

    try {
      const biens = await biensService.getAll({ page: 1, limit: 5 });
      results[results.length - 1] = {
        name: 'API Biens',
        status: 'success',
        message: `${biens.data.length} biens trouvés`,
        details: biens.pagination
      };
    } catch (error: any) {
      results[results.length - 1] = {
        name: 'API Biens',
        status: 'error',
        message: `Erreur: ${error?.response?.data?.error?.message || error.message}`
      };
    }
    setTests([...results]);

    // Test 5: API Locataires
    results.push({
      name: 'API Locataires',
      status: 'loading',
      message: 'Test en cours...'
    });
    setTests([...results]);

    try {
      const locataires = await locatairesService.getAll({ page: 1, limit: 5 });
      results[results.length - 1] = {
        name: 'API Locataires',
        status: 'success',
        message: `${locataires.data.length} locataires trouvés`,
        details: locataires.pagination
      };
    } catch (error: any) {
      results[results.length - 1] = {
        name: 'API Locataires',
        status: 'error',
        message: `Erreur: ${error?.response?.data?.error?.message || error.message}`
      };
    }
    setTests([...results]);

    setIsRunning(false);
  };

  useEffect(() => {
    runTests();
  }, []);

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'loading':
        return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBg = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'loading':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Diagnostic du système
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Vérification de l'état des APIs et services
          </p>
        </div>
        <Button
          onClick={runTests}
          disabled={isRunning}
          className="flex items-center"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRunning ? 'animate-spin' : ''}`} />
          {isRunning ? 'Test en cours...' : 'Relancer les tests'}
        </Button>
      </div>

      <div className="space-y-4">
        {tests.map((test, index) => (
          <div
            key={index}
            className={`p-4 rounded-lg border ${getStatusBg(test.status)}`}
          >
            <div className="flex items-start">
              <div className="flex-shrink-0 mt-0.5">
                {getStatusIcon(test.status)}
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-gray-900">
                  {test.name}
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                  {test.message}
                </p>
                {test.details && (
                  <details className="mt-2">
                    <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                      Voir les détails
                    </summary>
                    <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-32">
                      {JSON.stringify(test.details, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {tests.length === 0 && (
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Aucun test exécuté</p>
        </div>
      )}

      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="text-sm font-medium text-blue-900 mb-2">
          Instructions de résolution
        </h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Si le token est manquant : Connectez-vous via la page de login</li>
          <li>• Si les APIs échouent : Vérifiez que le serveur backend est démarré (port 3002)</li>
          <li>• En cas d'erreur 401 : Le token a expiré, reconnectez-vous</li>
          <li>• En cas d'erreur 404 : L'endpoint n'existe pas ou l'URL est incorrecte</li>
        </ul>
      </div>
    </div>
  );
};

export default DiagnosticPage;