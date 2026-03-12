async function runTests() {
    const BASE_URL = 'http://127.0.0.1:3000';
    console.log('\\n--- Starting Security & Auth Verification ---');
    let allPassed = true;

    const test = (name, condition) => {
        if (condition) {
            console.log(`✅ ${name}`);
        } else {
            console.log(`❌ ${name}`);
            allPassed = false;
        }
    };

    try {
        // 1. Unauth request should be blocked (401)
        let res = await fetch(`${BASE_URL}/api/admin/stats`);
        test('Unauthorized endpoints are blocked (401)', res.status === 401);

        // 2. Login & Cookie Headers
        let loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@solar.test', password: 'admin123' })
        });

        const loginData = await loginRes.json();
        test('Frontend login flow returns Access Headers', loginRes.ok && !!loginData.accessToken);

        const cookies = loginRes.headers.get('set-cookie') || '';
        test('HttpOnly and SameSite=Strict cookies applied', cookies.includes('HttpOnly') && cookies.includes('SameSite=Strict') && cookies.includes('jwt='));

        const jwtCookie = cookies.split(';').find(c => c.trim().startsWith('jwt='))?.trim();

        // 3. Unauthorized access with ONLY refresh cookie (No Access Token header)
        let noTokenRes = await fetch(`${BASE_URL}/api/admin/stats`, {
            headers: { 'Cookie': jwtCookie || '' }
        });
        test('Access without Bearer Token header is blocked (CSRF/Mitigation check)', noTokenRes.status === 401);

        // 4. Authorized access with Access Token Header
        let authRes = await fetch(`${BASE_URL}/api/admin/stats`, {
            headers: { 'Authorization': `Bearer ${loginData.accessToken}` }
        });
        test('Access with valid Bearer Token succeeds', authRes.ok);

        // 5. TokenRefresh cycle
        let refreshRes = await fetch(`${BASE_URL}/api/auth/refresh`, {
            method: 'POST',
            headers: { 'Cookie': jwtCookie || '' }
        });
        if (refreshRes.ok) {
            const refreshData = await refreshRes.json();
            test('TokenExpired gracefully triggers refresh cycle (Returns new token)', !!refreshData.accessToken);
        } else {
            test('TokenExpired gracefully triggers refresh cycle (Returns new token)', false);
        }

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
        test('Malicious inputs fail .strict() Zod validation', zodRes.status === 400);
        if (zodRes.status !== 400) {
            console.log(`Expected 400, got ${zodRes.status} for Zod validation test:`, await zodRes.text());
        }

    } catch (err) {
        console.error('Test Execution Error:', err);
        allPassed = false;
    }

    console.log('\\n--- Verification Complete ---');
    if (allPassed) {
        console.log('🎉 ALL TESTS PASSED!');
    } else {
        console.log('⚠️ SOME TESTS FAILED.');
    }
}

runTests().catch(console.error);
