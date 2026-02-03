import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';

interface EnterpriseSettings {
  company_logo_url?: string | null;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  custom_domain?: string;
  application_name?: string;
  white_label_enabled?: boolean;
  custom_css?: string;
  favicon_url?: string;
}

export const EnterpriseFeatures: React.FC = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [settings, setSettings] = useState<EnterpriseSettings>({
    primary_color: '#6366f1',
    secondary_color: '#8b5cf6',
    accent_color: '#06b6d4',
    white_label_enabled: false
  });
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [previewLogo, setPreviewLogo] = useState<string | null>(null);

  useEffect(() => {
    checkAccess();
  }, [token]);

  const checkAccess = async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);
      setAccessDenied(false);

      // Check current subscription
      const response = await fetch('/api/v1/subscription', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const subscription = await response.json();
        
        // Check if user has enterprise features
        if (subscription.plan.id !== 'enterprise') {
          setAccessDenied(true);
          setError('Enterprise features require Enterprise plan');
        } else {
          // Load enterprise settings
          await loadSettings();
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      setError(null); // Clear any previous errors
      const response = await fetch('/api/v1/enterprise/settings', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const enterpriseSettings = await response.json();
        setSettings(enterpriseSettings);
      }
    } catch (err) {
      console.error('Failed to load enterprise settings:', err);
    }
  };

  const saveSettings = async () => {
    if (!token) return;

    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      const response = await fetch('/api/v1/enterprise/settings', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      });

      if (response.ok) {
        const result = await response.json();
        setSettings(result.settings);
        setSuccessMessage('Settings saved successfully!');
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError('File size must be less than 2MB');
      return;
    }

    try {
      setUploadingLogo(true);
      setError(null);

      // Convert file to base64 for demo purposes
      const reader = new FileReader();
      reader.onload = async (e) => {
        const logoData = e.target?.result as string;
        
        // Set preview immediately
        setPreviewLogo(logoData);
        
        const response = await fetch('/api/v1/enterprise/upload-logo', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ logoData })
        });

        if (response.ok) {
          const result = await response.json();
          setSettings(prev => ({ ...prev, company_logo_url: result.logo_url }));
          setPreviewLogo(null); // Clear preview since it's now saved
          setSuccessMessage('Logo uploaded successfully!');
          setTimeout(() => setSuccessMessage(null), 3000);
        } else {
          throw new Error('Failed to upload logo');
        }
      };
      
      reader.onerror = () => {
        setError('Failed to read file');
        setPreviewLogo(null);
      };
      
      reader.readAsDataURL(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload logo');
      setPreviewLogo(null);
    } finally {
      setUploadingLogo(false);
    }
  };

  const updateSetting = (key: keyof EnterpriseSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-8 text-center">
        <div className="mb-6">
          <svg className="mx-auto h-16 w-16 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-4">Enterprise Features</h3>
        <p className="text-lg text-gray-700 mb-6">
          Unlock powerful enterprise-grade features for large organizations and advanced use cases.
        </p>
        
        <div className="bg-white rounded-lg p-6 mb-6 shadow-sm">
          <h4 className="font-semibold text-gray-900 mb-3">Enterprise-exclusive features:</h4>
          <ul className="text-left space-y-2 text-gray-600">
            <li className="flex items-center">
              <svg className="h-5 w-5 text-green-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              White-label branding and customization
            </li>
            <li className="flex items-center">
              <svg className="h-5 w-5 text-green-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Custom integrations and API access
            </li>
            <li className="flex items-center">
              <svg className="h-5 w-5 text-green-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Dedicated support and account manager
            </li>
            <li className="flex items-center">
              <svg className="h-5 w-5 text-green-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Advanced security and compliance features
            </li>
            <li className="flex items-center">
              <svg className="h-5 w-5 text-green-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Unlimited users and storage
            </li>
            <li className="flex items-center">
              <svg className="h-5 w-5 text-green-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Priority feature requests and development
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <button 
            onClick={() => {
              const event = new CustomEvent('navigateToSubscription');
              window.dispatchEvent(event);
            }}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all duration-200 shadow-lg"
          >
            Upgrade to Enterprise - $99.99/month
          </button>
          <p className="text-sm text-gray-500">
            Contact sales for custom pricing and implementation
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
          onClick={checkAccess}
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
        <h2 className="text-2xl font-bold text-gray-900">Enterprise Features</h2>
        <div className="flex items-center space-x-3">
          {successMessage && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
              ✓ {successMessage}
            </span>
          )}
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
            Enterprise Only
          </span>
        </div>
      </div>

      {/* White Label Branding */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">White Label Branding</h3>
          <button
            onClick={saveSettings}
            disabled={saving}
            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Company Logo</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                {(previewLogo || (settings.company_logo_url && settings.company_logo_url.startsWith('data:image/'))) ? (
                  <div className="space-y-3">
                    <img 
                      src={previewLogo || settings.company_logo_url || ''} 
                      alt="Company Logo" 
                      className="mx-auto h-16 w-auto object-contain"
                      onError={(e) => {
                        console.error('Logo failed to load:', e);
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        // Clear the invalid logo URL from settings
                        setSettings(prev => ({ ...prev, company_logo_url: null }));
                        // Don't set error here since the backend will handle cleanup
                      }}
                    />
                    <p className="text-sm text-gray-600">
                      {previewLogo && !settings.company_logo_url ? 'Preview (not saved)' : 'Current logo'}
                    </p>
                  </div>
                ) : (
                  <div>
                    <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                      <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <p className="mt-2 text-sm text-gray-600">Upload your company logo</p>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  disabled={uploadingLogo}
                  className="mt-3 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {uploadingLogo && (
                  <p className="mt-2 text-sm text-blue-600">Uploading...</p>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Brand Colors</label>
              <div className="flex space-x-2">
                <div className="flex flex-col items-center">
                  <input 
                    type="color" 
                    value={settings.primary_color || '#6366f1'} 
                    onChange={(e) => updateSetting('primary_color', e.target.value)}
                    className="w-12 h-10 rounded border cursor-pointer" 
                  />
                  <span className="text-xs text-gray-500 mt-1">Primary</span>
                </div>
                <div className="flex flex-col items-center">
                  <input 
                    type="color" 
                    value={settings.secondary_color || '#8b5cf6'} 
                    onChange={(e) => updateSetting('secondary_color', e.target.value)}
                    className="w-12 h-10 rounded border cursor-pointer" 
                  />
                  <span className="text-xs text-gray-500 mt-1">Secondary</span>
                </div>
                <div className="flex flex-col items-center">
                  <input 
                    type="color" 
                    value={settings.accent_color || '#06b6d4'} 
                    onChange={(e) => updateSetting('accent_color', e.target.value)}
                    className="w-12 h-10 rounded border cursor-pointer" 
                  />
                  <span className="text-xs text-gray-500 mt-1">Accent</span>
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Custom Domain</label>
              <input 
                type="text" 
                placeholder="your-company.com" 
                value={settings.custom_domain || ''}
                onChange={(e) => updateSetting('custom_domain', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Application Name</label>
              <input 
                type="text" 
                placeholder="Your Company Platform" 
                value={settings.application_name || ''}
                onChange={(e) => updateSetting('application_name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
              />
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="white_label_enabled"
                checked={settings.white_label_enabled || false}
                onChange={(e) => updateSetting('white_label_enabled', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="white_label_enabled" className="ml-2 block text-sm text-gray-900">
                Enable white-label branding
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Integrations */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Custom Integrations</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border rounded-lg p-4 text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-lg mx-auto mb-3 flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <h4 className="font-medium text-gray-900">API Access</h4>
            <p className="text-sm text-gray-600 mt-1">Full REST API access</p>
          </div>
          <div className="border rounded-lg p-4 text-center">
            <div className="w-12 h-12 bg-green-100 rounded-lg mx-auto mb-3 flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h4 className="font-medium text-gray-900">Webhooks</h4>
            <p className="text-sm text-gray-600 mt-1">Real-time notifications</p>
          </div>
          <div className="border rounded-lg p-4 text-center">
            <div className="w-12 h-12 bg-purple-100 rounded-lg mx-auto mb-3 flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            <h4 className="font-medium text-gray-900">Custom Apps</h4>
            <p className="text-sm text-gray-600 mt-1">Build custom solutions</p>
          </div>
        </div>
      </div>

      {/* Dedicated Support */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Dedicated Support</h3>
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mr-4">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Your Account Manager</h4>
              <p className="text-sm text-gray-600">Sarah Johnson - Enterprise Success Manager</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-900">Direct Contact</p>
              <p className="text-sm text-gray-600">sarah.johnson@company.com</p>
              <p className="text-sm text-gray-600">+1 (555) 123-4567</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Response Time</p>
              <p className="text-sm text-gray-600">&lt; 2 hours during business hours</p>
              <p className="text-sm text-gray-600">24/7 emergency support</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};