import React, { useState } from 'react';

const SimpleUploadTest: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<string>('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult('');
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setResult('❌ Aucun fichier sélectionné');
      return;
    }

    setUploading(true);
    setResult('⏳ Upload en cours...');

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Token manquant - veuillez vous reconnecter');
      }

      // D'abord récupérer un contrat existant
      const contratsResponse = await fetch('/api/contrats?limit=1', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const contratsData = await contratsResponse.json();
      
      if (!contratsData.success || !contratsData.data?.length) {
        throw new Error('Aucun contrat trouvé - créez d\'abord un contrat pour tester l\'upload');
      }

      const formData = new FormData();
      formData.append('document', file);
      formData.append('categorie', 'CONTRAT');
      formData.append('typeDoc', 'BAIL');
      formData.append('contratId', contratsData.data[0].id);
      formData.append('description', 'Test upload simple');

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setResult(`✅ Upload réussi ! Document ID: ${data.data.id}`);
      } else {
        setResult(`❌ Erreur: ${data.error || 'Erreur inconnue'}`);
      }

    } catch (error: any) {
      setResult(`❌ Erreur: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-8 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6">🧪 Test Upload Ultra-Simple</h1>
      
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Sélectionner un fichier :
          </label>
          <input
            type="file"
            onChange={handleFileChange}
            accept=".pdf,.jpg,.jpeg,.png,.txt,.doc,.docx"
            className="w-full p-2 border border-gray-300 rounded"
          />
        </div>

        {file && (
          <div className="text-sm text-gray-600">
            Fichier sélectionné: <strong>{file.name}</strong> ({Math.round(file.size / 1024)} KB)
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className={`
            w-full py-3 px-4 rounded font-medium
            ${!file || uploading 
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
              : 'bg-blue-500 hover:bg-blue-600 text-white cursor-pointer'
            }
          `}
        >
          {uploading ? '⏳ Upload en cours...' : '📤 Uploader'}
        </button>

        {result && (
          <div className={`
            p-3 rounded text-sm
            ${result.startsWith('✅') 
              ? 'bg-green-50 text-green-700 border border-green-200' 
              : result.startsWith('❌') 
              ? 'bg-red-50 text-red-700 border border-red-200'
              : 'bg-blue-50 text-blue-700 border border-blue-200'
            }
          `}>
            {result}
          </div>
        )}

        <div className="text-xs text-gray-500 mt-4">
          <strong>États du composant:</strong><br/>
          • Fichier: {file ? '✅ Sélectionné' : '❌ Aucun'}<br/>
          • Upload: {uploading ? '🔄 En cours' : '⏸️ Arrêté'}<br/>
          • Token: {localStorage.getItem('auth_token') ? '✅ Présent' : '❌ Manquant'}
        </div>
      </div>
    </div>
  );
};

export default SimpleUploadTest;