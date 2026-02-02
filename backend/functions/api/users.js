// Users API - demonstrates multi-tenant patterns
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME || 'saas-app-table';

exports.handler = async (event) => {
  try {
    // Step 1: Extract tenant context from authorizer
    const tenantId = event.requestContext.authorizer.tenantId;
    const userRoles = JSON.parse(event.requestContext.authorizer.roles || '["user"]');
    const currentUserId = event.requestContext.authorizer.userId;

    if (!tenantId) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: { code: 'NO_TENANT', message: 'Tenant context required' } })
      };
    }

    const method = event.httpMethod;
    const pathParameters = event.pathParameters || {};

    switch (method) {
      case 'GET':
        if (pathParameters.userId) {
          return await getUser(tenantId, pathParameters.userId);
        } else {
          return await listUsers(tenantId);
        }
      
      case 'POST':
        // Step 4: Check permissions (only admins can create users)
        if (!userRoles.includes('admin')) {
          return {
            statusCode: 403,
            body: JSON.stringify({ error: { code: 'INSUFFICIENT_PERMISSIONS', message: 'Admin role required' } })
          };
        }
        return await createUser(tenantId, JSON.parse(event.body));
      
      default:
        return {
          statusCode: 405,
          body: JSON.stringify({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' } })
        };
    }
  } catch (error) {
    console.error('Error processing request:', { 
      tenantId: event.requestContext?.authorizer?.tenantId,
      error: error.message 
    });
    
    return {
      statusCode: 500,
      body: JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } })
    };
  }
};

// Step 5: All database operations prefixed with tenant ID
async function getUser(tenantId, userId) {
  const command = new GetCommand({
    TableName: TABLE_NAME,
    Key: {
      pk: `${tenantId}#User#${userId}`,
      sk: 'metadata'
    }
  });

  const result = await docClient.send(command);
  
  if (!result.Item) {
    return {
      statusCode: 404,
      body: JSON.stringify({ error: { code: 'USER_NOT_FOUND', message: 'User not found' } })
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify(result.Item.data)
  };
}

async function listUsers(tenantId) {
  const command = new QueryCommand({
    TableName: TABLE_NAME,
    KeyConditionExpression: 'pk = :pk AND begins_with(sk, :sk)',
    ExpressionAttributeValues: {
      ':pk': `${tenantId}#User`,
      ':sk': 'metadata'
    }
  });

  const result = await docClient.send(command);
  
  const users = result.Items?.map(item => item.data) || [];
  
  return {
    statusCode: 200,
    body: JSON.stringify(users)
  };
}

async function createUser(tenantId, userData) {
  const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const user = {
    id: userId,
    email: userData.email,
    name: userData.name,
    role: userData.role || 'user',
    tenantId: tenantId,
    createdAt: new Date().toISOString()
  };

  const command = new PutCommand({
    TableName: TABLE_NAME,
    Item: {
      pk: `${tenantId}#User#${userId}`,
      sk: 'metadata',
      data: user,
      GSI1PK: tenantId,
      GSI1SK: `User#${user.createdAt}`
    }
  });

  await docClient.send(command);

  return {
    statusCode: 201,
    body: JSON.stringify(user)
  };
}