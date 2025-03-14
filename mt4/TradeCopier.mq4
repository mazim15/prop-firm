//+------------------------------------------------------------------+
//|                                                 TradeCopier.mq4   |
//|                                                                   |
//|                                                                   |
//+------------------------------------------------------------------+
#property copyright "Your Company"
#property link      "https://yourwebsite.com"
#property version   "1.00"
#property strict

// Input parameters
input string Username = "";
input string Password = "";
input string ServerURL = "https://your-deployed-app-url.com/api/trades";
input int ConnectionRetryInterval = 60; // Seconds between connection retry attempts

// Global variables
int lastOrdersTotal = 0;
bool isAuthenticated = false;
string authToken = "";
datetime lastConnectionAttempt = 0;

//+------------------------------------------------------------------+
//| Expert initialization function                                    |
//+------------------------------------------------------------------+
int OnInit()
{
   // Check if credentials are provided
   if(Username == "" || Password == "")
   {
      Print("Please provide username and password");
      return INIT_PARAMETERS_INCORRECT;
   }
   
   // Authenticate with the server
   if(!Authenticate())
   {
      Print("Authentication failed. Will retry on next tick.");
      // Don't return INIT_FAILED to allow retrying
   }
   else
   {
      Print("Trade Copier initialized successfully");
   }
   
   return INIT_SUCCEEDED;
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                  |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   // Logout or cleanup if needed
   Print("Trade Copier stopped");
}

//+------------------------------------------------------------------+
//| Expert tick function                                              |
//+------------------------------------------------------------------+
void OnTick()
{
   // If not authenticated, try to authenticate again after the retry interval
   if(!isAuthenticated)
   {
      if(TimeCurrent() - lastConnectionAttempt > ConnectionRetryInterval)
      {
         Print("Retrying authentication...");
         Authenticate();
      }
      return; // Don't proceed if not authenticated
   }
   
   // Check for new orders
   int currentOrdersTotal = OrdersTotal();
   
   if(currentOrdersTotal > lastOrdersTotal)
   {
      // New order detected
      Print("New order detected. Total orders: ", currentOrdersTotal, " (was ", lastOrdersTotal, ")");
      CheckAndSendNewOrders();
   }
   else if(currentOrdersTotal < lastOrdersTotal)
   {
      // Order closed or deleted
      Print("Order closed or deleted. Total orders: ", currentOrdersTotal, " (was ", lastOrdersTotal, ")");
      SendOrderUpdates();
   }
   else
   {
      // Check for modifications in existing orders
      CheckForModifications();
   }
   
   lastOrdersTotal = currentOrdersTotal;
}

//+------------------------------------------------------------------+
//| Authenticate with the server                                      |
//+------------------------------------------------------------------+
bool Authenticate()
{
   lastConnectionAttempt = TimeCurrent();
   
   // Make sure the URL is properly formatted
   string url = ServerURL;
   
   // Add /auth if not already included
   if(StringSubstr(url, StringLen(url) - 5, 5) != "/auth")
   {
      if(StringSubstr(url, StringLen(url) - 1, 1) != "/")
         url = url + "/auth";
      else
         url = url + "auth";
   }
   
   Print("Connecting to server: ", url);
   Print("Account ID: ", AccountInfoInteger(ACCOUNT_LOGIN));
   
   string postData = "username=" + Username + 
                    "&password=" + Password + 
                    "&terminal=" + TerminalInfoString(TERMINAL_NAME) + 
                    "&account=" + IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN));
   
   char data[];
   char result[];
   string headers = "Content-Type: application/x-www-form-urlencoded\r\n";
   
   StringToCharArray(postData, data, 0, StringLen(postData));
   
   int res = WebRequest("POST", url, headers, 5000, data, result, headers);
   
   if(res == -1)
   {
      Print("Error in WebRequest. Error code: ", GetLastError());
      return false;
   }
   
   string response = CharArrayToString(result, 0, ArraySize(result));
   Print("Server response: ", response);
   
   // Log the full response for debugging
   StringReplace(response, "\\", "\\\\");
   StringReplace(response, "\"", "\\\"");
   Print("Response (escaped): \"", response, "\"");
   
   // Try to parse the JSON response
   if(StringFind(response, "token") >= 0)
   {
      // Extract token from response
      int startPos = StringFind(response, "token") + 8;
      int endPos = StringFind(response, "\"", startPos);
      authToken = StringSubstr(response, startPos, endPos - startPos);
      
      Print("Authentication successful. Token received.");
      Print("Token: ", authToken);
      
      // Debug token format
      string decodedToken = "";
      for(int i=0; i<StringLen(authToken); i+=4)
      {
         string chunk = StringSubstr(authToken, i, MathMin(4, StringLen(authToken)-i));
         decodedToken += chunk + " ";
      }
      Print("Token in chunks: ", decodedToken);
      
      isAuthenticated = true;
      return true;
   }
   
   Print("Authentication failed. Invalid response format.");
   isAuthenticated = false;
   return false;
}

