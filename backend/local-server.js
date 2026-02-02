// Simple local development server for testing API endpoints
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Mock DynamoDB data store - each tenant has completely isolated data
const mockData = {
  'tenant_demo': {
    users: [
      {
        id: 'user_123',
        email: 'admin@demo.com',
        name: 'Admin User',
        role: 'admin',
        tenantId: 'tenant_demo',
        createdAt: new Date().toISOString()
      },
      {
        id: 'user_456',
        email: 'user@demo.com',
        name: 'Regular User',
        role: 'user',
        tenantId: 'tenant_demo',
        createdAt: new Date().toISOString()
      }
    ]
  },
  'tenant_acme': {
    users: [
      {
        id: 'user_789',
        email: 'admin@acme.com',
        name: 'ACME Admin',
        role: 'admin',
        tenantId: 'tenant_acme',
        createdAt: new Date().toISOString()
      },
      {
        id: 'user_101',
        email: 'john@acme.com',
        name: 'John Smith',
        role: 'user',
        tenantId: 'tenant_acme',
        createdAt: new Date().toISOString()
      },
      {
        id: 'user_102',
        email: 'jane@acme.com',
        name: 'Jane Doe',
        role: 'user',
        tenantId: 'tenant_acme',
        createdAt: new Date().toISOString()
      }
    ]
  },
  'tenant_startup': {
    users: [
      {
        id: 'user_201',
        email: 'founder@startup.com',
        name: 'Startup Founder',
        role: 'admin',
        tenantId: 'tenant_startup',
        createdAt: new Date().toISOString()
      }
    ]
  }
};

// Mock JWT middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: { code: 'NO_TOKEN', message: 'Access token required' } });
  }

  try {
    // Decode without verification for demo
    console.log('Received token:', token);
    
    let decoded;
    try {
      // Try standard JWT decode first
      decoded = jwt.decode(token);
      console.log('Standard JWT decode result:', decoded);
    } catch (e) {
      console.log('Standard JWT decode failed:', e.message);
    }
    
    if (!decoded) {
      // If that fails, try manual decode for our mock format
      const parts = token.split('.');
      console.log('Token parts count:', parts.length);
      if (parts.length === 3) {
        try {
          const payloadString = Buffer.from(parts[1], 'base64').toString();
          console.log('Decoded payload string:', payloadString);
          decoded = JSON.parse(payloadString);
          console.log('Manual decode successful:', decoded);
        } catch (decodeError) {
          console.log('Manual decode failed:', decodeError.message);
        }
      }
    }
    
    console.log('Final decoded payload:', decoded);
    
    if (!decoded || !decoded.tenantId) {
      console.log('Token validation failed - missing tenant');
      return res.status(403).json({ error: { code: 'INVALID_TOKEN', message: 'Invalid token or missing tenant' } });
    }

    req.user = {
      tenantId: decoded.tenantId,
      userId: decoded.sub,
      roles: decoded.roles || ['user'],
      email: decoded.email
    };

    console.log('User context:', req.user);
    next();
  } catch (error) {
    console.log('JWT decode error:', error.message);
    return res.status(403).json({ error: { code: 'TOKEN_ERROR', message: 'Token verification failed' } });
  }
};

// Users API endpoints
app.get('/api/v1/users', authenticateToken, (req, res) => {
  const { tenantId } = req.user;
  const users = mockData[tenantId]?.users || [];
  res.json(users);
});

app.get('/api/v1/users/:userId', authenticateToken, (req, res) => {
  const { tenantId } = req.user;
  const { userId } = req.params;
  
  const users = mockData[tenantId]?.users || [];
  const user = users.find(u => u.id === userId);
  
  if (!user) {
    return res.status(404).json({ error: { code: 'USER_NOT_FOUND', message: 'User not found' } });
  }
  
  res.json(user);
});

app.post('/api/v1/users', authenticateToken, (req, res) => {
  const { tenantId, roles } = req.user;
  
  // Check admin permissions
  if (!roles.includes('admin')) {
    return res.status(403).json({ error: { code: 'INSUFFICIENT_PERMISSIONS', message: 'Admin role required' } });
  }
  
  const { email, name, role = 'user' } = req.body;
  
  if (!email || !name) {
    return res.status(400).json({ error: { code: 'MISSING_FIELDS', message: 'Email and name are required' } });
  }
  
  const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const newUser = {
    id: userId,
    email,
    name,
    role,
    tenantId,
    createdAt: new Date().toISOString()
  };
  
  // Initialize tenant data if needed
  if (!mockData[tenantId]) {
    mockData[tenantId] = { users: [] };
  }
  
  mockData[tenantId].users.push(newUser);
  
  res.status(201).json(newUser);
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Local development server running on http://localhost:${PORT}`);
  console.log(`📋 API endpoints:`);
  console.log(`   GET  /api/v1/users`);
  console.log(`   GET  /api/v1/users/:userId`);
  console.log(`   POST /api/v1/users`);
  console.log(`   GET  /health`);
  console.log(`\n💡 Use the frontend to test with mock authentication`);
});