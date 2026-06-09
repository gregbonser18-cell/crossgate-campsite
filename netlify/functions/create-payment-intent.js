const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Append a booking row to the Google Sheet via the deployed Apps Script web app.
// Failures here must never block the booking, so everything is wrapped in try/catch.
async function logToSheet(record) {
  const url = process.env.APPS_SCRIPT_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    });
  } catch (err) {
    console.error('Failed to log booking to Google Sheet:', err.message);
  }
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try {
    const {
      amount,
      name,
      email,
      arrival,
      departure,
      nights,
      adults,
      youngAdults,
      ref,
    } = JSON.parse(event.body);

    const guests = (adults || 0) + (youngAdults || 0);
    const bookingRef = ref || 'CG-' + Date.now();

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'gbp',
          product_data: {
            name: `Crossgate Campsite — ${guests} guest(s)`,
            description: `Check in: ${arrival} | Check out: ${departure}`,
          },
          unit_amount: amount,
        },
        quantity: 1,
      }],
      mode: 'payment',
      customer_email: email,
      metadata: { ref: bookingRef, name, email, arrival, departure, guests },
      success_url: `${process.env.URL}/booking-confirmed.html`,
      cancel_url: `${process.env.URL}/#booking`,
    });

    await logToSheet({
      timestamp: new Date().toISOString(),
      ref: bookingRef,
      name,
      email,
      arrival,
      departure,
      nights,
      adults,
      youngAdults,
      amount: '£' + (amount / 100).toFixed(2),
      payment: 'online',
      status: 'pending payment',
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ sessionId: session.id, url: session.url }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
