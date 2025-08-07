import React, { useState, useEffect } from 'react';
import documentService from '../../services/documentService';
import { api } from '../../lib/api';

const DocumentDebug: React.FC = () => {
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [testResults, setTestResults] = useState<any>({});

  useEffect(() => {
    runDiagnostics();
  }, []);

  const runDiagnostics = async () => {
    const info: any = {};
    const results: any = {};

    // 1. Vérifier le token
    const token = localStorage.getItem('auth_token');
    info.token = token ? `${token.substring(0, 20)}...` : 'MANQUANT';
    info.tokenExists = !!token;

    // 2. Vérifier l'API base URL
    info.apiBaseURL = api.defaults.baseURL;

    // 3. Test de l'API documents
    try {
      const response = await fetch(`${api.defaults.baseURL}/documents?limit=1`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      results.apiTest = {
        status: response.status,
        success: data.success,
        error: data.error?.message || null
      };
    } catch (error: any) {
      results.apiTest = {
        status: 'ERROR',
        error: error.message
      };
    }

    // 4. Test du service documentService
    try {
      results.serviceTest = await documentService.getDocuments({ limit: 1 });
      results.serviceWorks = true;
    } catch (error: any) {
      results.serviceTest = error.message;
      results.serviceWorks = false;
    }

    // 5. Vérifier les types de documents
    info.documentTypes = documentService.getDocumentTypes('CONTRAT');

    setDebugInfo(info);
    setTestResults(results);
  };

  const testUpload = async () => {
    // Créer un fichier de test
    const testFile = new File(['Test content'], 'test.txt', { type: 'text/plain' });
    
    try {
      const result = await documentService.uploadDocument(testFile, {
        categorie: 'CONTRAT',
        typeDoc: 'BAIL',
        contratId: 'test-contrat-id',
        description: 'Test upload'
      });
      
      setTestResults(prev => ({
        ...prev,
        uploadTest: { success: true, result }
      }));
    } catch (error: any) {
      setTestResults(prev => ({
        ...prev,
        uploadTest: { success: false, error: error.message }
      }));
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">🔍 Diagnostic Documents</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Informations Système */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">📋 Informations Système</h2>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Token:</span>
              <span className={debugInfo.tokenExists ? 'text-green-600' : 'text-red-600'}>
                {debugInfo.tokenExists ? '✅ Présent' : '❌ Manquant'}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span>API Base URL:</span>
              <span className="text-blue-600">{debugInfo.apiBaseURL}</span>
            </div>
            
            <div className="flex justify-between">
              <span>URL actuelle:</span>
              <span className="text-gray-600 text-xs">{window.location.href}</span>
            </div>
            
            <div className="mt-4">
              <strong>Types de documents CONTRAT:</strong>
              <ul className="text-xs mt-1 ml-4">
                {debugInfo.documentTypes?.map((type: any) => (
                  <li key={type.value}>• {type.label} ({type.value})</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Tests API */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">🧪 Tests API</h2>
          
          <div className="space-y-4">
            {/* Test API direct */}
            <div className="p-3 bg-gray-50 rounded">
              <strong className="text-sm">Test API direct:</strong>
              <div className="text-xs mt-1">
                Status: <span className={
                  testResults.apiTest?.status === 200 ? 'text-green-600' : 'text-red-600'
                }>
                  {testResults.apiTest?.status || 'En cours...'}
                </span>
              </div>
              {testResults.apiTest?.error && (
                <div className="text-xs text-red-600 mt-1">
                  Erreur: {testResults.apiTest.error}
                </div>
              )}
            </div>

            {/* Test Service */}
            <div className="p-3 bg-gray-50 rounded">
              <strong className="text-sm">Test Service:</strong>
              <div className="text-xs mt-1">
                <span className={testResults.serviceWorks ? 'text-green-600' : 'text-red-600'}>
                  {testResults.serviceWorks ? '✅ Fonctionne' : '❌ Erreur'}
                </span>
              </div>
              {!testResults.serviceWorks && (
                <div className="text-xs text-red-600 mt-1">
                  {testResults.serviceTest}
                </div>
              )}
            </div>

            {/* Test Upload */}
            <div className="p-3 bg-gray-50 rounded">
              <strong className="text-sm">Test Upload:</strong>
              <button
                onClick={testUpload}
                className="ml-2 px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
              >
                Tester Upload
              </button>
              
              {testResults.uploadTest && (
                <div className="text-xs mt-1">
                  <span className={testResults.uploadTest.success ? 'text-green-600' : 'text-red-600'}>
                    {testResults.uploadTest.success ? '✅ Upload OK' : '❌ Upload KO'}
                  </span>
                  {testResults.uploadTest.error && (
                    <div className="text-red-600 mt-1">
                      {testResults.uploadTest.error}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Raw Data */}
      <div className="mt-6 bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">📊 Données Raw</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="font-medium mb-2">Debug Info:</h3>
            <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto max-h-40">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>
          <div>
            <h3 className="font-medium mb-2">Test Results:</h3>
            <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto max-h-40">
              {JSON.stringify(testResults, null, 2)}
            </pre>
          </div>
        </div>
      </div>

      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="font-medium text-yellow-800 mb-2">💡 Instructions:</h3>
        <ol className="text-sm text-yellow-700 space-y-1">
          <li>1. Vérifiez que le token est présent</li>
          <li>2. Testez l'API avec le bouton "Tester Upload"</li>
          <li>3. Regardez les erreurs dans la console (F12)</li>
          <li>4. Si tout est vert, le problème vient d'ailleurs</li>
        </ol>
      </div>
    </div>
  );
};

export default DocumentDebug;