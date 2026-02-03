// SaaS Subscription Management System
const { pool } = require('./database');

// Define subscription plans with features
const SUBSCRIPTION_PLANS = {
  free: {
    id: 'free',
    name: 'Free Plan',
    monthly_price: 0,
    yearly_price: 0,
    currency: 'USD',
    features: {
      max_users: 3,
      max_projects: 1,
      storage_gb: 1,
      api_calls_per_month: 1000,
      support: 'community',
      custom_branding: false,
      advanced_analytics: false,
      integrations: ['basic'],
      export_formats: ['csv'],
      team_collaboration: false,
      priority_support: false,
      sso: false,
      audit_logs: false
    },
    limits: {
      users: 3,
      projects: 1,
      storage: 1024 * 1024 * 1024, // 1GB in bytes
      api_calls: 1000,
      file_uploads: 10
    }
  },
  basic: {
    id: 'basic',
    name: 'Basic Plan',
    monthly_price: 9.99,
    yearly_price: 99.99, // 2 months free
    currency: 'USD',
    features: {
      max_users: 10,
      max_projects: 5,
      storage_gb: 10,
      api_calls_per_month: 10000,
      support: 'email',
      custom_branding: false,
      advanced_analytics: false,
      integrations: ['basic', 'webhooks'],
      export_formats: ['csv', 'json'],
      team_collaboration: true,
      priority_support: false,
      sso: false,
      audit_logs: true
    },
    limits: {
      users: 10,
      projects: 5,
      storage: 10 * 1024 * 1024 * 1024, // 10GB
      api_calls: 10000,
      file_uploads: 100
    }
  },
  premium: {
    id: 'premium',
    name: 'Premium Plan',
    monthly_price: 29.99,
    yearly_price: 299.99, // 2 months free
    currency: 'USD',
    features: {
      max_users: 50,
      max_projects: 25,
      storage_gb: 100,
      api_calls_per_month: 100000,
      support: 'priority',
      custom_branding: true,
      advanced_analytics: true,
      integrations: ['basic', 'webhooks', 'zapier', 'slack'],
      export_formats: ['csv', 'json', 'pdf', 'excel'],
      team_collaboration: true,
      priority_support: true,
      sso: true,
      audit_logs: true
    },
    limits: {
      users: 50,
      projects: 25,
      storage: 100 * 1024 * 1024 * 1024, // 100GB
      api_calls: 100000,
      file_uploads: 1000
    }
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise Plan',
    monthly_price: 99.99,
    yearly_price: 999.99, // 2 months free
    currency: 'USD',
    features: {
      max_users: -1, // unlimited
      max_projects: -1, // unlimited
      storage_gb: 1000,
      api_calls_per_month: 1000000,
      support: 'dedicated',
      custom_branding: true,
      advanced_analytics: true,
      integrations: ['all'],
      export_formats: ['all'],
      team_collaboration: true,
      priority_support: true,
      sso: true,
      audit_logs: true,
      white_label: true,
      custom_integrations: true,
      dedicated_support: true
    },
    limits: {
      users: -1, // unlimited
      projects: -1, // unlimited
      storage: 1000 * 1024 * 1024 * 1024, // 1TB
      api_calls: 1000000,
      file_uploads: -1 // unlimited
    }
  }
};

