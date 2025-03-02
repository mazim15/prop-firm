const admin = require('firebase-admin');

// Initialize Firebase Admin if not already initialized
let firebaseApp;
if (!admin.apps.length) {
  firebaseApp = admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
} else {
  firebaseApp = admin.app();
}

const db = admin.firestore();

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

  try {
    console.log("Received request to Netlify function:", event.path);
    console.log("HTTP Method:", event.httpMethod);
    console.log("Body:", event.body);
    
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
      
      try {
        // Find the user with these credentials
        const usersRef = db.collection('users');
        const snapshot = await usersRef
          .where('mt4Credentials.username', '==', username)
          .where('mt4Credentials.password', '==', password)
          .get();
        
        if (snapshot.empty) {
          console.log("No matching user found, but accepting for testing");
          // For testing, we'll still accept and use a test user ID
          const userId = "test_user_id";
          
          // Store the account connection
          const accountRef = db.collection('users').doc(userId).collection('mt4Accounts').doc(accountId);
          await accountRef.set({
            accountId,
            terminal: terminal || "MetaTrader 4",
            lastConnected: new Date().toISOString(),
            isActive: true
          }, { merge: true });
          
          const token = Buffer.from(`${userId}:${accountId}:${Date.now()}`).toString('base64');
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ token }),
          };
        }
        
        // Get the first matching user
        const userId = snapshot.docs[0].id;
        console.log(`Found user: ${userId}`);
        
        // Store the account connection
        const accountRef = db.collection('users').doc(userId).collection('mt4Accounts').doc(accountId);
        await accountRef.set({
          accountId,
          terminal: terminal || "MetaTrader 4",
          lastConnected: new Date().toISOString(),
          isActive: true
        }, { merge: true });
        
        const token = Buffer.from(`${userId}:${accountId}:${Date.now()}`).toString('base64');
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ token }),
        };
      } catch (error) {
        console.error("Error storing account connection:", error);
        
        // Still return a token for testing
        const token = Buffer.from(`test_user:${accountId}:${Date.now()}`).toString('base64');
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ token }),
        };
      }
    }
    
    // For any other request, just return success
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true }),
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