import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';

// Utility function to safely format dates
const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return date.toLocaleDateString();
  } catch (error) {
    return 'Invalid Date';
  }
};

interface Plan {
  id: string;
  name: string;
  monthly_price: number;
  yearly_price: number;
  currency: string;
  features: {
    max_users: number;
    max_projects: number;
    storage_gb: number;
    api_calls_per_month: number;
    support: string;
    custom_branding: boolean;
    advanced_analytics: boolean;
    integrations: string[];
    export_formats: string[];
    team_collaboration: boolean;
    priority_support: boolean;
    sso: boolean;
    audit_logs: boolean;
    [key: string]: any;
  };
}

interface Subscription {
  id: string;
  tenant_id: string;
  plan_id: string;
  billing_cycle: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  plan: Plan;
}

interface UsageStats {
  usage: {
    [key: string]: {
      current: number;
      limit: number;
      last_used: string;
    };
  };
  plan: Plan;
  limits: {
    [key: string]: number;
  };
}

export const SubscriptionManager: React.FC = () => {
  const { token, user } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(null);
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [changingPlan, setChangingPlan] = useState(false);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch all data in parallel
      const [plansRes, subscriptionRes, usageRes] = await Promise.all([
        fetch('/api/v1/plans'),
        fetch('/api/v1/subscription', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/v1/usage', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (plansRes.ok) {
        const plansData = await plansRes.json();
        setPlans(plansData);
      }

      if (subscriptionRes.ok) {
        const subscriptionData = await subscriptionRes.json();
        setCurrentSubscription(subscriptionData);
      }

      if (usageRes.ok) {
        const usageData = await usageRes.json();
        setUsageStats(usageData);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch subscription data');
    } finally {
      setLoading(false);
    }
  };

  const changePlan = async (planId: string) => {
    if (!token) return;

    try {
      setChangingPlan(true);
      
      const response = await fetch('/api/v1/subscription/change', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          plan_id: planId,
          billing_cycle: billingCycle
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`;
        throw new Error(errorMessage);
      }

      // Refresh data
      await fetchData();
      
    } catch (err) {
      console.error('Subscription change error:', err);
      setError(err instanceof Error ? err.message : 'Failed to change plan');
    } finally {
      setChangingPlan(false);
    }
  };

  const getPrice = (plan: Plan) => {
    return billingCycle === 'yearly' ? plan.yearly_price : plan.monthly_price;
  };

  const getSavings = (plan: Plan) => {
    if (billingCycle === 'yearly' && plan.monthly_price > 0) {
      const monthlyTotal = plan.monthly_price * 12;
      const savings = monthlyTotal - plan.yearly_price;
      const percentage = Math.round((savings / monthlyTotal) * 100);
      return { amount: savings, percentage };
    }
    return null;
  };

  const formatUsage = (current: number, limit: number) => {
    if (limit === -1) return `${current} / Unlimited`;
    return `${current} / ${limit}`;
  };

  const getUsagePercentage = (current: number, limit: number) => {
    if (limit === -1) return 0;
    return Math.min((current / limit) * 100, 100);
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-red-800">Error: {error}</p>
        <button 
          onClick={fetchData}
          className="mt-2 text-red-600 hover:text-red-800 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Current Subscription */}
      {currentSubscription && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Current Subscription</h2>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold text-gray-800">
                {currentSubscription.plan.name}
              </h3>
              <p className="text-gray-600">
                ${currentSubscription.plan.monthly_price || currentSubscription.plan.price || 0}/{currentSubscription.billing_cycle || 'monthly'}
              </p>
              <p className="text-sm text-gray-500">
                Status: <span className="capitalize font-medium">{currentSubscription.status}</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Current period ends</p>
              <p className="font-medium">
                {formatDate(currentSubscription.current_period_end)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Usage Statistics */}
      {usageStats && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Usage Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(usageStats.usage).map(([resource, stats]) => {
              const percentage = getUsagePercentage(stats.current, stats.limit);
              return (
                <div key={resource} className="border rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 capitalize mb-2">
                    {resource.replace('_', ' ')}
                  </h4>
                  <div className="mb-2">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>{formatUsage(stats.current, stats.limit)}</span>
                      <span>{stats.limit === -1 ? '∞' : `${percentage.toFixed(0)}%`}</span>
                    </div>
                    {stats.limit !== -1 && (
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${getUsageColor(percentage)}`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    )}
                  </div>
                  {stats.last_used && (
                    <p className="text-xs text-gray-500">
                      Last used: {formatDate(stats.last_used)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Available Plans */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Subscription Plans</h2>
          
          {/* Billing Cycle Toggle */}
          <div className="flex items-center space-x-3">
            <span className={`text-sm ${billingCycle === 'monthly' ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
              Monthly
            </span>
            <button
              onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                billingCycle === 'yearly' ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  billingCycle === 'yearly' ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={`text-sm ${billingCycle === 'yearly' ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
              Yearly
            </span>
            {billingCycle === 'yearly' && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Save up to 17%
              </span>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => {
            const isCurrent = currentSubscription?.plan_id === plan.id;
            const price = getPrice(plan);
            const savings = getSavings(plan);
            
            return (
              <div
                key={plan.id}
                className={`border rounded-lg p-6 relative ${
                  isCurrent ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
              >
                {savings && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Save ${savings.amount.toFixed(0)} ({savings.percentage}%)
                    </span>
                  </div>
                )}
                
                <div className="text-center mb-4">
                  <h3 className="text-xl font-semibold text-gray-900">{plan.name}</h3>
                  <div className="mt-2">
                    <span className="text-3xl font-bold text-gray-900">${price}</span>
                    <span className="text-gray-600">/{billingCycle}</span>
                  </div>
                  {billingCycle === 'yearly' && plan.monthly_price > 0 && (
                    <p className="text-sm text-gray-500 mt-1">
                      ${plan.monthly_price}/month billed annually
                    </p>
                  )}
                </div>

                <ul className="space-y-2 mb-6">
                  <li className="flex items-center text-sm">
                    <span className="text-green-500 mr-2">✓</span>
                    {plan.features.max_users === -1 ? 'Unlimited users' : `${plan.features.max_users} users`}
                  </li>
                  <li className="flex items-center text-sm">
                    <span className="text-green-500 mr-2">✓</span>
                    {plan.features.storage_gb}GB storage
                  </li>
                  <li className="flex items-center text-sm">
                    <span className="text-green-500 mr-2">✓</span>
                    {plan.features.api_calls_per_month.toLocaleString()} API calls/month
                  </li>
                  <li className="flex items-center text-sm">
                    <span className="text-green-500 mr-2">✓</span>
                    {plan.features.support} support
                  </li>
                  {plan.features.advanced_analytics && (
                    <li className="flex items-center text-sm">
                      <span className="text-green-500 mr-2">✓</span>
                      Advanced analytics
                    </li>
                  )}
                  {plan.features.team_collaboration && (
                    <li className="flex items-center text-sm">
                      <span className="text-green-500 mr-2">✓</span>
                      Team collaboration
                    </li>
                  )}
                  {plan.features.sso && (
                    <li className="flex items-center text-sm">
                      <span className="text-green-500 mr-2">✓</span>
                      Single Sign-On
                    </li>
                  )}
                </ul>

                <button
                  onClick={() => changePlan(plan.id)}
                  disabled={isCurrent || changingPlan}
                  className={`w-full py-2 px-4 rounded-md text-sm font-medium ${
                    isCurrent
                      ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500'
                  }`}
                >
                  {changingPlan ? 'Changing...' : isCurrent ? 'Current Plan' : `Select ${billingCycle === 'yearly' ? 'Yearly' : 'Monthly'}`}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};