async function checkAllIosEndpoints() {
  const staffId = 37790;
  const dateFrom = '2026-07-01';
  const dateTo = '2026-07-31';

  console.log('=== CHECKING ALL iOS APP API ENDPOINTS FOR CC DIỄM HƯƠNG (JULY 2026) ===\n');

  // Endpoint 1: staff/client-consultant/bonus
  try {
    let totalCash = 0;
    let page = 1;
    let totalPages = 1;
    let count = 0;

    do {
      const res = await fetch('http://192.168.139.33/1/staff/client-consultant/bonus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Host: 'api.orb' },
        body: JSON.stringify({
          user_id: staffId,
          login_token: 'valid_token_37790',
          staff_user_id: staffId,
          client_store_id: 0,
          page: page,
          date_from: dateFrom,
          date_to: dateTo,
        }),
      });

      const data: any = await res.json();
      if (data.status === 'success' && data.data?.booking?.data) {
        const items = data.data.booking.data;
        count += items.length;
        totalPages = Math.ceil((data.data.booking.page.total || 0) / (data.data.booking.page.limit || 50));

        for (const item of items) {
          if (item.staff_bonus && item.staff_bonus.Cash) {
            totalCash += Number(item.staff_bonus.Cash.bonus_amount || 0);
          }
        }
      }
      page++;
    } while (page <= totalPages);

    console.log(`1. POST staff/client-consultant/bonus:`);
    console.log(`   - Items returned: ${count}`);
    console.log(`   - Total Bonus Vòng Xoay (Cash): ${totalCash.toLocaleString('vi-VN')} VNĐ`);
  } catch (e: any) {
    console.error('Endpoint 1 error:', e.message);
  }

  // Endpoint 2: report/daily/summary/client-consultant
  try {
    const res = await fetch('http://192.168.139.33/1/report/daily/summary/client-consultant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Host: 'api.orb' },
      body: JSON.stringify({
        user_id: staffId,
        login_token: 'valid_token_37790',
        staff_user_id: staffId,
        date_from: dateFrom,
        date_to: dateTo,
      }),
    });
    const data: any = await res.json();
    console.log(`\n2. POST report/daily/summary/client-consultant:`);
    console.log(`   - Status: ${data.status}`);
    console.log(`   - Response Data:`, JSON.stringify(data.data, null, 2));
  } catch (e: any) {
    console.error('Endpoint 2 error:', e.message);
  }

  // Endpoint 3: staff/client-consultant/report
  try {
    const res = await fetch('http://192.168.139.33/1/staff/client-consultant/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Host: 'api.orb' },
      body: JSON.stringify({
        user_id: staffId,
        login_token: 'valid_token_37790',
        staff_user_id: staffId,
        date_from: dateFrom,
        date_to: dateTo,
      }),
    });
    const data: any = await res.json();
    console.log(`\n3. POST staff/client-consultant/report:`);
    console.log(`   - Status: ${data.status}`);
    console.log(`   - Response Data:`, JSON.stringify(data.data, null, 2));
  } catch (e: any) {
    console.error('Endpoint 3 error:', e.message);
  }
}

checkAllIosEndpoints();
