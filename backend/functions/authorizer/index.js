// Lambda Authorizer - validates JWT and injects tenant context
const jwt = require('jsonwebtoken');

exports.handler = async (event) => {
  try {
    const token = event.authorizationToken?.replace('Bearer ', '');
    
    if (!token) {
      throw new Error('No token provided');
    }

    // In production, verify JWT with proper secret/key
    // For demo, we'll decode without verification
    const decoded = jwt.decode(token);
    
    if (!decoded || !decoded.tenantId) {
      throw new Error('Invalid token or missing tenant');
    }

    // Generate policy allowing access
    const policy = {
      principalId: decoded.sub || decoded.userId,
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'execute-api:Invoke',
            Effect: 'Allow',
            Resource: event.methodArn
          }
        ]
      },
      context: {
        tenantId: decoded.tenantId,
        userId: decoded.sub || decoded.userId,
        roles: JSON.stringify(decoded.roles || ['user']),
        email: decoded.email
      }
    };

    return policy;
  } catch (error) {
    console.error('Authorization failed:', error.message);
    throw new Error('Unauthorized');
  }
};