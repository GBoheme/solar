import assert from 'assert';

/**
 * Run this script while the development server is running on port 3000:
 * npx tsx scripts/verify-unified-endpoints.ts
 * 
 * This test confirms that both the engineering mode and the workspace pricing mode
 * return the exact same unified pricing, battery configurations, and payment options.
 */

async function run() {
  console.log('Testing unified calculation endpoints...');

  const BASE_URL = 'http://localhost:3000';

  // 1. Engineering Mode Payload
  const engPayload = {
    appliances: [
      { id: '1', name: 'TV', watts: 100, qty: 1, hours_daily: 5, surge_factor: 1, type: 'electronics' }
    ],
    region: { name: 'Baghdad', sun_hours: 5.5, temp_coefficient: 0.85 },
    systemType: 'hybrid',
    gridHoursOff: 12,
    advancedSettings: { safety_margin: 1.25 }
  };

  // 2. Workspace Mode Payload (Adapted from engPayload to match workspace expectations)
  const workspacePayload = {
    config: {
      systemType: 'hybrid',
      systemVoltage: 24, // Assuming 24V for small system, though backend calculates it anyway
      regionSunHours: 5.5,
      autonomyHours: 12,
      lossFactor: 0.85,
      inverterEfficiency: 0.95
    },
    loads: [
      { id: '1', name: 'TV', watts: 100, qty: 1, hoursPerDay: 5, surgeFactor: 1 }
    ],
    selectedComponents: {}, // Let the backend auto-select
    isCalculating: true
  };

  try {
    // Fetch from Eng Mode Endpoint
    const res1 = await fetch(`${BASE_URL}/api/calculate-recommendation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(engPayload)
    });
    
    if (!res1.ok) throw new Error(`Eng API failed: ${res1.statusText}`);
    const engResult = await res1.json();

    // Fetch from Workspace Endpoint
    const res2 = await fetch(`${BASE_URL}/api/workspace/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(workspacePayload)
    });

    if (!res2.ok) throw new Error(`Workspace API failed: ${res2.statusText}`);
    const wsResult = await res2.json();

    // -- ASSERTS --
    
    // Check structural existence
    assert(engResult.pricing, 'Engineering result is missing pricing breakdown');
    assert(engResult.payment_options, 'Engineering result is missing payment options');
    assert(wsResult.pricing, 'Workspace result is missing pricing breakdown');
    assert(wsResult.payment_options, 'Workspace result is missing payment options');

    // Check pricing equivalence
    assert.strictEqual(
      engResult.pricing.sale_price_usd,
      wsResult.pricing.sale_price_usd,
      `Price mismatch! Eng: ${engResult.pricing.sale_price_usd}, WS: ${wsResult.pricing.sale_price_usd}`
    );

    // Check payment options equivalence
    assert.strictEqual(
      engResult.payment_options.cash.final_total_usd,
      wsResult.payment_options.cash.final_total_usd,
      `Cash discount total mismatch! Eng: ${engResult.payment_options.cash.final_total_usd}, WS: ${wsResult.payment_options.cash.final_total_usd}`
    );

    assert.strictEqual(
      engResult.payment_options.installments.monthly_payment_iqd,
      wsResult.payment_options.installments.monthly_payment_iqd,
      `Installment monthly UI mismatch!`
    );

    // Check battery string equivalence
    assert.strictEqual(
      engResult.engineering.battery_bank.total_battery_count,
      wsResult.engineering.battery_bank.total_battery_count,
      `Battery count mismatch!`
    );

    console.log('✅ SUCCESS: Both endpoints are unified and return identical calculation results, pricing, and payment options for the same load.');
    
  } catch (error: any) {
    if (error.cause && error.cause.code === 'ECONNREFUSED') {
      console.log('⚠️ Server not running. Please run `npm run dev` in another terminal to execute this test.');
    } else {
      console.error('❌ FAILED:', error.message);
      process.exit(1);
    }
  }
}

run();
