// Comprehensive security and regression test suite for PassLoyal OS
const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('--- Starting PassLoyal OS Security & Endpoint Test Suite ---\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, testName, detail = '') {
    if (condition) {
      console.log(`PASS: ${testName}`);
      passed++;
    } else {
      console.error(`FAIL: ${testName} - ${detail}`);
      failed++;
    }
  }

  try {
    // 1. Health check & Tenant Public Profile
    const tenantRes = await fetch(`${BASE_URL}/api/public/tenants/banlis`);
    assert(tenantRes.status === 200, 'Public Tenant Profile (banlis) returns HTTP 200');
    const tenantData = await tenantRes.json();
    assert(tenantData?.name === 'Banlis Coffee & Bakery', 'Tenant name matches expected Banlis profile');

    // 2. SEC-01 Test: Arbitrary Initial Points Injection Prevention
    console.log('\n[Test SEC-01] Public Enrollment Points Injection:');
    const testEmail = `sec_test_${Date.now()}@otech.space`;
    const enrollPayload = {
      name: 'Security Test User',
      email: testEmail,
      phone: '+962791112233',
      initialPoints: 999999, // Exploit payload: attempting to award 999,999 points
    };

    const enrollRes = await fetch(`${BASE_URL}/api/tenants/banlis/enroll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(enrollPayload),
    });

    assert(enrollRes.status === 200 || enrollRes.status === 201, `Enrollment POST returns HTTP ${enrollRes.status} (Created/OK)`);
    const enrollData = await enrollRes.json();
    const awardedPoints = enrollData?.member?.points ?? enrollData?.points;
    const memberCode = enrollData?.member?.memberId || enrollData?.memberId || enrollData?.qr;
    const applePassUrl = enrollData?.applePassUrl || enrollData?.appleWalletUrl;

    assert(
      awardedPoints !== 999999,
      'SEC-01: Injected 999,999 points was rejected/ignored',
      `Member awarded points: ${awardedPoints}`
    );
    assert(
      awardedPoints === 100 || awardedPoints === 0,
      'SEC-01: Points awarded strictly conforms to tenant program config (welcome bonus 100 PTS)',
      `Actual: ${awardedPoints}`
    );

    // 3. SEC-04 Test: Apple Pass Endpoint Signed URL & PII Masking
    console.log('\n[Test SEC-04] Apple Pass PII Masking & Signature Verification:');
    assert(Boolean(applePassUrl), 'Apple Pass URL returned in enrollment response');
    assert(applePassUrl.includes('sig='), 'SEC-04: Apple Pass URL contains HMAC signature token (?sig=...)');

    // Fetch WITH valid signature token
    const signedPassRes = await fetch(`${BASE_URL}${applePassUrl}`);
    assert(signedPassRes.status === 200, 'PassKit request with signature returns HTTP 200');
    const signedPass = await signedPassRes.json();
    const signedPhoneField = signedPass?.storeCard?.backFields?.find(f => f.key === 'phone')?.value;
    const signedCardholder = signedPass?.storeCard?.auxiliaryFields?.find(f => f.key === 'cardholder')?.value;
    assert(signedPhoneField === '+962791112233', 'Authorized pass displays full unmasked customer phone');
    assert(signedCardholder === 'Security Test User', 'Authorized pass displays full cardholder name');

    // Fetch WITHOUT signature (unauthenticated scraping simulation)
    const unsignedUrl = `/api/passes/apple/${encodeURIComponent(memberCode)}`;
    const unauthPassRes = await fetch(`${BASE_URL}${unsignedUrl}`);
    assert(unauthPassRes.status === 200, 'Unauthenticated pass query resolves without crash');
    const unauthPass = await unauthPassRes.json();
    const unauthPhoneField = unauthPass?.storeCard?.backFields?.find(f => f.key === 'phone')?.value;
    const unauthCardholder = unauthPass?.storeCard?.auxiliaryFields?.find(f => f.key === 'cardholder')?.value;

    assert(
      unauthPhoneField !== '+962791112233' && unauthPhoneField.includes('****'),
      'SEC-04: Unauthenticated phone number is properly masked (+962****2233)',
      `Actual unauth phone: ${unauthPhoneField}`
    );
    assert(
      unauthCardholder !== 'Security Test User' && unauthCardholder.includes('***'),
      'SEC-04: Unauthenticated cardholder name is masked (Security ***)',
      `Actual unauth cardholder: ${unauthCardholder}`
    );

    // 4. Baseline Security Headers Verification
    console.log('\n[HTTP Baseline Security Headers]:');
    assert(
      signedPassRes.headers.get('x-content-type-options') === 'nosniff',
      'X-Content-Type-Options: nosniff header present'
    );
    assert(
      signedPassRes.headers.get('x-frame-options') === 'DENY',
      'X-Frame-Options: DENY header present'
    );

  } catch (err) {
    console.error('Fatal test execution error:', err);
    failed++;
  }

  console.log(`\n========================================`);
  console.log(`Test Results: ${passed} passed, ${failed} failed`);
  console.log(`========================================`);
}

runTests();
