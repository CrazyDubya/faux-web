# fauxBank Integration Guide for fauxCustomer

This guide provides practical information for integrating fauxCustomer agents with the fauxBank platform.

## Quick Start

### 1. Register Your Agent

Before interacting with fauxBank, register your customer agent:

```typescript
// Example: Register a customer agent
const response = await fetch('https://fauxbank.example.com/v1/agents/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    agent_id: 'customer-agent-001',
    agent_type: 'CUSTOMER_AGENT',
    capabilities_requested: [
      'BALANCE_READ',
      'TRANSFER',
      'TRANSACTION_HISTORY'
    ]
  })
});

const { agent_token } = await response.json();
// Store this token for future requests
```

### 2. Create Customer Account

Open a checking account for your customer:

```typescript
const accountResponse = await fetch('https://fauxbank.example.com/v1/accounts', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${agent_token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    type: 'CH',
    segment: 'RETL',
    owner_id: 'CUSTOMER-001',
    name: 'Customer Checking Account',
    initial_deposit: {
      value: 500000,  // $5,000.00 in cents
      currency: 'FXUSD'
    }
  })
});

const account = await accountResponse.json();
console.log('Account ID:', account.account_id);
// Example: CH-RETL-CUSTACCT-AB
```

### 3. Check Balance

Verify account balance before making purchases:

```typescript
const balanceResponse = await fetch(
  `https://fauxbank.example.com/v1/accounts/${account.account_id}/balance`,
  {
    headers: {
      'Authorization': `Bearer ${agent_token}`,
    }
  }
);

const balanceData = await balanceResponse.json();
console.log('Balance:', balanceData.balance.value / 100); // Convert cents to dollars
```

### 4. Make a Purchase

When your customer makes a purchase, authorize the payment:

```typescript
const purchaseResponse = await fetch(
  'https://fauxbank.example.com/v1/commercial/merchant/authorize',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${agent_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      merchant_account: 'MC-COMM-FAUXSHOP-AA',
      card_token: `CARD-${account.account_id}`,
      amount: {
        value: 15000,  // $150.00
        currency: 'FXUSD'
      },
      order_reference: 'ORDER-12345'
    })
  }
);

const authorization = await purchaseResponse.json();
if (authorization.status === 'APPROVED') {
  console.log('Payment approved:', authorization.authorization_id);
}
```

### 5. View Transaction History

Retrieve transaction history for the customer:

```typescript
const historyResponse = await fetch(
  `https://fauxbank.example.com/v1/accounts/${account.account_id}/transactions?limit=10`,
  {
    headers: {
      'Authorization': `Bearer ${agent_token}`,
    }
  }
);

const transactions = await historyResponse.json();
transactions.items.forEach(tx => {
  console.log(`${tx.posted_at}: ${tx.memo} - $${tx.amount.value / 100}`);
});
```

## Account Types for Customers

### Retail Account Types

| Type | Code | Common Use Cases |
|------|------|------------------|
| Checking | CH | Daily transactions, online purchases |
| Savings | SV | Emergency fund, saving for goals |
| Credit Card | CC | Credit purchases, rewards |
| Line of Credit | LC | Flexible borrowing |

### Creating Different Account Types

```typescript
// Savings Account
const savingsAccount = await createAccount({
  type: 'SV',
  segment: 'RETL',
  owner_id: 'CUSTOMER-001',
  name: 'Emergency Savings',
  initial_deposit: { value: 1000000, currency: 'FXUSD' } // $10,000
});

