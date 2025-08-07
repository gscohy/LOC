import React, { useState, useEffect } from 'react';
import { authService } from '@/services/auth';
import { proprietairesService } from '@/services/proprietaires';

const ProprietairesPageDebugAuth: React.FC = () => {
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const runDiagnostic = async () => {
      const info: any = {
        timestamp: new Date().toISOString(),
        url: window.location.href,
        token: null,
        tokenExists: false,
        userTest: null,
        proprietairesTest: null,
        errors: []
      };

      try {
        // Test 1: Vérifier le token
        const token = authService.getToken();
        info.token = token ? `${token.substring(0, 20)}...` : null;
        info.tokenExists = !!token;

        if (!token) {
          info.errors.push('Aucun token d\'authentification trouvé');
        }

        // Test 2: Tester getCurrentUser
        if (token) {
          try {
            const user = await authService.getCurrentUser();
            info.userTest = {
              success: true,
              user: user
            };
          } catch (error: any) {
            info.userTest = {
              success: false,
              error: error?.response?.data?.error?.message || error.message
            };
            info.errors.push(`getCurrentUser failed: ${error?.response?.data?.error?.message || error.message}`);
          }
        }

        // Test 3: Tester l'API Propriétaires
        if (token) {
          try {
            const proprietaires = await proprietairesService.getAll({ page: 1, limit: 5 });
            info.proprietairesTest = {
              success: true,
              count: proprietaires.data.length,
              pagination: proprietaires.pagination
            };
          } catch (error: any) {
            info.proprietairesTest = {
              success: false,
              error: error?.response?.data?.error?.message || error.message
            };
            info.errors.push(`Propriétaires API failed: ${error?.response?.data?.error?.message || error.message}`);
          }
        }

      } catch (globalError: any) {
        info.errors.push(`Global error: ${globalError.message}`);
      }

      setDebugInfo(info);
      setLoading(false);
    };

    runDiagnostic();
  }, []);

  const handleLogin = async () => {
    try {
      const result = await authService.login({
        email: 'admin@test.com',
        password: 'password'
      });
      
      setDebugInfo(prev => ({
        ...prev,
        loginTest: { success: true, result }
      }));
      
      // Recharger la page après connexion
      window.location.reload();
    } catch (error: any) {
      setDebugInfo(prev => ({
        ...prev,
        loginTest: { 
          success: false, 
          error: error?.response?.data?.error?.message || error.message 
        }
      }));
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">
          Diagnostic en cours...
        </h1>
        <div className="animate-pulse bg-gray-200 h-32 rounded"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">
        Diagnostic Propriétaires - Debug Auth
      </h1>
      
      {debugInfo.errors.length > 0 && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <h3 className="font-bold">Erreurs détectées :</h3>
          <ul className="list-disc list-inside">
            {debugInfo.errors.map((error: string, index: number) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {!debugInfo.tokenExists && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
          <h3 className="font-bold">Action requise :</h3>
          <p>Aucun token d'authentification. Vous devez vous connecter.</p>
          <button 
            onClick={handleLogin}
            className="mt-2 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Se connecter automatiquement
          </button>
        </div>
      )}

      <div className="space-y-4">
        <div className="bg-white p-4 border rounded">
          <h3 className="font-bold text-lg mb-2">Informations générales</h3>
          <p><strong>URL :</strong> {debugInfo.url}</p>
          <p><strong>Timestamp :</strong> {debugInfo.timestamp}</p>
          <p><strong>Token présent :</strong> {debugInfo.tokenExists ? '✅ Oui' : '❌ Non'}</p>
          {debugInfo.token && <p><strong>Token :</strong> {debugInfo.token}</p>}
        </div>

        {debugInfo.userTest && (
          <div className="bg-white p-4 border rounded">
            <h3 className="font-bold text-lg mb-2">Test getCurrentUser</h3>
            {debugInfo.userTest.success ? (
              <div className="text-green-700">
                <p>✅ Succès</p>
                <p><strong>Utilisateur :</strong> {debugInfo.userTest.user.prenom} {debugInfo.userTest.user.nom}</p>
                <p><strong>Email :</strong> {debugInfo.userTest.user.email}</p>
                <p><strong>Rôle :</strong> {debugInfo.userTest.user.role}</p>
              </div>
            ) : (
              <div className="text-red-700">
                <p>❌ Échec</p>
                <p><strong>Erreur :</strong> {debugInfo.userTest.error}</p>
              </div>
            )}
          </div>
        )}

        {debugInfo.proprietairesTest && (
          <div className="bg-white p-4 border rounded">
            <h3 className="font-bold text-lg mb-2">Test API Propriétaires</h3>
            {debugInfo.proprietairesTest.success ? (
              <div className="text-green-700">
                <p>✅ Succès</p>
                <p><strong>Nombre de propriétaires :</strong> {debugInfo.proprietairesTest.count}</p>
                <p><strong>Pagination :</strong> {JSON.stringify(debugInfo.proprietairesTest.pagination)}</p>
              </div>
            ) : (
              <div className="text-red-700">
                <p>❌ Échec</p>
                <p><strong>Erreur :</strong> {debugInfo.proprietairesTest.error}</p>
              </div>
            )}
          </div>
        )}

        <div className="bg-gray-100 p-4 border rounded">
          <h3 className="font-bold text-lg mb-2">Debug complet</h3>
          <pre className="text-xs overflow-auto max-h-64 bg-white p-2 border rounded">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default ProprietairesPageDebugAuth;