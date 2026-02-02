// Database setup with MySQL for production-ready SaaS
const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'saas_app',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Initialize database schema
const initDatabase = async () => {
  try {
    const connection = await pool.getConnection();
    
    console.log('🔗 Connected to MySQL database');
    
    // Create tenants table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS tenants (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        domain VARCHAR(255) UNIQUE,
        plan ENUM('free', 'basic', 'premium', 'enterprise') DEFAULT 'free',
        status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
        settings JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_domain (domain),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Create users table with tenant isolation
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(50) PRIMARY KEY,
        tenant_id VARCHAR(50) NOT NULL,
        email VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role ENUM('admin', 'user', 'viewer') DEFAULT 'user',
        password_hash VARCHAR(255),
        status ENUM('active', 'inactive', 'pending') DEFAULT 'active',
        last_login TIMESTAMP NULL,
        metadata JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
        UNIQUE KEY unique_tenant_email (tenant_id, email),
        INDEX idx_tenant_id (tenant_id),
        INDEX idx_email (email),
        INDEX idx_role (role)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Create audit log table for tracking changes
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id VARCHAR(50) NOT NULL,
        user_id VARCHAR(50),
        action VARCHAR(50) NOT NULL,
        resource_type VARCHAR(50) NOT NULL,
        resource_id VARCHAR(50),
        old_values JSON,
        new_values JSON,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_tenant_id (tenant_id),
        INDEX idx_user_id (user_id),
        INDEX idx_action (action),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Insert demo data
    const demoTenants = [
      { 
        id: 'tenant_demo', 
        name: 'Demo Company', 
        domain: 'demo.com',
        plan: 'free',
        settings: JSON.stringify({ theme: 'light', notifications: true })
      },
      { 
        id: 'tenant_acme', 
        name: 'ACME Corporation', 
        domain: 'acme.com',
        plan: 'premium',
        settings: JSON.stringify({ theme: 'dark', notifications: true, features: ['analytics'] })
      },
      { 
        id: 'tenant_startup', 
        name: 'Startup Inc', 
        domain: 'startup.com',
        plan: 'basic',
        settings: JSON.stringify({ theme: 'light', notifications: false })
      }
    ];

    const demoUsers = [
      { id: 'user_123', tenant_id: 'tenant_demo', email: 'admin@demo.com', name: 'Demo Admin', role: 'admin' },
      { id: 'user_456', tenant_id: 'tenant_demo', email: 'user@demo.com', name: 'Demo User', role: 'user' },
      { id: 'user_789', tenant_id: 'tenant_acme', email: 'admin@acme.com', name: 'ACME Admin', role: 'admin' },
      { id: 'user_101', tenant_id: 'tenant_acme', email: 'john@acme.com', name: 'John Smith', role: 'user' },
      { id: 'user_102', tenant_id: 'tenant_acme', email: 'jane@acme.com', name: 'Jane Doe', role: 'user' },
      { id: 'user_201', tenant_id: 'tenant_startup', email: 'founder@startup.com', name: 'Startup Founder', role: 'admin' }
    ];

    // Insert demo tenants
    for (const tenant of demoTenants) {
      await connection.execute(`
        INSERT IGNORE INTO tenants (id, name, domain, plan, settings) 
        VALUES (?, ?, ?, ?, ?)
      `, [tenant.id, tenant.name, tenant.domain, tenant.plan, tenant.settings]);
    }

    // Insert demo users
    for (const user of demoUsers) {
      await connection.execute(`
        INSERT IGNORE INTO users (id, tenant_id, email, name, role) 
        VALUES (?, ?, ?, ?, ?)
      `, [user.id, user.tenant_id, user.email, user.name, user.role]);
    }

    connection.release();
    console.log('✅ MySQL database initialized successfully');
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    throw error;
  }
};