//+------------------------------------------------------------------+
//| Check and send new orders                                         |
//+------------------------------------------------------------------+
void CheckAndSendNewOrders()
{
   Print("Checking for new orders...");
   for(int i = 0; i < OrdersTotal(); i++)
   {
      if(OrderSelect(i, SELECT_BY_POS, MODE_TRADES))
      {
         // Check if this is a new order
         if(OrderOpenTime() > TimeCurrent() - 60) // Opened in the last minute
         {
            Print("Found new order: Ticket=", OrderTicket(), ", Symbol=", OrderSymbol(), ", Type=", OrderType());
            SendOrderData(OrderTicket());
         }
      }
   }
}

//+------------------------------------------------------------------+
//| Send order data to server                                         |
//+------------------------------------------------------------------+
void SendOrderData(int ticket)
{
   if(!OrderSelect(ticket, SELECT_BY_TICKET))
      return;
      
   string url = ServerURL;
   string postData = 
      "token=" + authToken +
      "&action=new" +
      "&ticket=" + IntegerToString(OrderTicket()) +
      "&symbol=" + OrderSymbol() +
      "&type=" + IntegerToString(OrderType()) +
      "&lots=" + DoubleToString(OrderLots(), 2) +
      "&openPrice=" + DoubleToString(OrderOpenPrice(), Digits) +
      "&openTime=" + TimeToString(OrderOpenTime()) +
      "&stopLoss=" + DoubleToString(OrderStopLoss(), Digits) +
      "&takeProfit=" + DoubleToString(OrderTakeProfit(), Digits) +
      "&comment=" + OrderComment() +
      "&magic=" + IntegerToString(OrderMagicNumber()) +
      "&account=" + IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN));
   
   char data[];
   char result[];
   string headers = "Content-Type: application/x-www-form-urlencoded\r\n";
   
   StringToCharArray(postData, data, 0, StringLen(postData));
   
   Print("Sending trade data for ticket: ", ticket);
   Print("URL: ", url);
   Print("Data: ", postData);
   
   int res = WebRequest("POST", url, headers, 5000, data, result, headers);
   
   if(res == -1)
   {
      Print("Error sending order data. Error code: ", GetLastError());
   }
   else
   {
      string response = CharArrayToString(result, 0, ArraySize(result));
      Print("Trade data sent successfully for ticket: ", ticket);
      Print("Server response: ", response);
   }
}

//+------------------------------------------------------------------+
//| Send updates for all orders                                       |
//+------------------------------------------------------------------+
void SendOrderUpdates()
{
   // Implementation to detect closed orders and send updates
   static int lastTickets[1000];
   static int lastTicketsCount = 0;
   
   // First, build a list of current tickets
   int currentTickets[1000];
   int currentTicketsCount = 0;
   
   for(int i = 0; i < OrdersTotal(); i++)
   {
      if(OrderSelect(i, SELECT_BY_POS, MODE_TRADES))
      {
         currentTickets[currentTicketsCount++] = OrderTicket();
      }
   }
   
   // Find tickets that were in the last list but not in the current list (closed orders)
   for(int i = 0; i < lastTicketsCount; i++)
   {
      bool found = false;
      for(int j = 0; j < currentTicketsCount; j++)
      {
         if(lastTickets[i] == currentTickets[j])
         {
            found = true;
            break;
         }
      }
      
      if(!found)
      {
         // This order is no longer open, it was closed
         Print("Order closed: ", lastTickets[i]);
         SendClosedOrderData(lastTickets[i]);
      }
   }
   
   // Update the last tickets list
   for(int i = 0; i < currentTicketsCount; i++)
   {
      lastTickets[i] = currentTickets[i];
   }
   lastTicketsCount = currentTicketsCount;
}