// Credit Card
const creditCard = await createAccount({
  type: 'CC',
  segment: 'RETL',
  owner_id: 'CUSTOMER-001',
  name: 'Rewards Credit Card',
  credit_limit: { value: 500000, currency: 'FXUSD' } // $5,000 limit
});
```

## Customer Behaviors

### Scenario: Monthly Bill Payment

```typescript
async function payMonthlyBill(customerId: string, billAmount: number) {
  // 1. Check if customer has sufficient funds
  const balance = await getBalance(customerAccountId);
  
  if (balance.available_balance.value < billAmount) {
    console.log('Insufficient funds, transferring from savings...');
    
    // 2. Transfer from savings to checking
    await transferFunds({
      from: savingsAccountId,
      to: checkingAccountId,
      amount: { value: billAmount, currency: 'FXUSD' },
      memo: 'Transfer for bill payment'
    });
  }
  
  // 3. Pay the bill
  await makePayment({
    from: checkingAccountId,
    to: billerAccountId,
    amount: { value: billAmount, currency: 'FXUSD' },
    memo: 'Monthly utility bill'
  });
}
```

### Scenario: Online Shopping

```typescript
async function makeOnlinePurchase(customerId: string, items: Item[]) {
  const totalAmount = items.reduce((sum, item) => sum + item.price, 0);
  
  // 1. Authorize the purchase
  const authResponse = await authorizeCardPayment({
    merchant_account: merchantAccount,
    card_token: customerCardToken,
    amount: { value: totalAmount, currency: 'FXUSD' },
    order_reference: generateOrderId()
  });
  
  if (authResponse.status === 'APPROVED') {
    console.log('Purchase approved!');
    return authResponse.authorization_id;
  } else if (authResponse.status === 'DECLINED') {
    console.log('Purchase declined:', authResponse.decline_reason);
    
    // 2. Handle declined payment
    await handleDeclinedPayment(customerId);
  }
}
```

### Scenario: Savings Goal Tracking

```typescript
async function trackSavingsGoal(customerId: string, goalAmount: number) {
  const savingsAccount = await getAccount(savingsAccountId);
  const currentBalance = savingsAccount.balance.value;
  
  const percentComplete = (currentBalance / goalAmount) * 100;
  
  console.log(`Savings goal: ${percentComplete.toFixed(1)}% complete`);
  console.log(`Current: $${currentBalance / 100}`);
  console.log(`Goal: $${goalAmount / 100}`);
  console.log(`Remaining: $${(goalAmount - currentBalance) / 100}`);
  
  // Optionally: auto-transfer from checking to savings
  if (shouldAutoSave(customerId)) {
    await transferFunds({
      from: checkingAccountId,
      to: savingsAccountId,
      amount: { value: 10000, currency: 'FXUSD' }, // $100 auto-save
      memo: 'Automatic savings transfer'
    });
  }
}
```

## Error Handling

### Common Errors and Responses

```typescript
async function handleBankingOperation(operation: () => Promise<any>) {
  try {
    return await operation();
  } catch (error) {
    if (error.code === 'FB-3001') {
      // Insufficient funds
      console.error('Insufficient funds in account');
      // Consider transferring from savings or notifying customer
    } else if (error.code === 'FB-1002') {
      // Token expired
      console.error('Authentication token expired, re-registering...');
      await reRegisterAgent();
    } else if (error.code === 'FB-5001') {
      // Rate limit exceeded
      console.error('Rate limit exceeded, waiting...');
      await sleep(60000); // Wait 1 minute
      return await operation(); // Retry
    } else {
      console.error('Unknown banking error:', error);
      throw error;
    }
  }
}
```

### Retry Logic

```typescript
async function retryableBankingRequest<T>(
  request: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: any;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await request();
    } catch (error) {
      lastError = error;
      
      // Don't retry on permanent errors
      if (error.code?.startsWith('FB-2') || error.code?.startsWith('FB-3')) {
        throw error;
      }
      
      // Wait before retry with exponential backoff
      const waitTime = Math.pow(2, i) * 1000;
      await sleep(waitTime);
    }
  }
  
  throw lastError;
}
```

## Best Practices

### 1. Token Management

```typescript
class BankingClient {
  private token: string | null = null;
  private tokenExpiry: Date | null = null;
  
  async ensureAuthenticated() {
    if (!this.token || this.tokenExpiry! < new Date()) {
      const response = await this.registerAgent();
      this.token = response.agent_token;
      this.tokenExpiry = new Date(response.expires_at);
    }
  }
  
