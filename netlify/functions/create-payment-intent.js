const stripe = require('stripe')('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');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { amount, name, email } = JSON.parse(event.body);

    if (!amount || amount < 50) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid amount' }) };
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount),
      currency: 'gbp',
      receipt_email: email,
      description: `Crossgate Campsite booking for ${name}`,
      metadata: { guest_name: name, guest_email: email }
    });

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientSecret: paymentIntent.client_secret })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: err.message })
    };
  }
};

