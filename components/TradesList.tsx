'use client';

import { useState } from 'react';

interface Trade {
  id: string;
  ticket: string;
  symbol: string;
  type: number;
  lots: number;
  openPrice: number;
  openTime: string;
  closePrice?: number;
  closeTime?: string;
  profit?: number;
  status: 'open' | 'closed';
  stopLoss?: number;
  takeProfit?: number;
  comment?: string;
}

interface TradesListProps {
  trades: Trade[];
  accountId: string | null;
}

export default function TradesList({ trades, accountId }: TradesListProps) {
  const [expandedTrade, setExpandedTrade] = useState<string | null>(null);

  const toggleExpand = (tradeId: string) => {
    if (expandedTrade === tradeId) {
      setExpandedTrade(null);
    } else {
      setExpandedTrade(tradeId);
    }
  };

  const getOrderTypeString = (type: number) => {
    switch (type) {
      case 0: return 'Buy';
      case 1: return 'Sell';
      case 2: return 'Buy Limit';
      case 3: return 'Sell Limit';
      case 4: return 'Buy Stop';
      case 5: return 'Sell Stop';
      default: return `Unknown (${type})`;
    }
  };

  if (!accountId) {
    return (
      <div>
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Trades</h2>
        <p className="text-gray-500 dark:text-gray-400">Select an account to view trades.</p>
      </div>
    );
  }

  if (!trades || trades.length === 0) {
    return (
      <div>
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Trades for Account {accountId}</h2>
        <p className="text-gray-500 dark:text-gray-400">No trades found for this account.</p>
        <p className="text-gray-500 dark:text-gray-400 mt-2">Open trades in MT4 to see them appear here.</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Trades for Account {accountId}</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Ticket</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Symbol</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Type</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Lots</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Open Price</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {trades.map((trade) => (
              <tr 
                key={trade.id} 
                className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                onClick={() => toggleExpand(trade.id)}
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{trade.ticket}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{trade.symbol}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{getOrderTypeString(trade.type)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{trade.lots}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{trade.openPrice}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    trade.status === 'open' ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                  }`}>
                    {trade.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
} 