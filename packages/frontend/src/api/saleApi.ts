const BASE = '/api/sale';

export interface SaleStatus {
  status: 'upcoming' | 'active' | 'ended';
  stockRemaining: number;
  startTime: string;
  endTime: string;
}

export interface PurchaseResult {
  success: boolean;
  message: string;
  alreadyPurchased?: boolean;
}

export async function fetchStatus(): Promise<SaleStatus> {
  const res = await fetch(`${BASE}/status`);
  if (!res.ok) throw new Error('Failed to fetch sale status');
  return res.json();
}

export async function attemptPurchase(userId: string): Promise<PurchaseResult> {
  const res = await fetch(`${BASE}/purchase`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Purchase failed');
  return data;
}

export async function checkPurchase(userId: string): Promise<{ purchase: object | null }> {
  const res = await fetch(`${BASE}/purchase/${encodeURIComponent(userId)}`);
  if (!res.ok) throw new Error('Failed to check purchase');
  return res.json();
}
