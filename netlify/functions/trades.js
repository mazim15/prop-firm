const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    console.log("Received request to Netlify function");
    
    // Parse form data
    const formData = new URLSearchParams(event.body);
    
    // Check if this is an auth request
    if (event.path.includes('/auth')) {
      console.log("Processing authentication request");
      
      const username = formData.get('username');
      const password = formData.get('password');
      const terminal = formData.get('terminal');
      const accountId = formData.get('account');
      
      console.log(`Auth attempt - Username: ${username}, Terminal: ${terminal}, Account: ${accountId}`);
      
      // Here you would validate credentials against your database
      // For this example, we'll just check if they match your hardcoded values
      
      if (username === 'user_L5B6KJJ0' && password === 's&izKM^L5TB*') {
        console.log("Authentication successful");
        
        // Generate a simple token
        const token = Buffer.from(`user123:${accountId}:${Date.now()}`).toString('base64');
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ token }),
        };
      } else {
        console.log("Authentication failed: Invalid credentials");
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: 'Invalid credentials' }),
        };
      }
    }
    
    // Handle other trade actions here
    
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid action' }),
    };
  } catch (error) {
    console.error('API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Server error' }),
    };
  }
}; 