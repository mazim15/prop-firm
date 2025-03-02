import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

export async function POST(request: NextRequest) {
  try {
    // Get the ID token from the request
    const { idToken } = await request.json();
    
    // Verify the ID token
    const decodedToken = await getAuth().verifyIdToken(idToken);
    const uid = decodedToken.uid;
    
    // Generate credentials
    const credentials = {
      username: `user_${uid.substring(0, 8)}`,
      password: generateRandomPassword(),
    };
    
    // Save to Firestore
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, { mt4Credentials: credentials }, { merge: true });
    
    return NextResponse.json({ success: true, credentials });
  } catch (error) {
    console.error('Error generating credentials:', error);
    return NextResponse.json({ error: 'Failed to generate credentials' }, { status: 500 });
  }
}

function generateRandomPassword() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
} 