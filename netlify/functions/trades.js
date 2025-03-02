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
    
    // Inside your exports.handler function, add this code to handle trade data
    if (formData.get('action') === 'new') {
      console.log("Processing new trade data");
      
      const token = formData.get('token');
      if (!token) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: 'Authentication required' }),
        };
      }
      
      try {
        // Decode token to get userId and accountId
        const decoded = Buffer.from(token, 'base64').toString('utf-8').split(':');
        const userId = decoded[0];
        const accountId = decoded[1];
        
        console.log(`Processing trade for user: ${userId}, account: ${accountId}`);
        
        // Extract trade data
        const ticket = formData.get('ticket');
        const symbol = formData.get('symbol');
        const type = parseInt(formData.get('type'));
        const lots = parseFloat(formData.get('lots'));
        const openPrice = parseFloat(formData.get('openPrice'));
        const openTime = formData.get('openTime');
        const stopLoss = parseFloat(formData.get('stopLoss')) || 0;
        const takeProfit = parseFloat(formData.get('takeProfit')) || 0;
        const comment = formData.get('comment') || '';
        const magic = parseInt(formData.get('magic')) || 0;
        
        console.log(`Trade details: Ticket=${ticket}, Symbol=${symbol}, Type=${type}, Lots=${lots}`);
        
        // Save trade to Firestore
        const tradeRef = db.collection('users').doc(userId)
          .collection('mt4Accounts').doc(accountId)
          .collection('trades').doc(ticket);
          
        await tradeRef.set({
          ticket,
          symbol,
          type,
          lots,
          openPrice,
          openTime,
          stopLoss,
          takeProfit,
          comment,
          magic,
          status: 'open',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        
        console.log(`Trade ${ticket} saved successfully`);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true }),
        };
      } catch (error) {
        console.error('Error processing trade:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Failed to process trade' }),
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