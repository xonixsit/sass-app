import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { formatDate } from '../utils/dateUtils';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
}

export const UserList: React.FC = () => {
  const { token, user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1
  });

  useEffect(() => {
    fetchUsers();
  }, [token]);

  const fetchUsers = async () => {
    if (!token) return;

    try {
      setLoading(true);
      const response = await fetch('/api/v1/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      // Handle both old format (array) and new format (paginated object)
      if (Array.isArray(data)) {
        setUsers(data);
        setPagination({ page: 1, limit: 10, total: data.length, pages: 1 });
      } else if (data.users && Array.isArray(data.users)) {
        setUsers(data.users);
        if (data.pagination) {
          setPagination(data.pagination);
        }
      } else {
        setUsers([]);
        setPagination({ page: 1, limit: 10, total: 0, pages: 1 });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const createUser = async (email: string, name: string) => {
    if (!token) return;

    try {
      const response = await fetch('/api/v1/users', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, name, role: 'user' })
      });

      if (!response.ok) {
        throw new Error('Failed to create user');
      }

      // Refresh the list
      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
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
          onClick={fetchUsers}
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
        <h2 className="text-2xl font-bold text-gray-900">Users</h2>
        <p className="text-sm text-gray-500">
          Tenant: {currentUser?.tenantId}
        </p>
      </div>

      {currentUser?.role === 'admin' && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium mb-2">Add New User</h3>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            createUser(
              formData.get('email') as string,
              formData.get('name') as string
            );
            e.currentTarget.reset();
          }}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                name="email"
                type="email"
                placeholder="Email"
                required
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                name="name"
                type="text"
                placeholder="Name"
                required
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Add User
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {/* Pagination info */}
        {pagination.total > 0 && (
          <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
            <p className="text-sm text-gray-700">
              Showing {users.length} of {pagination.total} users
              {pagination.pages > 1 && ` (Page ${pagination.page} of ${pagination.pages})`}
            </p>
          </div>
        )}
        
        <ul className="divide-y divide-gray-200">
          {users.map((user) => (
            <li key={user.id} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{user.name}</p>
                  <p className="text-sm text-gray-500">{user.email}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    user.role === 'admin' 
                      ? 'bg-purple-100 text-purple-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {user.role}
                  </span>
                  <span className="text-xs text-gray-400">
                    {formatDate(user.created_at)}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
        
        {users.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">No users found</p>
          </div>
        )}
      </div>
    </div>
  );
};