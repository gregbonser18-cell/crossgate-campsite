const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try {
    const { amount, guests, checkIn, checkOut, name, email } = JSON.parse(event.body);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'gbp',
          product_data: {
            name: `Crossgate Campsite — ${guests} guest(s)`,
            description: `Check in: ${checkIn} | Check out: ${checkOut}`,
          },
          unit_amount: amount,
        },
        quantity: 1,
      }],
      mode: 'payment',
      customer_email: email,
      metadata: { name, email, checkIn, checkOut, guests },
      success_url: `${process.env.URL}/booking-confirmed.html`,
      cancel_url: `${process.env.URL}/#booking`,
    });

    // Write booking to Google Sheet
    const ref = 'CG-' + Date.now();
    const params = new URLSearchParams({
      ref,
      name: name || '',
      email: email || '',
      checkIn: checkIn || '',
      checkOut: checkOut || '',
      guests: guests || '',
      amount: '£' + (amount / 100).toFixed(2),
      payment: 'online',
      status: 'pending'
    });
   const sheetRes = await fetch(`${process.env.APPS_SCRIPT_URL}?${params.toString()}`);
console.log('Sheet URL:', process.env.APPS_SCRIPT_URL);
console.log('Sheet response:', sheetRes.status);

    return {
      statusCode: 200,
      body: JSON.stringify({ sessionId: session.id, url: session.url }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
