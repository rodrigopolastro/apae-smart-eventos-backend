const express = require('express');
const router = express.Router();

// Stripe SDK will be required when STRIPE_SECRET_KEY is configured
let Stripe = null;
try {
  Stripe = require('stripe');
} catch (err) {
  // stripe not installed, will surface error at runtime
}

/**
 * POST /payments/create-checkout-session
 * Body expected:
 * {
 *   items: [ { name, description, amount, currency, quantity } ]
 * }
 * OR
 * {
 *   totalAmount: number, // in cents
 *   currency: 'brl' | 'usd' ...
 *   description?: string
 * }
 *
 * Returns: { url }
 */
router.post('/create-checkout-session', async (req, res) => {
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return res.status(500).json({ message: 'Stripe secret key not configured (STRIPE_SECRET_KEY).' });
    }

    if (!Stripe) {
      return res.status(500).json({ message: 'Stripe package not installed. Run `npm install stripe`.' });
    }

    const stripe = Stripe(stripeKey);

    const { items, totalAmount, currency = 'brl', successUrl, cancelUrl } = req.body;

    let line_items = [];

    if (Array.isArray(items) && items.length > 0) {
      line_items = items.map((it) => ({
        price_data: {
          currency: it.currency || currency,
          product_data: {
            name: it.name || 'Ingresso',
            description: it.description || undefined,
          },
          unit_amount: Math.round(Number(it.amount)), // expects cents
        },
        quantity: Number(it.quantity) || 1,
      }));
    } else if (typeof totalAmount === 'number' && totalAmount > 0) {
      line_items = [
        {
          price_data: {
            currency,
            product_data: { name: req.body.description || 'Compra de ingressos' },
            unit_amount: Math.round(totalAmount),
          },
          quantity: 1,
        },
      ];
    } else {
      return res.status(400).json({ message: 'Payload inválido. Envie `items` ou `totalAmount`.' });
    }

    // Fallback URLs (should be provided by client)
    const success = successUrl || 'https://example.com/success';
    const cancel = cancelUrl || 'https://example.com/cancel';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items,
      success_url: success + '?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: cancel,
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Stripe create session error:', error);
    res.status(500).json({ message: 'Erro ao criar sessão de pagamento.', details: error.message });
  }
});

module.exports = router;
//pag