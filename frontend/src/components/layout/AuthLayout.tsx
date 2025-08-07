import React from 'react';
import { Building2 } from 'lucide-react';

interface AuthLayoutProps {
  children: React.ReactNode;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center">
            <div className="flex items-center justify-center w-16 h-16 bg-primary-600 rounded-full">
              <Building2 className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="mt-4 text-3xl font-bold text-gray-900">
            Gestion Locative
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Application moderne de gestion immobilière
          </p>
        </div>
        
        <div className="mt-8">
          {children}
        </div>
        
        <div className="text-center">
          <p className="text-xs text-gray-500">
            © 2024 Gestion Locative. Version 2.0 - Tous droits réservés.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;