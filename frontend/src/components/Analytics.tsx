import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';

interface AnalyticsData {
  users_growth: Array<{ month: string; users: number }>;
  revenue: {
    current_month: number;
    last_month: number;
    growth: number;
  };
  top_features: Array<{ name: string; usage: number }>;
}

export const Analytics: React.FC = () => {
  const { token } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    fetchAnalytics();
  }, [token]);

  const fetchAnalytics = async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);
      setAccessDenied(false);

      const response = await fetch('/api/v1/analytics', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 403) {
        const errorData = await response.json();
        setAccessDenied(true);
        setError(errorData.error.message);
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }

      const data = await response.json();
      setAnalytics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-8 text-center">
        <div className="mb-6">
          <svg className="mx-auto h-16 w-16 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-4">Advanced Analytics</h3>
        <p className="text-lg text-gray-700 mb-6">
          Get detailed insights into your business performance with advanced analytics and reporting.
        </p>
        
        <div className="bg-white rounded-lg p-6 mb-6 shadow-sm">
          <h4 className="font-semibold text-gray-900 mb-3">What you'll get:</h4>
          <ul className="text-left space-y-2 text-gray-600">
            <li className="flex items-center">
              <svg className="h-5 w-5 text-green-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Revenue tracking and growth metrics
            </li>
            <li className="flex items-center">
              <svg className="h-5 w-5 text-green-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              User growth and engagement analytics
            </li>
            <li className="flex items-center">
              <svg className="h-5 w-5 text-green-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Feature usage statistics
            </li>
            <li className="flex items-center">
              <svg className="h-5 w-5 text-green-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Export data in multiple formats
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <button 
            onClick={() => {
              // Navigate to subscription tab
              const event = new CustomEvent('navigateToSubscription');
              window.dispatchEvent(event);
            }}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all duration-200 shadow-lg"
          >
            Upgrade to Premium - $29.99/month
          </button>
          <p className="text-sm text-gray-500">
            Available in Premium and Enterprise plans
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-red-800">Error: {error}</p>
        <button 
          onClick={fetchAnalytics}
          className="mt-2 text-red-600 hover:text-red-800 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!analytics) {
    return <div>No analytics data available</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
          Premium Feature
        </span>
      </div>

      {/* Revenue Card */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Revenue Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">
              ${analytics.revenue.current_month.toFixed(2)}
            </p>
            <p className="text-sm text-gray-500">Current Month</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-600">
              ${analytics.revenue.last_month.toFixed(2)}
            </p>
            <p className="text-sm text-gray-500">Last Month</p>
          </div>
          <div className="text-center">
            <p className={`text-2xl font-bold ${analytics.revenue.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {analytics.revenue.growth >= 0 ? '+' : ''}{analytics.revenue.growth.toFixed(1)}%
            </p>
            <p className="text-sm text-gray-500">Growth</p>
          </div>
        </div>
      </div>

      {/* User Growth Chart */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">User Growth</h3>
        <div className="flex items-end space-x-4 h-40">
          {analytics.users_growth.map((data, index) => (
            <div key={index} className="flex-1 flex flex-col items-center">
              <div
                className="bg-blue-500 w-full rounded-t"
                style={{ height: `${(data.users / Math.max(...analytics.users_growth.map(d => d.users))) * 100}%` }}
              ></div>
              <div className="mt-2 text-center">
                <p className="text-sm font-medium text-gray-900">{data.users}</p>
                <p className="text-xs text-gray-500">{data.month}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Features */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Feature Usage</h3>
        <div className="space-y-4">
          {analytics.top_features.map((feature, index) => (
            <div key={index} className="flex items-center">
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-gray-900">{feature.name}</span>
                  <span className="text-sm text-gray-500">{feature.usage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${feature.usage}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};