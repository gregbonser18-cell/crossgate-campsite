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

    const ref = 'CG-' + Date.now();
    await fetch('https://formspree.io/f/mdavzqvo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ref,
        name,
        email,
        checkIn,
        checkOut,
        guests,
        amount: '£' + (amount / 100).toFixed(2),
        payment: 'online',
        status: 'pending'
      })
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ sessionId: session.id, url: session.url }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};