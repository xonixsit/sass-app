import React, { createContext, useState, useEffect } from 'react';
import { UserList } from './components/UserList';
import { SubscriptionManager } from './components/SubscriptionManager';
import { Analytics } from './components/Analytics';
import { Teams } from './components/Teams';
import { EnterpriseFeatures } from './components/EnterpriseFeatures';
import { useAuthProvider } from './hooks/useAuth';

// Create Auth Context
interface AuthContextType {
  user: any;
  token: string | null;
  login: (email: string, password: string, tenantId: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

export const AuthContext = createContext<AuthContextType | null>(null);

// Login Component
const LoginForm: React.FC<{ onLogin: (email: string, password: string, tenantId: string) => Promise<void> }> = ({ onLogin }) => {
  const [email, setEmail] = React.useState('admin@demo.com');
  const [password, setPassword] = React.useState('password');
  const [tenantId, setTenantId] = React.useState('tenant_demo');
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onLogin(email, password, tenantId);
    } catch (error) {
      alert('Login failed');
    } finally {
      setLoading(false);
    }
  };

  // Predefined tenant/user combinations for demo
  const demoAccounts = [
    { tenant: 'tenant_demo', email: 'admin@demo.com', name: 'Demo Admin' },
    { tenant: 'tenant_demo', email: 'user@demo.com', name: 'Demo User' },
    { tenant: 'tenant_acme', email: 'admin@acme.com', name: 'ACME Admin' },
    { tenant: 'tenant_acme', email: 'john@acme.com', name: 'ACME User' },
    { tenant: 'tenant_startup', email: 'founder@startup.com', name: 'Startup Founder' },
  ];

  const handleQuickLogin = (account: typeof demoAccounts[0]) => {
    setTenantId(account.tenant);
    setEmail(account.email);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your SaaS account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Multi-tenant demo application
          </p>
        </div>
        
        {/* Quick Login Buttons */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-blue-900 mb-3">Quick Demo Login:</h3>
          <div className="grid grid-cols-1 gap-2">
            {demoAccounts.map((account, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleQuickLogin(account)}
                className="text-left px-3 py-2 text-xs bg-white border border-blue-200 rounded hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <div className="font-medium text-blue-900">{account.name}</div>
                <div className="text-blue-600">{account.email} • {account.tenant}</div>
              </button>
            ))}
          </div>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <label htmlFor="tenant" className="block text-sm font-medium text-gray-700">
                Tenant
              </label>
              <select
                id="tenant"
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                <option value="tenant_demo">Demo Company</option>
                <option value="tenant_acme">ACME Corp</option>
                <option value="tenant_startup">Startup Inc</option>
              </select>
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Email address"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Password"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Main App Component
function App() {
  const auth = useAuthProvider();
  const [activeTab, setActiveTab] = useState('users');
  const [currentSubscription, setCurrentSubscription] = useState<any>(null);

  // Fetch current subscription to determine available features
  useEffect(() => {
    const fetchSubscription = async () => {
      if (auth.token) {
        try {
          const response = await fetch('/api/v1/subscription', {
            headers: { 'Authorization': `Bearer ${auth.token}` }
          });
          if (response.ok) {
            const subscription = await response.json();
            setCurrentSubscription(subscription);
          }
        } catch (error) {
          console.error('Failed to fetch subscription:', error);
        }
      }
    };

    fetchSubscription();

    // Listen for navigation events from Analytics component
    const handleNavigateToSubscription = () => {
      setActiveTab('subscription');
    };

    window.addEventListener('navigateToSubscription', handleNavigateToSubscription);
    
    return () => {
      window.removeEventListener('navigateToSubscription', handleNavigateToSubscription);
    };
  }, [auth.token]);

  const hasAnalytics = currentSubscription?.plan?.features?.advanced_analytics || false;
  const hasTeamCollaboration = currentSubscription?.plan?.features?.team_collaboration || false;
  const isEnterprise = currentSubscription?.plan?.id === 'enterprise';

  if (auth.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'users':
        return <UserList />;
      case 'subscription':
        return <SubscriptionManager />;
      case 'analytics':
        return <Analytics />;
      case 'teams':
        return <Teams />;
      case 'enterprise':
        return <EnterpriseFeatures />;
      default:
        return <UserList />;
    }
  };

  return (
    <AuthContext.Provider value={auth}>
      <div className="min-h-screen bg-gray-50">
        {!auth.user ? (
          <LoginForm onLogin={(email, password, tenantId) => auth.login(email, password, tenantId)} />
        ) : (
          <div>
            {/* Header */}
            <header className="bg-white shadow">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center py-6">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">SaaS Dashboard</h1>
                    <div className="flex items-center space-x-4 mt-1">
                      <p className="text-sm text-gray-500">
                        Welcome, {auth.user.name} ({auth.user.role})
                      </p>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {auth.user.tenantId}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={auth.logout}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            </header>

            {/* Navigation Tabs */}
            <nav className="bg-white border-b border-gray-200">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex space-x-8">
                  <button
                    onClick={() => setActiveTab('users')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'users'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Users
                  </button>
                  <button
                    onClick={() => setActiveTab('subscription')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'subscription'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Subscription
                  </button>
                  <button
                    onClick={() => setActiveTab('teams')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'teams'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Teams
                    {hasTeamCollaboration ? (
                      <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                        Available
                      </span>
                    ) : (
                      <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        Basic+
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab('analytics')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'analytics'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Analytics
                    {hasAnalytics ? (
                      <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                        Available
                      </span>
                    ) : (
                      <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                        Premium+
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab('enterprise')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'enterprise'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Enterprise
                    {isEnterprise ? (
                      <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                        Available
                      </span>
                    ) : (
                      <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                        Enterprise
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </nav>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
              <div className="px-4 py-6 sm:px-0">
                {renderContent()}
              </div>
            </main>
          </div>
        )}
      </div>
    </AuthContext.Provider>
  );
}

export default App;