void SendClosedOrderData(int ticket)
{
   // Try to select the order in history
   if(!OrderSelect(ticket, SELECT_BY_TICKET, MODE_HISTORY))
   {
      Print("Could not find closed order in history: ", ticket);
      return;
   }
   
   string url = ServerURL;
   string postData = 
      "token=" + authToken +
      "&action=close" +
      "&ticket=" + IntegerToString(OrderTicket()) +
      "&closePrice=" + DoubleToString(OrderClosePrice(), Digits) +
      "&closeTime=" + TimeToString(OrderCloseTime()) +
      "&profit=" + DoubleToString(OrderProfit(), 2) +
      "&account=" + IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN));
   
   char data[];
   char result[];
   string headers = "Content-Type: application/x-www-form-urlencoded\r\n";
   
   StringToCharArray(postData, data, 0, StringLen(postData));
   
   Print("Sending closed trade data for ticket: ", ticket);
   
   int res = WebRequest("POST", url, headers, 5000, data, result, headers);
   
   if(res == -1)
   {
      Print("Error sending closed order data. Error code: ", GetLastError());
   }
   else
   {
      string response = CharArrayToString(result, 0, ArraySize(result));
      Print("Closed trade data sent successfully for ticket: ", ticket);
      Print("Server response: ", response);
   }
}

//+------------------------------------------------------------------+
//| Check for modifications in existing orders                        |
//+------------------------------------------------------------------+
void CheckForModifications()
{
   static double lastStopLoss[1000];
   static double lastTakeProfit[1000];
   static int lastTickets[1000];
   static int lastCount = 0;
   
   // Build current state
   int currentTickets[1000];
   double currentStopLoss[1000];
   double currentTakeProfit[1000];
   int currentCount = 0;
   
   for(int i = 0; i < OrdersTotal(); i++)
   {
      if(OrderSelect(i, SELECT_BY_POS, MODE_TRADES))
      {
         currentTickets[currentCount] = OrderTicket();
         currentStopLoss[currentCount] = OrderStopLoss();
         currentTakeProfit[currentCount] = OrderTakeProfit();
         currentCount++;
      }
   }
   
   // Check for modifications
   for(int i = 0; i < currentCount; i++)
   {
      for(int j = 0; j < lastCount; j++)
      {
         if(currentTickets[i] == lastTickets[j])
         {
            if(currentStopLoss[i] != lastStopLoss[j] || currentTakeProfit[i] != lastTakeProfit[j])
            {
               // Order was modified
               if(OrderSelect(currentTickets[i], SELECT_BY_TICKET))
               {
                  Print("Order modified: ", currentTickets[i]);
                  SendModifiedOrderData(currentTickets[i]);
               }
            }
            break;
         }
      }
   }
   
   // Update last state
   for(int i = 0; i < currentCount; i++)
   {
      lastTickets[i] = currentTickets[i];
      lastStopLoss[i] = currentStopLoss[i];
      lastTakeProfit[i] = currentTakeProfit[i];
   }
   lastCount = currentCount;
}

void SendModifiedOrderData(int ticket)
{
   if(!OrderSelect(ticket, SELECT_BY_TICKET))
      return;
      
   string url = ServerURL;
   string postData = 
      "token=" + authToken +
      "&action=modify" +
      "&ticket=" + IntegerToString(OrderTicket()) +
      "&stopLoss=" + DoubleToString(OrderStopLoss(), Digits) +
      "&takeProfit=" + DoubleToString(OrderTakeProfit(), Digits) +
      "&account=" + IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN));
   
   char data[];
   char result[];
   string headers = "Content-Type: application/x-www-form-urlencoded\r\n";
   
   StringToCharArray(postData, data, 0, StringLen(postData));
   
   Print("Sending modified trade data for ticket: ", ticket);
   
   int res = WebRequest("POST", url, headers, 5000, data, result, headers);
   
   if(res == -1)
   {
      Print("Error sending modified order data. Error code: ", GetLastError());
   }
   else
   {
      string response = CharArrayToString(result, 0, ArraySize(result));
      Print("Modified trade data sent successfully for ticket: ", ticket);
      Print("Server response: ", response);
   }
} 