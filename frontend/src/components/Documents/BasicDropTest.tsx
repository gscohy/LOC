import React, { useState } from 'react';

const BasicDropTest: React.FC = () => {
  const [status, setStatus] = useState('Prêt pour le test');
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<File[]>([]);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setStatus('📥 Fichier détecté - lâchez ici');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setStatus('Drag & drop prêt');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles(droppedFiles);
    setStatus(`✅ ${droppedFiles.length} fichier(s) déposé(s)`);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    setFiles(selectedFiles);
    setStatus(`✅ ${selectedFiles.length} fichier(s) sélectionné(s)`);
  };

  const clearFiles = () => {
    setFiles([]);
    setStatus('Fichiers effacés');
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">🔧 Test Basique Drag & Drop</h1>
      
      <div className="space-y-6">
        {/* Zone de drop basique */}
        <div
          className={`
            border-4 border-dashed rounded-lg p-12 text-center transition-all duration-200
            ${isDragging 
              ? 'border-green-500 bg-green-50 scale-105' 
              : 'border-gray-300 bg-gray-50 hover:border-gray-400'
            }
          `}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <div className="text-4xl mb-4">📁</div>
          <div className="text-lg font-medium mb-2">Zone de Test Drag & Drop</div>
          <div className="text-sm text-gray-600">
            Glissez-déposez n'importe quel fichier ici
          </div>
        </div>

        {/* Statut */}
        <div className="bg-white border rounded-lg p-4">
          <div className="text-sm font-medium text-gray-700 mb-2">Statut:</div>
          <div className={`text-lg ${
            status.includes('✅') ? 'text-green-600' : 
            status.includes('📥') ? 'text-blue-600' : 
            'text-gray-600'
          }`}>
            {status}
          </div>
        </div>

        {/* Sélection classique */}
        <div className="bg-white border rounded-lg p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Ou sélectionnez un fichier :
          </label>
          <input
            type="file"
            multiple
            onChange={handleFileSelect}
            className="w-full p-2 border border-gray-300 rounded"
          />
        </div>

        {/* Liste des fichiers */}
        {files.length > 0 && (
          <div className="bg-white border rounded-lg p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-medium">Fichiers détectés :</h3>
              <button
                onClick={clearFiles}
                className="text-sm text-red-600 hover:text-red-700"
              >
                Effacer
              </button>
            </div>
            <ul className="space-y-2">
              {files.map((file, index) => (
                <li key={index} className="text-sm bg-gray-50 p-2 rounded">
                  <strong>{file.name}</strong> 
                  <span className="text-gray-500 ml-2">
                    ({Math.round(file.size / 1024)} KB)
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-medium text-yellow-800 mb-2">🧪 Test à effectuer :</h3>
          <ol className="text-sm text-yellow-700 space-y-1">
            <li>1. Glissez un fichier depuis votre explorateur</li>
            <li>2. Déposez-le dans la zone grise</li>
            <li>3. Vérifiez que le statut change</li>
            <li>4. Essayez aussi la sélection classique</li>
            <li>5. Si ça ne marche pas, il y a un problème browser/système</li>
          </ol>
        </div>

        {/* Debug info */}
        <div className="bg-gray-50 border rounded-lg p-4 text-xs">
          <strong>Debug Info:</strong><br/>
          • Dragging: {isDragging ? '🟢 Oui' : '🔴 Non'}<br/>
          • Files count: {files.length}<br/>
          • User Agent: {navigator.userAgent.substring(0, 50)}...<br/>
          • Drag API Support: {typeof window.DragEvent !== 'undefined' ? '✅' : '❌'}
        </div>
      </div>
    </div>
  );
};

export default BasicDropTest;