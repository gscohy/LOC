import React, { useState } from 'react';
import { Mail, Settings, FileText } from 'lucide-react';

import EmailConfigsPage from './EmailConfigsPage';
import EmailTemplatesPage from './EmailTemplatesPage';

type TabType = 'configs' | 'templates';

const EmailsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('templates');

  const tabs = [
    {
      id: 'templates' as TabType,
      label: 'Templates Email',
      icon: <FileText className="h-4 w-4" />,
      description: 'Modèles pour rappels et quittances',
    },
    {
      id: 'configs' as TabType,
      label: 'Configuration SMTP',
      icon: <Settings className="h-4 w-4" />,
      description: 'Comptes email pour envoi',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center">
            <Mail className="h-6 w-6 mr-3 text-blue-500" />
            Gestion des Emails
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Configurez vos emails automatiques et comptes SMTP
          </p>
        </div>
      </div>

      {/* Onglets */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.icon}
              <span className="ml-2">{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Contenu des onglets */}
      <div className="mt-6">
        {activeTab === 'templates' && <EmailTemplatesPage />}
        {activeTab === 'configs' && <EmailConfigsPage />}
      </div>
    </div>
  );
};

export default EmailsPage;