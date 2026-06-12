import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Server-side pack definitions — the client only sends a pack name,
// never a price or credit amount, so it can't be tampered with.
const CREDIT_PACKS = {
  starter: {
    priceId: 'price_1ThLEpQOsoMQrPgCnV1owEAo', // $5
    credits: 50,
  },
  creator: {
    priceId: 'price_1ThLEkQOsoMQrPgCp5U5OhuI', // $15
    credits: 200,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { pack, userId } = req.body;

    const selected = CREDIT_PACKS[pack];
    if (!selected) {
      return res.status(400).json({ error: 'Invalid credit pack' });
    }
    if (!userId) {
      return res.status(400).json({ error: 'Missing user' });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: selected.priceId, quantity: 1 }],
      success_url: 'https://revaultai.com/?credits=success',
      cancel_url: 'https://revaultai.com/?credits=cancelled',
      metadata: {
        type: 'credit_purchase',
        user_id: userId,
        credits: String(selected.credits),
      },
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('buy-credits error:', err);
    return res.status(500).json({ error: 'Could not start checkout' });
  }
}