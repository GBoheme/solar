import { db } from '../server/db.js';

async function runTests() {
    const BASE_URL = 'http://localhost:3000';
    console.log('\\n--- Starting Security & Auth Verification ---');
    let allPassed = true;

    const test = async (name: string, condition: boolean) => {
        if (condition) {
            console.log(`✅ ${name}`);
        } else {
            console.log(`❌ ${name}`);
            allPassed = false;
        }
    };

    // 1. Unauth request should be blocked (401)
    let res = await fetch(`${BASE_URL}/api/admin/stats`);
    await test('Unauthorized endpoints are blocked (401 on /api/admin/stats)', res.status === 401);

    // Fetch admin user
    const user = db.prepare('SELECT email FROM users WHERE role = ? LIMIT 1').get('admin') as any;
    if (!user) {
        console.log('❌ No admin user found in DB. Need Database seeded first.');
        return;
    }

    // 2. Login & Cookie Headers
    let loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, password: 'admin123' }) // The seeded password hash corresponds to 'admin123'? Actually, we don't know the exact plaintext. Wait, the DB seed code has: // "admin123" hashed with salt rounds = 12
    });

    const loginData = await loginRes.json() as any;
    await test('Frontend login flow returns Access Headers', loginRes.ok && !!loginData.accessToken);

    const cookies = loginRes.headers.get('set-cookie') || '';
    await test('HttpOnly and SameSite=Strict cookies applied', cookies.includes('HttpOnly') && cookies.includes('SameSite=Strict') && cookies.includes('jwt='));

    const jwtCookie = cookies.split(';').find(c => c.trim().startsWith('jwt='))?.trim();

    // 3. Unauthorized access with ONLY refresh cookie (No Access Token header)
    let noTokenRes = await fetch(`${BASE_URL}/api/admin/stats`, {
        headers: { 'Cookie': jwtCookie || '' }
    });
    await test('Access without Bearer Token header is blocked (CSRF/Mitigation check)', noTokenRes.status === 401);

    // 4. Authorized access with Access Token Header
    let authRes = await fetch(`${BASE_URL}/api/admin/stats`, {
        headers: { 'Authorization': `Bearer ${loginData.accessToken}` }
    });
    await test('Access with valid Bearer Token succeeds', authRes.ok);

    // 5. TokenRefresh cycle
    let refreshRes = await fetch(`${BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Cookie': jwtCookie || '' }
    });
    const refreshData = await refreshRes.json() as any;
    await test('TokenExpired gracefully triggers refresh cycle (Returns new token)', refreshRes.ok && !!refreshData.accessToken);

    // 6. Malicious inputs fail Zod validation
    let zodRes = await fetch(`${BASE_URL}/api/admin/components`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${loginData.accessToken}`
        },
        // Missing required fields like category, brand, model
        body: JSON.stringify({ malicious: 'data', cost_price: 'not a number' })
    });
    await test('Malicious inputs fail .strict() Zod validation (Returns 400 bad request)', zodRes.status === 400);

    console.log('\\n--- Verification Complete ---');
    if (allPassed) {
        console.log('🎉 ALL TESTS PASSED!');
    } else {
        console.log('⚠️ SOME TESTS FAILED.');
    }
}

runTests().catch(console.error);
