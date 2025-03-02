import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  query, 
  where, 
  getDocs, 
  serverTimestamp 
} from 'firebase/firestore';

export async function POST(request: NextRequest) {
  console.log("Received request with URL:", request.url);
  console.log("Request headers:", Object.fromEntries(request.headers.entries()));

  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  // Add CORS headers to all responses
  const response = NextResponse.next();
  response.headers.append('Access-Control-Allow-Origin', '*');
  response.headers.append('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.headers.append('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  try {
    console.log("Received request to /api/trades");
    
    const formData = await request.formData();
    
    // Handle authentication request
    if (request.url.includes('/auth')) {
      console.log("Processing authentication request");
      
      const username = formData.get('username') as string;
      const password = formData.get('password') as string;
      const terminal = formData.get('terminal') as string;
      const accountId = formData.get('account') as string;
      
      console.log(`Auth attempt - Username: ${username}, Terminal: ${terminal}, Account: ${accountId}`);
      
      // Validate MT4 credentials
      const usersRef = collection(db, 'users');
      const q = query(
        usersRef, 
        where('mt4Credentials.username', '==', username),
        where('mt4Credentials.password', '==', password)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        console.log("Authentication failed: Invalid credentials");
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
      }
      
      const userId = querySnapshot.docs[0].id;
      console.log(`Authentication successful for user: ${userId}`);
      
      // Create or update MT4 account
      const accountRef = doc(db, 'users', userId, 'mt4Accounts', accountId);
      await setDoc(accountRef, {
        accountId,
        terminal,
        lastConnected: serverTimestamp(),
        isActive: true
      }, { merge: true });
      
      // Generate a simple token
      const token = Buffer.from(`${userId}:${accountId}:${Date.now()}`).toString('base64');
      
      return NextResponse.json({ token });
    }
    
    // Handle trade data
    const token = formData.get('token') as string;
    const action = formData.get('action') as string;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Decode token (in a real app, verify JWT)
    const decoded = Buffer.from(token, 'base64').toString().split(':');
    const userId = decoded[0];
    const accountId = decoded[1];
    
    if (action === 'new') {
      const ticket = formData.get('ticket') as string;
      const symbol = formData.get('symbol') as string;
      const type = parseInt(formData.get('type') as string);
      const lots = parseFloat(formData.get('lots') as string);
      const openPrice = parseFloat(formData.get('openPrice') as string);
      const openTime = formData.get('openTime') as string;
      const stopLoss = parseFloat(formData.get('stopLoss') as string);
      const takeProfit = parseFloat(formData.get('takeProfit') as string);
      const comment = formData.get('comment') as string;
      const magic = parseInt(formData.get('magic') as string);
      
      // Save trade to Firestore
      const tradeRef = doc(db, 'users', userId, 'mt4Accounts', accountId, 'trades', ticket);
      await setDoc(tradeRef, {
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
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      return NextResponse.json({ success: true });
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
} 