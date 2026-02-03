import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';

interface Team {
  id: string;
  name: string;
  members: number;
}

export const Teams: React.FC = () => {
  const { token } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    fetchTeams();
  }, [token]);

  const fetchTeams = async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);
      setAccessDenied(false);

      const response = await fetch('/api/v1/teams', {
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
        throw new Error('Failed to fetch teams');
      }

      const data = await response.json();
      setTeams(data);
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
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-8 text-center">
        <div className="mb-6">
          <svg className="mx-auto h-16 w-16 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-4">Team Collaboration</h3>
        <p className="text-lg text-gray-700 mb-6">
          Organize your team members, manage permissions, and collaborate effectively.
        </p>
        
        <div className="bg-white rounded-lg p-6 mb-6 shadow-sm">
          <h4 className="font-semibold text-gray-900 mb-3">What you'll get:</h4>
          <ul className="text-left space-y-2 text-gray-600">
            <li className="flex items-center">
              <svg className="h-5 w-5 text-green-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Create and manage teams
            </li>
            <li className="flex items-center">
              <svg className="h-5 w-5 text-green-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Role-based permissions
            </li>
            <li className="flex items-center">
              <svg className="h-5 w-5 text-green-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Team activity tracking
            </li>
            <li className="flex items-center">
              <svg className="h-5 w-5 text-green-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Collaborative workspaces
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <button 
            onClick={() => {
              const event = new CustomEvent('navigateToSubscription');
              window.dispatchEvent(event);
            }}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg"
          >
            Upgrade to Basic - $9.99/month
          </button>
          <p className="text-sm text-gray-500">
            Available in Basic, Premium and Enterprise plans
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
          onClick={fetchTeams}
          className="mt-2 text-red-600 hover:text-red-800 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Team Collaboration</h2>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          Basic+ Feature
        </span>
      </div>

      {/* Teams List */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Your Teams</h3>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700">
            Create Team
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map((team) => (
            <div key={team.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900">{team.name}</h4>
                <span className="text-sm text-gray-500">{team.members} members</span>
              </div>
              <div className="flex space-x-2">
                <button className="text-blue-600 hover:text-blue-800 text-sm">Manage</button>
                <button className="text-gray-600 hover:text-gray-800 text-sm">Settings</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};