// Initialize subscription tables
const initSubscriptionTables = async () => {
  const connection = await pool.getConnection();
  try {
    // First, check if tenants table exists
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME FROM information_schema.tables 
      WHERE table_schema = DATABASE() AND table_name = 'tenants'
    `);
    
    if (tables.length === 0) {
      throw new Error('Tenants table must be created first');
    }

    // Create subscriptions table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id VARCHAR(50) PRIMARY KEY,
        tenant_id VARCHAR(50) NOT NULL,
        plan_id VARCHAR(50) NOT NULL,
        billing_cycle ENUM('monthly', 'yearly') DEFAULT 'monthly',
        status ENUM('active', 'canceled', 'past_due', 'trialing', 'paused') DEFAULT 'active',
        current_period_start DATETIME NOT NULL,
        current_period_end DATETIME NOT NULL,
        trial_end DATETIME NULL,
        cancel_at_period_end BOOLEAN DEFAULT FALSE,
        canceled_at DATETIME NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_tenant_id (tenant_id),
        INDEX idx_status (status),
        INDEX idx_plan_id (plan_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Add foreign key constraint separately
    await connection.execute(`
      ALTER TABLE subscriptions 
      ADD CONSTRAINT fk_subscriptions_tenant 
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    `).catch(() => {
      // Ignore if constraint already exists
    });

    // Add billing_cycle column if it doesn't exist
    await connection.execute(`
      ALTER TABLE subscriptions 
      ADD COLUMN billing_cycle ENUM('monthly', 'yearly') DEFAULT 'monthly'
    `).catch(() => {
      // Ignore if column already exists
    });

    // Create usage tracking table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS usage_tracking (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id VARCHAR(50) NOT NULL,
        resource_type VARCHAR(50) NOT NULL,
        resource_id VARCHAR(50),
        usage_count INT DEFAULT 1,
        usage_date DATE NOT NULL,
        metadata JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_tenant_date (tenant_id, usage_date),
        INDEX idx_resource_type (resource_type),
        UNIQUE KEY unique_daily_usage (tenant_id, resource_type, resource_id, usage_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Add foreign key constraint for usage_tracking
    await connection.execute(`
      ALTER TABLE usage_tracking 
      ADD CONSTRAINT fk_usage_tracking_tenant 
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    `).catch(() => {
      // Ignore if constraint already exists
    });

    // Create feature flags table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS feature_flags (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id VARCHAR(50) NOT NULL,
        feature_name VARCHAR(100) NOT NULL,
        is_enabled BOOLEAN DEFAULT TRUE,
        config JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_tenant_feature (tenant_id, feature_name),
        INDEX idx_tenant_id (tenant_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Add foreign key constraint for feature_flags
    await connection.execute(`
      ALTER TABLE feature_flags 
      ADD CONSTRAINT fk_feature_flags_tenant 
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    `).catch(() => {
      // Ignore if constraint already exists
    });

    // Create enterprise settings table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS enterprise_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id VARCHAR(50) NOT NULL,
        company_logo_url TEXT,
        primary_color VARCHAR(7) DEFAULT '#6366f1',
        secondary_color VARCHAR(7) DEFAULT '#8b5cf6',
        accent_color VARCHAR(7) DEFAULT '#06b6d4',
        custom_domain VARCHAR(255),
        application_name VARCHAR(255),
        white_label_enabled BOOLEAN DEFAULT FALSE,
        custom_css TEXT,
        favicon_url VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_tenant_settings (tenant_id),
        INDEX idx_tenant_id (tenant_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Add foreign key constraint for enterprise_settings
    await connection.execute(`
      ALTER TABLE enterprise_settings 
      ADD CONSTRAINT fk_enterprise_settings_tenant 
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    `).catch(() => {
      // Ignore if constraint already exists
    });

    // Update company_logo_url column to support larger base64 images
    await connection.execute(`
      ALTER TABLE enterprise_settings 
      MODIFY COLUMN company_logo_url TEXT
    `).catch(() => {
      // Ignore if column modification fails
    });

    connection.release();
    console.log('✅ Subscription tables initialized successfully');
  } catch (error) {
    connection.release();
    throw error;
  }
};

// Create default subscriptions for existing tenants
const createDefaultSubscriptions = async () => {
  const connection = await pool.getConnection();
  try {
    // Get all tenants
    const [tenants] = await connection.execute('SELECT id, plan FROM tenants');
    
    for (const tenant of tenants) {
      const subscriptionId = `sub_${tenant.id}_${Date.now()}`;
      const now = new Date();
      const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
      
      await connection.execute(`
        INSERT IGNORE INTO subscriptions (id, tenant_id, plan_id, current_period_start, current_period_end)
        VALUES (?, ?, ?, ?, ?)
      `, [subscriptionId, tenant.id, tenant.plan || 'free', now, periodEnd]);
    }
    
    connection.release();
    console.log('✅ Default subscriptions created');
  } catch (error) {
    connection.release();
    throw error;
  }
};

// Subscription management functions
const subscriptionManager = {
  // Get subscription for tenant
  getSubscription: async (tenantId) => {
    const [rows] = await pool.execute(`
      SELECT * FROM subscriptions WHERE tenant_id = ? AND status = 'active'
      ORDER BY created_at DESC LIMIT 1
    `, [tenantId]);
    
    if (rows.length === 0) {
      return null;
    }
    
    const subscription = rows[0];
    const plan = SUBSCRIPTION_PLANS[subscription.plan_id];
    
    return {
      ...subscription,
      plan: plan
    };
  },

  // Check if tenant has feature access
  hasFeature: async (tenantId, featureName) => {
    const subscription = await subscriptionManager.getSubscription(tenantId);
    if (!subscription) return false;
    
    return subscription.plan.features[featureName] || false;
  },

  // Check usage limits
  checkLimit: async (tenantId, resourceType) => {
    const subscription = await subscriptionManager.getSubscription(tenantId);
    if (!subscription) return { allowed: false, limit: 0, current: 0 };
    
    const limit = subscription.plan.limits[resourceType];
    if (limit === -1) return { allowed: true, limit: -1, current: 0 }; // unlimited
    
    // Get current usage
    const [usage] = await pool.execute(`
      SELECT COALESCE(SUM(usage_count), 0) as current_usage
      FROM usage_tracking 
      WHERE tenant_id = ? AND resource_type = ? 
      AND usage_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    `, [tenantId, resourceType]);
    
    const currentUsage = usage[0].current_usage;
    
    return {
      allowed: currentUsage < limit,
      limit: limit,
      current: currentUsage,
      remaining: Math.max(0, limit - currentUsage)
    };
  },

  // Track usage
  trackUsage: async (tenantId, resourceType, resourceId = null, count = 1) => {
    const today = new Date().toISOString().split('T')[0];
    
    await pool.execute(`
      INSERT INTO usage_tracking (tenant_id, resource_type, resource_id, usage_count, usage_date)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE usage_count = usage_count + VALUES(usage_count)
    `, [tenantId, resourceType, resourceId, count, today]);
  },

  // Get usage statistics
  getUsageStats: async (tenantId) => {
    const [stats] = await pool.execute(`
      SELECT 
        resource_type,
        SUM(usage_count) as total_usage,
        MAX(usage_date) as last_used
      FROM usage_tracking 
      WHERE tenant_id = ? 
      AND usage_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      GROUP BY resource_type
    `, [tenantId]);
    
    const subscription = await subscriptionManager.getSubscription(tenantId);
    const limits = subscription ? subscription.plan.limits : {};
    
    const usageStats = {};
    stats.forEach(stat => {
      usageStats[stat.resource_type] = {
        current: stat.total_usage,
        limit: limits[stat.resource_type] || 0,
        last_used: stat.last_used
      };
    });
    
    return usageStats;
  },

  // Upgrade/downgrade subscription
  changeSubscription: async (tenantId, newPlanId, billingCycle = 'monthly', userId = null) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      // Update tenant plan
      await connection.execute(`
        UPDATE tenants SET plan = ? WHERE id = ?
      `, [newPlanId, tenantId]);
      
      // Create new subscription record
      const subscriptionId = `sub_${tenantId}_${Date.now()}`;
      const now = new Date();
      
      // Calculate period end based on billing cycle
      const periodEnd = new Date(now.getTime());
      if (billingCycle === 'yearly') {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      } else {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      }
      
      // Cancel old subscription
      await connection.execute(`
        UPDATE subscriptions SET status = 'canceled', canceled_at = NOW()
        WHERE tenant_id = ? AND status = 'active'
      `, [tenantId]);
      
      // Create new subscription
      await connection.execute(`
        INSERT INTO subscriptions (id, tenant_id, plan_id, billing_cycle, current_period_start, current_period_end)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [subscriptionId, tenantId, newPlanId, billingCycle, now, periodEnd]);
      
      await connection.commit();
      
      return await subscriptionManager.getSubscription(tenantId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
};

// Feature gate middleware
const requireFeature = (featureName) => {
  return async (req, res, next) => {
    if (!req.user || !req.user.tenantId) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
    }
    
    const hasAccess = await subscriptionManager.hasFeature(req.user.tenantId, featureName);
    if (!hasAccess) {
      const subscription = await subscriptionManager.getSubscription(req.user.tenantId);
      return res.status(403).json({
        error: {
          code: 'FEATURE_NOT_AVAILABLE',
          message: `Feature '${featureName}' not available in your current plan`,
          current_plan: subscription ? subscription.plan.name : 'Unknown',
          upgrade_required: true
        }
      });
    }
    
    next();
  };
};

