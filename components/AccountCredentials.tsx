'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface AccountCredentialsProps {
  credentials: { username: string; password: string } | null;
}

export default function AccountCredentials({ credentials }: AccountCredentialsProps) {
  const [showPassword, setShowPassword] = useState(false);
  const { user } = useAuth();
  const [localCredentials, setLocalCredentials] = useState<{ username: string; password: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (credentials) {
      setLocalCredentials(credentials);
      setLoading(false);
      return;
    }

    if (!user) {
      setLoading(false);
      return;
    }

    const fetchCredentials = async () => {
      try {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists() && userSnap.data().mt4Credentials) {
          setLocalCredentials(userSnap.data().mt4Credentials);
        } else {
          setError("No credentials found. Please contact support.");
        }
      } catch (err) {
        console.error("Error fetching credentials:", err);
        setError("Failed to load credentials. Please refresh the page.");
      } finally {
        setLoading(false);
      }
    };

    fetchCredentials();
  }, [user, credentials]);

  const generateAndSaveCredentials = async () => {
    if (!user) {
      console.error("Cannot generate credentials: No user logged in");
      setError("You must be logged in to generate credentials");
      return;
    }
    
    setLoading(true);
    console.log("Starting credentials generation for user:", user.uid);
    
    try {
      const credentials = {
        username: `user_${user.uid.substring(0, 8)}`,
        password: generateRandomPassword(),
      };
      
      console.log("Generated credentials:", credentials);
      
      const userRef = doc(db, 'users', user.uid);
      console.log("Attempting to save credentials to Firestore...");
      
      await setDoc(userRef, { 
        mt4Credentials: credentials,
        lastUpdated: new Date().toISOString() // Add this to ensure the document changes
      }, { merge: true });
      
      console.log("Credentials saved successfully");
      
      // Verify the credentials were saved
      const updatedDoc = await getDoc(userRef);
      if (updatedDoc.exists() && updatedDoc.data().mt4Credentials) {
        console.log("Verified credentials in Firestore:", updatedDoc.data().mt4Credentials);
        setLocalCredentials(updatedDoc.data().mt4Credentials);
        setError(null);
      } else {
        console.error("Credentials not found in Firestore after saving");
        setError("Failed to save credentials. Please try again.");
      }
    } catch (err) {
      console.error("Error generating credentials:", err);
      setError(`Failed to generate credentials: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  if (loading) {
    return <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
      <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">MT4 Credentials</h2>
      <p className="text-gray-500 dark:text-gray-400">Loading credentials...</p>
    </div>;
  }

  if (error) {
    return <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
      <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">MT4 Credentials</h2>
      <p className="text-red-500 mb-4">{error}</p>
      <button
        onClick={generateAndSaveCredentials}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        Generate Credentials
      </button>
    </div>;
  }

  if (!localCredentials) {
    return <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
      <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">MT4 Credentials</h2>
      <p className="text-gray-500 dark:text-gray-400">No credentials available.</p>
    </div>;
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
      <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">MT4 Credentials</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Use these credentials in your MT4 Expert Advisor to connect your trading account.
      </p>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Username</label>
          <div className="mt-1 flex rounded-md shadow-sm">
            <input
              type="text"
              readOnly
              value={localCredentials.username}
              className="flex-1 min-w-0 block w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(localCredentials.username)}
              className="ml-3 inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Copy
            </button>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
          <div className="mt-1 flex rounded-md shadow-sm">
            <input
              type={showPassword ? "text" : "password"}
              readOnly
              value={localCredentials.password}
              className="flex-1 min-w-0 block w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="ml-3 inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(localCredentials.password)}
              className="ml-3 inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Copy
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 