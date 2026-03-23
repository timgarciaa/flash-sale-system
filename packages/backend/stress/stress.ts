const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const CONCURRENT_USERS = 500;

interface PurchaseResult {
  userId: string;
  status: 'success' | 'fail' | 'error';
  message?: string;
  latencyMs: number;
}

async function purchaseAttempt(userId: string): Promise<PurchaseResult> {
  const start = Date.now();
  try {
    const res = await fetch(`${BASE_URL}/api/sale/purchase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    const latencyMs = Date.now() - start;

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { userId, status: 'error', message: `HTTP ${res.status}: ${body.error || ''}`, latencyMs };
    }

    const body = await res.json();
    return {
      userId,
      status: body.success ? 'success' : 'fail',
      message: body.message,
      latencyMs,
    };
  } catch (err: any) {
    return { userId, status: 'error', message: err.message, latencyMs: Date.now() - start };
  }
}

async function main() {
  console.log(`\nStress test: ${CONCURRENT_USERS} concurrent users → ${BASE_URL}/api/sale/purchase`);
  console.log('Starting...\n');

  const users = Array.from({ length: CONCURRENT_USERS }, (_, i) => `user-${i}`);

  const wallStart = Date.now();
  const results = await Promise.all(users.map((u) => purchaseAttempt(u)));
  const wallMs = Date.now() - wallStart;

  const successes = results.filter((r) => r.status === 'success').length;
  const fails = results.filter((r) => r.status === 'fail').length;
  const httpErrors = results.filter((r) => r.status === 'error').length;

  const latencies = results.map((r) => r.latencyMs);
  const avgLatency = Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);
  const minLatency = Math.min(...latencies);
  const maxLatency = Math.max(...latencies);

  console.log(`Wall-clock time : ${wallMs}ms`);
  console.log(`Avg latency     : ${avgLatency}ms`);
  console.log(`Min latency     : ${minLatency}ms`);
  console.log(`Max latency     : ${maxLatency}ms`);
  console.log('');
  console.log(`Successes  : ${successes}`);
  console.log(`Fails      : ${fails}`);
  console.log(`HTTP errors: ${httpErrors}`);
  console.log('');

  if (httpErrors > 0) {
    const errorSample = results.filter((r) => r.status === 'error').slice(0, 3);
    console.error('Sample errors:', errorSample);
  }

  const EXPECTED_SUCCESSES = 100;
  const passed = successes === EXPECTED_SUCCESSES && httpErrors === 0;

  if (passed) {
    console.log(`PASS — Exactly ${EXPECTED_SUCCESSES} users purchased`);
    process.exit(0);
  } else {
    console.error(`FAIL — Expected ${EXPECTED_SUCCESSES} successes, got ${successes}. HTTP errors: ${httpErrors}`);
    process.exit(1);
  }
}

main();
