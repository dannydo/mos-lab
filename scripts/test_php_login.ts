async function testLogin() {
  const loginUrl = 'http://192.168.139.33/1/public/user/login';

  try {
    const res = await fetch(loginUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Host: 'api.orb',
      },
      body: JSON.stringify({ email: 'diemhuong', password: '1' }),
    });
    console.log('Status:', res.status);
    const text = await res.text();
    console.log('Response text:', text);
  } catch (e: any) {
    console.log(`Error: ${e.message}`);
  }
}

testLogin();
