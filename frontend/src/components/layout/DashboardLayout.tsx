import React from 'react';
import { useQuery } from 'react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Building2,
  LayoutDashboard,
  Users,
  Home,
  UserCheck,
  Shield,
  FileText,
  Euro,
  Receipt,
  Calculator,
  CreditCard,
  Settings,
  LogOut,
  Menu,
  X,
  Zap,
  ChevronDown,
  ChevronRight,
  Bell,
  Mail,
} from 'lucide-react';
import { authService } from '@/services/auth';
import { getInitials, getAvatarColor } from '@/lib/utils';
import Button from '@/components/ui/Button';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

interface NavigationItem {
  name: string;
  href?: string;
  icon: React.ComponentType<any>;
  badge?: string;
  children?: NavigationItem[];
}

const navigation: NavigationItem[] = [
  { name: 'Tableau de bord', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Propriétaires', href: '/proprietaires', icon: Users },
  { name: 'Biens immobiliers', href: '/biens', icon: Home },
  { name: 'Locataires', href: '/locataires', icon: UserCheck },
  { name: 'Garants', href: '/garants', icon: Shield },
  { name: 'Contrats', href: '/contrats', icon: FileText },
  { 
    name: 'Loyers', 
    icon: Euro,
    children: [
      { name: 'Gestion des loyers', href: '/loyers', icon: Euro },
      { name: 'Génération automatique', href: '/loyers/generation', icon: Zap },
    ]
  },
  { name: 'Rappels', href: '/rappels', icon: Bell },
  { name: 'Quittances', href: '/quittances', icon: Receipt },
  { name: 'Charges', href: '/charges', icon: Calculator },
  { name: 'Prêts Immobiliers', href: '/prets', icon: CreditCard },
  { name: 'Fiscalité', href: '/fiscalite', icon: FileText },
  { name: 'Configuration Email', href: '/emails', icon: Mail },
  { name: 'Paramètres', href: '/settings', icon: Settings },
  { name: 'Diagnostic', href: '/diagnostic', icon: Zap },
];

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [expandedMenus, setExpandedMenus] = React.useState<Set<string>>(new Set());
  const navigate = useNavigate();
  const location = useLocation();

  const { data: user } = useQuery('currentUser', authService.getCurrentUser);

  // Auto-expand menus when navigating to child routes
  React.useEffect(() => {
    navigation.forEach(item => {
      if (item.children && isChildActive(item.children)) {
        setExpandedMenus(prev => new Set(prev).add(item.name));
      }
    });
  }, [location.pathname]);

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  const isActive = (href: string) => {
    return location.pathname === href;
  };

  const isMenuExpanded = (menuName: string) => {
    return expandedMenus.has(menuName);
  };

  const toggleMenu = (menuName: string) => {
    const newExpanded = new Set(expandedMenus);
    if (newExpanded.has(menuName)) {
      newExpanded.delete(menuName);
    } else {
      newExpanded.add(menuName);
    }
    setExpandedMenus(newExpanded);
  };

  const isChildActive = (children: NavigationItem[]) => {
    return children.some(child => child.href && isActive(child.href));
  };

  const userInitials = user ? getInitials(user.prenom, user.nom) : 'U';
  const userAvatarColor = user ? getAvatarColor(user.email) : 'bg-gray-500';

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="absolute inset-0 bg-gray-600 opacity-75" />
        </div>
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <div className="flex items-center">
            <Building2 className="h-8 w-8 text-primary-600" />
            <span className="ml-2 text-lg font-semibold text-gray-900">
              Gestion Locative
            </span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden"
          >
            <X className="h-6 w-6 text-gray-400" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="mt-6 px-3">
          <div className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              
              // Menu with children
              if (item.children) {
                const expanded = isMenuExpanded(item.name);
                const hasActiveChild = isChildActive(item.children);
                
                return (
                  <div key={item.name}>
                    <button
                      onClick={() => toggleMenu(item.name)}
                      className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                        hasActiveChild
                          ? 'bg-primary-50 text-primary-700'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="mr-3 h-5 w-5" />
                      {item.name}
                      {expanded ? (
                        <ChevronDown className="ml-auto h-4 w-4" />
                      ) : (
                        <ChevronRight className="ml-auto h-4 w-4" />
                      )}
                    </button>
                    
                    {expanded && (
                      <div className="mt-1 space-y-1">
                        {item.children.map((child) => {
                          const ChildIcon = child.icon;
                          const childActive = child.href ? isActive(child.href) : false;
                          
                          return (
                            <button
                              key={child.name}
                              onClick={() => {
                                if (child.href) {
                                  navigate(child.href);
                                  setSidebarOpen(false);
                                }
                              }}
                              className={`w-full flex items-center pl-11 pr-3 py-2 text-sm font-medium rounded-md transition-colors ${
                                childActive
                                  ? 'bg-primary-100 text-primary-800 border-r-2 border-primary-700'
                                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                              }`}
                            >
                              <ChildIcon className="mr-3 h-4 w-4" />
                              {child.name}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }
              
              // Simple menu item
              const active = item.href ? isActive(item.href) : false;
              
              return (
                <button
                  key={item.name}
                  onClick={() => {
                    if (item.href) {
                      navigate(item.href);
                      setSidebarOpen(false);
                    }
                  }}
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    active
                      ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {item.name}
                  {item.badge && (
                    <span className="ml-auto bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* User menu */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <div className="flex items-center">
            <div className={`flex-shrink-0 h-10 w-10 ${userAvatarColor} rounded-full flex items-center justify-center text-white font-medium text-sm`}>
              {userInitials}
            </div>
            <div className="ml-3 flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user ? `${user.prenom} ${user.nom}` : 'Chargement...'}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {user?.role || ''}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="ml-2 p-1"
              title="Se déconnecter"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top header */}
        <header className="bg-white shadow-sm border-b border-gray-200 lg:hidden">
          <div className="flex items-center justify-between h-16 px-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-gray-500 hover:text-gray-600"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex items-center">
              <Building2 className="h-6 w-6 text-primary-600" />
              <span className="ml-2 text-lg font-semibold text-gray-900">
                Gestion Locative
              </span>
            </div>
            <div className="w-6" /> {/* Spacer */}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;