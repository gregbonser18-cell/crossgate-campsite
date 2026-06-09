// Records a "cash on arrival" reservation into the Google Sheet via the
// deployed Apps Script web app. Online (card) bookings are recorded by
// create-payment-intent.js; this handles the cash path, which never touches
// Stripe.
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const url = process.env.APPS_SCRIPT_URL;
  if (!url) {
    return { statusCode: 200, body: JSON.stringify({ logged: false }) };
  }

  try {
    const {
      ref,
      name,
      email,
      arrival,
      departure,
      nights,
      adults,
      youngAdults,
      amount,
    } = JSON.parse(event.body);

    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        ref,
        name,
        email,
        arrival,
        departure,
        nights,
        adults,
        youngAdults,
        amount,
        payment: 'cash',
        status: 'reserved',
      }),
    });

    return { statusCode: 200, body: JSON.stringify({ logged: true }) };
  } catch (err) {
    // Never fail the booking just because logging failed.
    console.error('Failed to log cash booking to Google Sheet:', err.message);
    return { statusCode: 200, body: JSON.stringify({ logged: false }) };
  }
};
