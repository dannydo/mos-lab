async function testIosApi() {
  const url = 'http://192.168.139.33/1/staff/client-consultant/bonus';
  const body = {
    user_id: 37790,
    login_token: 'valid_token_37790',
    staff_user_id: 37790,
    client_store_id: 0,
    page: 1,
    date_from: '2026-07-01',
    date_to: '2026-07-31',
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Host: 'api.orb',
      },
      body: JSON.stringify(body),
    });
    console.log('iOS API Status:', res.status);
    const data: any = await res.json();
    console.log('iOS API Response Status:', data.status);
    if (data.data) {
      console.log('iOS API Response Data Keys:', Object.keys(data.data));
      if (data.data.booking) {
        console.log('iOS API Booking Count:', data.data.booking.data ? data.data.booking.data.length : 0);
        console.log('iOS API Booking Total:', data.data.booking.total || 0);
      }
      if (data.data.summary) {
        console.log('iOS API Summary:', data.data.summary);
      }
    } else {
      console.log('iOS API Response:', data);
    }
  } catch (e: any) {
    console.error('Error:', e.message);
  }
}

testIosApi();