// Usage limit middleware
const checkUsageLimit = (resourceType) => {
  return async (req, res, next) => {
    if (!req.user || !req.user.tenantId) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
    }
    
    const limitCheck = await subscriptionManager.checkLimit(req.user.tenantId, resourceType);
    if (!limitCheck.allowed) {
      return res.status(429).json({
        error: {
          code: 'USAGE_LIMIT_EXCEEDED',
          message: `Usage limit exceeded for ${resourceType}`,
          limit: limitCheck.limit,
          current: limitCheck.current,
          upgrade_required: true
        }
      });
    }
    
    // Add limit info to request for tracking
    req.usageLimit = limitCheck;
    next();
  };
};

// Enterprise settings management
const enterpriseSettingsManager = {
  // Get enterprise settings for tenant
  getSettings: async (tenantId) => {
    const [rows] = await pool.execute(`
      SELECT * FROM enterprise_settings WHERE tenant_id = ?
    `, [tenantId]);
    
    if (rows.length === 0) {
      // Return default settings if none exist
      return {
        tenant_id: tenantId,
        company_logo_url: null,
        primary_color: '#6366f1',
        secondary_color: '#8b5cf6',
        accent_color: '#06b6d4',
        custom_domain: null,
        application_name: null,
        white_label_enabled: false,
        custom_css: null,
        favicon_url: null
      };
    }
    
    return rows[0];
  },

  // Update enterprise settings
  updateSettings: async (tenantId, settings) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      console.log('Updating enterprise settings for tenant:', tenantId);
      console.log('Settings to update:', Object.keys(settings));
      
      // Check if settings exist
      const [existing] = await connection.execute(`
        SELECT id FROM enterprise_settings WHERE tenant_id = ?
      `, [tenantId]);
      
      if (existing.length === 0) {
        console.log('Creating new enterprise settings record');
        // Insert new settings
        await connection.execute(`
          INSERT INTO enterprise_settings (
            tenant_id, company_logo_url, primary_color, secondary_color, 
            accent_color, custom_domain, application_name, white_label_enabled,
            custom_css, favicon_url
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          tenantId,
          settings.company_logo_url || null,
          settings.primary_color || '#6366f1',
          settings.secondary_color || '#8b5cf6',
          settings.accent_color || '#06b6d4',
          settings.custom_domain || null,
          settings.application_name || null,
          settings.white_label_enabled || false,
          settings.custom_css || null,
          settings.favicon_url || null
        ]);
      } else {
        console.log('Updating existing enterprise settings record');
        // Update existing settings
        const updateFields = [];
        const updateValues = [];
        
        Object.keys(settings).forEach(key => {
          if (settings[key] !== undefined) {
            updateFields.push(`${key} = ?`);
            updateValues.push(settings[key]);
            console.log(`Will update ${key} with value length:`, settings[key] ? settings[key].length : 'null');
          }
        });
        
        if (updateFields.length > 0) {
          updateValues.push(tenantId);
          const query = `UPDATE enterprise_settings SET ${updateFields.join(', ')} WHERE tenant_id = ?`;
          console.log('Executing update query:', query);
          await connection.execute(query, updateValues);
        }
      }
      
      await connection.commit();
      
      // Return updated settings
      const result = await enterpriseSettingsManager.getSettings(tenantId);
      console.log('Final settings retrieved:', result.company_logo_url ? 'Logo URL present' : 'Logo URL missing');
      return result;
    } catch (error) {
      await connection.rollback();
      console.error('Error updating enterprise settings:', error);
      throw error;
    } finally {
      connection.release();
    }
  }
};

module.exports = {
  SUBSCRIPTION_PLANS,
  initSubscriptionTables,
  createDefaultSubscriptions,
  subscriptionManager,
  enterpriseSettingsManager,
  requireFeature,
  checkUsageLimit
};