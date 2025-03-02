'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, doc, getDoc, onSnapshot } from 'firebase/firestore';
import AccountCredentials from '@/components/AccountCredentials';
import TradesList from '@/components/TradesList';

export default function Dashboard() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [mt4Credentials, setMt4Credentials] = useState<{ username: string; password: string } | null>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [trades, setTrades] = useState<any[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      // Get user MT4 credentials
      const userRef = doc(db, 'users', user.uid);
      getDoc(userRef).then((docSnap) => {
        if (docSnap.exists()) {
          setMt4Credentials(docSnap.data().mt4Credentials);
        }
      });

      // Listen for MT4 accounts
      const accountsRef = collection(db, 'users', user.uid, 'mt4Accounts');
      const unsubscribeAccounts = onSnapshot(accountsRef, (snapshot) => {
        const accountsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setAccounts(accountsData);
        
        // Select first account by default if none selected
        if (accountsData.length > 0 && !selectedAccount) {
          setSelectedAccount(accountsData[0].id);
        }
      });

      return () => {
        unsubscribeAccounts();
      };
    }
  }, [user, selectedAccount]);

  useEffect(() => {
    if (user && selectedAccount) {
      // Listen for trades from the selected account
      const tradesRef = collection(db, 'users', user.uid, 'mt4Accounts', selectedAccount, 'trades');
      const unsubscribeTrades = onSnapshot(tradesRef, (snapshot) => {
        const tradesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setTrades(tradesData);
      });

      return () => {
        unsubscribeTrades();
      };
    }
  }, [user, selectedAccount]);

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <nav className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold">MT4 Trade Copier</h1>
              </div>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-700 dark:text-gray-300 mr-4">{user.email}</span>
              <button
                onClick={logout}
                className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div className="md:col-span-1">
            <AccountCredentials credentials={mt4Credentials} />
            
            <div className="mt-8 bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Connected Accounts</h2>
              {accounts.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400">No accounts connected yet.</p>
              ) : (
                <ul className="space-y-2">
                  {accounts.map((account) => (
                    <li key={account.id}>
                      <button
                        onClick={() => setSelectedAccount(account.id)}
                        className={`w-full text-left px-3 py-2 rounded-md ${
                          selectedAccount === account.id
                            ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        <div className="font-medium">Account: {account.id}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Terminal: {account.terminal}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="md:col-span-2">
            <TradesList trades={trades} selectedAccount={selectedAccount} />
          </div>
        </div>
      </main>
    </div>
  );
} 