  async makeRequest(endpoint: string, options: RequestInit) {
    await this.ensureAuthenticated();
    
    return fetch(endpoint, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${this.token}`,
      }
    });
  }
}
```

### 2. Currency Handling

```typescript
// Always work in cents to avoid floating-point issues
function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

function centsToDollars(cents: number): number {
  return cents / 100;
}

// Use for display
function formatCurrency(cents: number): string {
  return `F$${(cents / 100).toFixed(2)}`;
}

// Examples
const amount = dollarsToCents(99.99);  // 9999 cents
console.log(formatCurrency(amount));    // "F$99.99"
```

### 3. Balance Checks

Always check balance before attempting transactions:

```typescript
async function safeTransaction(fromAccount: string, amount: Money) {
  const balance = await getBalance(fromAccount);
  
  if (balance.available_balance.value < amount.value) {
    throw new Error('Insufficient funds');
  }
  
  return await makeTransaction({
    from: fromAccount,
    amount: amount
  });
}
```

### 4. Idempotency

Use idempotency keys for critical transactions:

```typescript
async function idempotentTransaction(params: TransactionParams) {
  const idempotencyKey = generateIdempotencyKey(params);
  
  return await fetch('https://fauxbank.example.com/v1/transactions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Idempotency-Key': idempotencyKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params)
  });
}
```

## Testing Scenarios

### Simulating Network Failures

```typescript
// Inject 10% failure rate for 1 hour
await fetch('https://fauxbank.example.com/v1/testing/network/inject-failure', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    network: 'FAUXVISA',
    failure_type: 'DECLINED',
    probability: 0.1,
    duration_seconds: 3600
  })
});

// Now test how your customer handles declined payments
await testDeclinedPaymentFlow();
```

### Time Travel Testing

```typescript
// Advance time by 30 days to test monthly billing
await fetch('https://fauxbank.example.com/v1/testing/time/advance', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    advance_by: 'P30D'
  })
});

// Verify that monthly charges have been applied
await verifyMonthlyCharges();
```

## Data Models

### Account Object

```typescript
interface Account {
  account_id: string;           // e.g., "CH-RETL-CUSTACCT-AB"
  type: string;                 // "CH", "SV", "CC", etc.
  segment: string;              // "RETL", "COMM", "GOVT"
  owner_id: string;             // Customer identifier
  name: string;                 // Display name
  balance: Money;               // Current balance
  available_balance?: Money;    // Available (non-held) balance
  status: 'ACTIVE' | 'FROZEN' | 'CLOSED';
  created_at: string;           // ISO 8601 timestamp
}
```

### Transaction Object

```typescript
interface Transaction {
  transaction_id: string;
  type: 'TRANSFER' | 'DEPOSIT' | 'WITHDRAWAL' | 'PAYMENT' | 'REFUND';
  amount: Money;
  debit_account: string;
  credit_account: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REVERSED';
  memo: string;
  posted_at: string;            // ISO 8601 timestamp
  metadata?: Record<string, any>;
}
```

### Money Object

```typescript
interface Money {
  value: number;      // Amount in cents
  currency: 'FXUSD';  // Always FauxUSD
}
```

## Rate Limits

Customer agents are typically limited to:

- **100 requests per minute**
- **20 burst requests per second**
- **10,000 transactions per day**

Monitor rate limit headers:

```typescript
function checkRateLimit(response: Response) {
  const limit = response.headers.get('X-RateLimit-Limit');
  const remaining = response.headers.get('X-RateLimit-Remaining');
  const reset = response.headers.get('X-RateLimit-Reset');
  
  console.log(`Rate limit: ${remaining}/${limit} remaining`);
  console.log(`Resets at: ${new Date(parseInt(reset!) * 1000)}`);
  
  if (parseInt(remaining!) < 10) {
    console.warn('Approaching rate limit!');
  }
}
```

## Support and Resources

- **fauxBank Repository**: https://github.com/CrazyDubya/fauxBank
- **API Documentation**: See FAUXBANK_ECOSYSTEM.md
- **Issues**: Report integration issues on the fauxCustomer repository

## Summary

fauxBank provides a complete banking simulation platform that fauxCustomer agents can use to:

1. **Open and manage accounts** (checking, savings, credit)
2. **Make payments and transfers** between accounts
3. **Process card transactions** for online shopping
4. **Track transaction history** and balances
5. **Test edge cases** with failure injection and time travel

By following this integration guide, your fauxCustomer agents can realistically simulate customer banking behaviors in a safe, controlled environment.

---

*For complete API specification and architectural details, see FAUXBANK_ECOSYSTEM.md*