// Audit logging function
const logAudit = async (tenantId, userId, action, resourceType, resourceId, oldValues = null, newValues = null, req = null) => {
  try {
    await pool.execute(`
      INSERT INTO audit_logs (tenant_id, user_id, action, resource_type, resource_id, old_values, new_values, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      tenantId,
      userId,
      action,
      resourceType,
      resourceId,
      oldValues ? JSON.stringify(oldValues) : null,
      newValues ? JSON.stringify(newValues) : null,
      req?.ip || null,
      req?.get('User-Agent') || null
    ]);
  } catch (error) {
    console.error('Audit logging failed:', error.message);
  }
};

// Tenant CRUD operations
const tenantDb = {
  // Create tenant
  create: async (tenantData, userId = null, req = null) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      const { id, name, domain, plan = 'free', settings = {} } = tenantData;
      
      await connection.execute(`
        INSERT INTO tenants (id, name, domain, plan, settings) 
        VALUES (?, ?, ?, ?, ?)
      `, [id, name, domain, plan, JSON.stringify(settings)]);

      const [rows] = await connection.execute(`
        SELECT * FROM tenants WHERE id = ?
      `, [id]);

      await connection.commit();
      
      // Log audit
      await logAudit(id, userId, 'CREATE', 'tenant', id, null, rows[0], req);
      
      return rows[0];
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  // Get all tenants with pagination
  getAll: async (page = 1, limit = 10, search = '') => {
    const offset = (page - 1) * limit;
    let query = `
      SELECT t.*, 
             COUNT(u.id) as user_count,
             MAX(u.last_login) as last_activity
      FROM tenants t 
      LEFT JOIN users u ON t.id = u.tenant_id 
    `;
    let params = [];
    
    if (search) {
      query += ` WHERE t.name LIKE ? OR t.domain LIKE ?`;
      params.push(`%${search}%`, `%${search}%`);
    }
    
    query += ` GROUP BY t.id ORDER BY t.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [rows] = await pool.execute(query, params);
    
    // Get total count
    let countQuery = `SELECT COUNT(*) as total FROM tenants`;
    let countParams = [];
    if (search) {
      countQuery += ` WHERE name LIKE ? OR domain LIKE ?`;
      countParams.push(`%${search}%`, `%${search}%`);
    }
    
    const [countResult] = await pool.execute(countQuery, countParams);
    
    return {
      tenants: rows,
      pagination: {
        page,
        limit,
        total: countResult[0].total,
        pages: Math.ceil(countResult[0].total / limit)
      }
    };
  },

  // Get tenant by ID
  getById: async (id) => {
    const [rows] = await pool.execute(`
      SELECT t.*, 
             COUNT(u.id) as user_count,
             MAX(u.last_login) as last_activity
      FROM tenants t 
      LEFT JOIN users u ON t.id = u.tenant_id 
      WHERE t.id = ?
      GROUP BY t.id
    `, [id]);
    
    return rows[0] || null;
  },

  // Update tenant
  update: async (id, updates, userId = null, req = null) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      // Get old values for audit
      const [oldRows] = await connection.execute(`SELECT * FROM tenants WHERE id = ?`, [id]);
      const oldValues = oldRows[0];
      
      if (!oldValues) {
        throw new Error('Tenant not found');
      }

      const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
      const values = Object.values(updates);
      
      // Handle JSON fields
      if (updates.settings && typeof updates.settings === 'object') {
        const settingsIndex = Object.keys(updates).indexOf('settings');
        values[settingsIndex] = JSON.stringify(updates.settings);
      }
      
      values.push(id);

      await connection.execute(`
        UPDATE tenants SET ${fields} WHERE id = ?
      `, values);

      // Get updated values
      const [newRows] = await connection.execute(`SELECT * FROM tenants WHERE id = ?`, [id]);
      
      await connection.commit();
      
      // Log audit
      await logAudit(id, userId, 'UPDATE', 'tenant', id, oldValues, newRows[0], req);
      
      return newRows[0];
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  // Delete tenant (soft delete by changing status)
  delete: async (id, userId = null, req = null) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      // Get old values for audit
      const [oldRows] = await connection.execute(`SELECT * FROM tenants WHERE id = ?`, [id]);
      const oldValues = oldRows[0];
      
      if (!oldValues) {
        throw new Error('Tenant not found');
      }

      // Soft delete - change status to inactive
      await connection.execute(`
        UPDATE tenants SET status = 'inactive' WHERE id = ?
      `, [id]);

      // Also deactivate all users
      await connection.execute(`
        UPDATE users SET status = 'inactive' WHERE tenant_id = ?
      `, [id]);

      await connection.commit();
      
      // Log audit
      await logAudit(id, userId, 'DELETE', 'tenant', id, oldValues, { status: 'inactive' }, req);
      
      return { success: true };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
};

// User CRUD operations (tenant-scoped)
const userDb = {
  // Create user
  create: async (userData, requestUserId = null, req = null) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      const { id, tenant_id, email, name, role = 'user', metadata = {} } = userData;
      
      await connection.execute(`
        INSERT INTO users (id, tenant_id, email, name, role, metadata) 
        VALUES (?, ?, ?, ?, ?, ?)
      `, [id, tenant_id, email, name, role, JSON.stringify(metadata)]);

      const [rows] = await connection.execute(`
        SELECT * FROM users WHERE id = ? AND tenant_id = ?
      `, [id, tenant_id]);

      await connection.commit();
      
      // Log audit
      await logAudit(tenant_id, requestUserId, 'CREATE', 'user', id, null, rows[0], req);
      
      return rows[0];
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  // Get users by tenant with pagination and filtering
  getByTenant: async (tenantId, page = 1, limit = 10, search = '', role = '') => {
    const offset = (page - 1) * limit;
    let query = `SELECT * FROM users WHERE tenant_id = ?`;
    let params = [tenantId];
    
    if (search) {
      query += ` AND (name LIKE ? OR email LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }
    
    if (role) {
      query += ` AND role = ?`;
      params.push(role);
    }
    
    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [rows] = await pool.execute(query, params);
    
    // Get total count
    let countQuery = `SELECT COUNT(*) as total FROM users WHERE tenant_id = ?`;
    let countParams = [tenantId];
    if (search) {
      countQuery += ` AND (name LIKE ? OR email LIKE ?)`;
      countParams.push(`%${search}%`, `%${search}%`);
    }
    if (role) {
      countQuery += ` AND role = ?`;
      countParams.push(role);
    }
    
    const [countResult] = await pool.execute(countQuery, countParams);
    
    return {
      users: rows,
      pagination: {
        page,
        limit,
        total: countResult[0].total,
        pages: Math.ceil(countResult[0].total / limit)
      }
    };
  },

  // Get user by ID (tenant-scoped)
  getById: async (tenantId, userId) => {
    const [rows] = await pool.execute(`
      SELECT * FROM users WHERE tenant_id = ? AND id = ?
    `, [tenantId, userId]);
    
    return rows[0] || null;
  },

  // Update user (tenant-scoped)
  update: async (tenantId, userId, updates, requestUserId = null, req = null) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      // Get old values for audit
      const [oldRows] = await connection.execute(`
        SELECT * FROM users WHERE tenant_id = ? AND id = ?
      `, [tenantId, userId]);
      const oldValues = oldRows[0];
      
      if (!oldValues) {
        throw new Error('User not found');
      }

      const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
      const values = Object.values(updates);
      
      // Handle JSON fields
      if (updates.metadata && typeof updates.metadata === 'object') {
        const metadataIndex = Object.keys(updates).indexOf('metadata');
        values[metadataIndex] = JSON.stringify(updates.metadata);
      }
      
      values.push(tenantId, userId);

      await connection.execute(`
        UPDATE users SET ${fields} WHERE tenant_id = ? AND id = ?
      `, values);

      // Get updated values
      const [newRows] = await connection.execute(`
        SELECT * FROM users WHERE tenant_id = ? AND id = ?
      `, [tenantId, userId]);
      
      await connection.commit();
      
      // Log audit
      await logAudit(tenantId, requestUserId, 'UPDATE', 'user', userId, oldValues, newRows[0], req);
      
      return newRows[0];
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  // Delete user (tenant-scoped)
  delete: async (tenantId, userId, requestUserId = null, req = null) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      // Get old values for audit
      const [oldRows] = await connection.execute(`
        SELECT * FROM users WHERE tenant_id = ? AND id = ?
      `, [tenantId, userId]);
      const oldValues = oldRows[0];
      
      if (!oldValues) {
        throw new Error('User not found');
      }

      const [result] = await connection.execute(`
        DELETE FROM users WHERE tenant_id = ? AND id = ?
      `, [tenantId, userId]);
      
      await connection.commit();
      
      // Log audit
      await logAudit(tenantId, requestUserId, 'DELETE', 'user', userId, oldValues, null, req);
      
      return { success: true, deletedRows: result.affectedRows };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  // Get user statistics by tenant
  getStats: async (tenantId) => {
    const [rows] = await pool.execute(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_count,
        COUNT(CASE WHEN role = 'user' THEN 1 END) as user_count,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_count,
        COUNT(CASE WHEN last_login >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as active_last_30_days
      FROM users 
      WHERE tenant_id = ?
    `, [tenantId]);
    
    return rows[0];
  }
};

// Health check function
const healthCheck = async () => {
  try {
    const [rows] = await pool.execute('SELECT 1 as health');
    return { status: 'healthy', timestamp: new Date().toISOString() };
  } catch (error) {
    return { status: 'unhealthy', error: error.message, timestamp: new Date().toISOString() };
  }
};

module.exports = {
  pool,
  initDatabase,
  tenantDb,
  userDb,
  logAudit,
  healthCheck
};