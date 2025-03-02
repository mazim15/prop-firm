'use client';

import { useState } from 'react';

interface Account {
  id: string;
  accountId: string;
  terminal: string;
  lastConnected: string;
  isActive: boolean;
}

interface ConnectedAccountsProps {
  accounts: Account[];
  onSelectAccount?: (accountId: string) => void;
  selectedAccount?: string;
}

export default function ConnectedAccounts({ 
  accounts, 
  onSelectAccount,
  selectedAccount 
}: ConnectedAccountsProps) {
  const [expandedAccount, setExpandedAccount] = useState<string | null>(null);

  const handleAccountClick = (accountId: string) => {
    if (onSelectAccount) {
      onSelectAccount(accountId);
    }
    
    if (expandedAccount === accountId) {
      setExpandedAccount(null);
    } else {
      setExpandedAccount(accountId);
    }
  };

  if (!accounts || accounts.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Connected Accounts</h2>
        <p className="text-gray-500 dark:text-gray-400">No accounts connected yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
      <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Connected Accounts</h2>
      <div className="space-y-4">
        {accounts.map((account) => (
          <div 
            key={account.id} 
            className={`border border-gray-200 dark:border-gray-700 rounded-lg p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
              selectedAccount === account.id ? 'bg-blue-50 dark:bg-blue-900 border-blue-300 dark:border-blue-700' : ''
            }`}
            onClick={() => handleAccountClick(account.id)}
          >
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-md font-medium text-gray-900 dark:text-white">
                  Account: {account.accountId}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {account.terminal}
                </p>
              </div>
              <div className="flex items-center">
                <span className={`inline-block w-3 h-3 rounded-full mr-2 ${account.isActive ? 'bg-green-500' : 'bg-red-500'}`}></span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {account.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
            
            {expandedAccount === account.id && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Last connected: {new Date(account.lastConnected).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
} 