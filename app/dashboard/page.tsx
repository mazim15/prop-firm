'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, doc, getDoc, onSnapshot } from 'firebase/firestore';
import AccountCredentials from '@/components/AccountCredentials';
import TradesList from '@/components/TradesList';
import ConnectedAccounts from '@/components/ConnectedAccounts';

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
      console.log("Setting up listener for MT4 accounts for user:", user.uid);
      
      const accountsRef = collection(db, 'users', user.uid, 'mt4Accounts');
      const unsubscribeAccounts = onSnapshot(accountsRef, (snapshot) => {
        console.log("Accounts snapshot received, docs count:", snapshot.docs.length);
        
        const accountsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        console.log("Accounts data:", accountsData);
        setAccounts(accountsData);
        
        // Select first account by default if none selected
        if (accountsData.length > 0 && !selectedAccount) {
          setSelectedAccount(accountsData[0].id);
        }
      }, (error) => {
        console.error("Error listening to accounts:", error);
      });

      return () => {
        unsubscribeAccounts();
      };
    }
  }, [user, selectedAccount]);

  useEffect(() => {
    if (user && selectedAccount) {
      console.log(`Setting up listener for trades for account: ${selectedAccount}`);
      
      const tradesRef = collection(db, 'users', user.uid, 'mt4Accounts', selectedAccount, 'trades');
      console.log(`Trades collection path: users/${user.uid}/mt4Accounts/${selectedAccount}/trades`);
      
      const unsubscribeTrades = onSnapshot(tradesRef, (snapshot) => {
        console.log(`Trades snapshot received, docs count: ${snapshot.docs.length}`);
        
        const tradesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        console.log("Trades data:", tradesData);
        setTrades(tradesData);
      }, (error) => {
        console.error("Error listening to trades:", error);
        console.error("Error details:", error.code, error.message);
      });

      return () => {
        console.log(`Unsubscribing from trades for account: ${selectedAccount}`);
        unsubscribeTrades();
      };
    } else {
      console.log("Not setting up trades listener - missing user or selectedAccount", { 
        hasUser: !!user, 
        selectedAccount 
      });
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 space-y-6">
            <AccountCredentials credentials={mt4Credentials} />
            <ConnectedAccounts 
              accounts={accounts} 
              onSelectAccount={setSelectedAccount}
              selectedAccount={selectedAccount}
            />
          </div>

          <div className="md:col-span-2">
            <TradesList trades={trades} accountId={selectedAccount === null ? undefined : selectedAccount} />
          </div>
        </div>
      </main>
    </div>
  );
} 