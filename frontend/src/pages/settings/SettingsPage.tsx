import React, { useState } from 'react';
import { Settings, CloudIcon, Mail, Database, Key } from 'lucide-react';
import GoogleDriveSettings from './GoogleDriveSettings';

interface SettingsTab {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  component: React.ComponentType;
}

const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('google-drive');

  const tabs: SettingsTab[] = [
    {
      id: 'google-drive',
      label: 'Google Drive',
      icon: CloudIcon,
      component: GoogleDriveSettings
    },
    // Futurs onglets de paramètres :
    // {
    //   id: 'email',
    //   label: 'Configuration Email',
    //   icon: Mail,
    //   component: EmailSettings
    // },
    // {
    //   id: 'database',
    //   label: 'Base de données',
    //   icon: Database,
    //   component: DatabaseSettings
    // },
    // {
    //   id: 'security',
    //   label: 'Sécurité',
    //   icon: Key,
    //   component: SecuritySettings
    // }
  ];

  const activeTabData = tabs.find(tab => tab.id === activeTab);
  const ActiveComponent = activeTabData?.component;

  return (
    <div className="space-y-6">
      {/* En-tête de la page */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 flex items-center">
          <Settings className="h-6 w-6 mr-3 text-gray-600" />
          Paramètres
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Configurez les intégrations et les paramètres de l'application
        </p>
      </div>

      <div className="flex space-x-8">
        {/* Navigation des onglets */}
        <div className="w-64">
          <nav className="space-y-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <tab.icon className="h-4 w-4 mr-3" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Contenu de l'onglet actif */}
        <div className="flex-1">
          {ActiveComponent && <ActiveComponent />}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;