// const express = require('express');
// const router = express.Router();

// // Stripe SDK will be required when STRIPE_SECRET_KEY is configured
// let Stripe = null;
// try {
//   Stripe = require('stripe');
// } catch (err) {
//   // stripe not installed, will surface error at runtime
// }

// /**
//  * POST /payments/create-checkout-session
//  * Body expected:
//  * {
//  *   items: [ { name, description, amount, currency, quantity } ]
//  * }
//  * OR
//  * {
//  *   totalAmount: number, // in cents
//  *   currency: 'brl' | 'usd' ...
//  *   description?: string
//  * }
//  *
//  * Returns: { url }
//  */
// router.post('/create-checkout-session', async (req, res) => {
//   try {
//     const stripeKey = process.env.STRIPE_SECRET_KEY;
//     if (!stripeKey) {
//       return res.status(500).json({ message: 'Stripe secret key not configured (STRIPE_SECRET_KEY).' });
//     }

//     if (!Stripe) {
//       return res.status(500).json({ message: 'Stripe package not installed. Run `npm install stripe`.' });
//     }

//     const stripe = Stripe(stripeKey);

//     const { items, totalAmount, currency = 'brl', successUrl, cancelUrl } = req.body;

//     let line_items = [];

//     if (Array.isArray(items) && items.length > 0) {
//       line_items = items.map((it) => ({
//         price_data: {
//           currency: it.currency || currency,
//           product_data: {
//             name: it.name || 'Ingresso',
//             description: it.description || undefined,
//           },
//           unit_amount: Math.round(Number(it.amount)), // expects cents
//         },
//         quantity: Number(it.quantity) || 1,
//       }));
//     } else if (typeof totalAmount === 'number' && totalAmount > 0) {
//       line_items = [
//         {
//           price_data: {
//             currency,
//             product_data: { name: req.body.description || 'Compra de ingressos' },
//             unit_amount: Math.round(totalAmount),
//           },
//           quantity: 1,
//         },
//       ];
//     } else {
//       return res.status(400).json({ message: 'Payload inválido. Envie `items` ou `totalAmount`.' });
//     }

//     // Fallback URLs (should be provided by client)
//     const success = successUrl || 'https://example.com/success';
//     const cancel = cancelUrl || 'https://example.com/cancel';

//     const session = await stripe.checkout.sessions.create({
//       payment_method_types: ['card'],
//       mode: 'payment',
//       line_items,
//       success_url: success + '?session_id={CHECKOUT_SESSION_ID}',
//       cancel_url: cancel,
//     });

//     res.json({ url: session.url });
//   } catch (error) {
//     console.error('Stripe create session error:', error);
//     res.status(500).json({ message: 'Erro ao criar sessão de pagamento.', details: error.message });
//   }
// });

// module.exports = router;
// //pag

// 

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
 * Cria uma sessão de Checkout do Stripe e retorna a URL de redirecionamento.
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

    const { 
      items, 
      totalAmount, 
      currency = 'brl', 
      successUrl, 
      cancelUrl, 
      metadata = {} 
    } = req.body;

    let line_items = [];

    if (Array.isArray(items) && items.length > 0) {
      line_items = items.map((it) => ({
        price_data: {
          currency: it.currency || currency,
          product_data: {
            name: it.name || 'Ingresso',
            description: it.description || undefined,
          },
          unit_amount: Math.round(Number(it.amount)), 
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

    // Usa as URLs enviadas pelo cliente ou um fallback seguro.
    const success = successUrl || 'https://example.com/success';
    const cancel = cancelUrl || 'https://example.com/cancel';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items,
      metadata: metadata, 
      // A Stripe anexa o session_id automaticamente ao redirecionar.
      success_url: success,
      cancel_url: cancel,
    } );

    res.json({ url: session.url });
  } catch (error) {
    console.error('Stripe create session error:', error);
    res.status(500).json({ message: 'Erro ao criar sessão de pagamento.', details: error.message });
  }
});


// ==================================================================
// NOVA ROTA ADICIONADA PARA LIDAR COM O REDIRECIONAMENTO DE SUCESSO
// ==================================================================
/**
 * GET /payments/payment-success
 * Rota para onde a Stripe redireciona o usuário após um pagamento bem-sucedido.
 * Apenas exibe uma mensagem de sucesso em HTML.
 */
router.get('/payment-success', (req, res) => {
  const sessionId = req.query.session_id;
  console.log(`Pagamento recebido com sucesso! Session ID: ${sessionId}`);

  // Envia uma página HTML simples como resposta.
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Sucesso no Pagamento</title>
      <style>
        body { display: flex; justify-content: center; align-items: center; height: 100vh; font-family: Arial, sans-serif; background-color: #f0f2f5; color: #333; margin: 0; }
        .container { text-align: center; padding: 40px; background-color: white; border-radius: 10px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
        h1 { color: #28a745; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Pagamento Aprovado!</h1>
        <p>Sua compra foi concluída com sucesso.</p>
        <p><strong>Você já pode fechar esta janela e voltar para o seu aplicativo.</strong></p>
      </div>
    </body>
    </html>
  `);
});


// ==================================================================
// NOVA ROTA ADICIONADA PARA LIDAR COM O REDIRECIONAMENTO DE CANCELAMENTO
// ==================================================================
/**
 * GET /payments/payment-cancel
 * Rota para onde a Stripe redireciona o usuário se ele cancelar o pagamento.
 */
router.get('/payment-cancel', (req, res) => {
  console.log('Pagamento cancelado pelo usuário.');

  res.status(400).send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Pagamento Cancelado</title>
      <style>
        body { display: flex; justify-content: center; align-items: center; height: 100vh; font-family: Arial, sans-serif; background-color: #f0f2f5; color: #333; margin: 0; }
        .container { text-align: center; padding: 40px; background-color: white; border-radius: 10px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
        h1 { color: #dc3545; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Pagamento Cancelado</h1>
        <p>O processo de pagamento foi cancelado.</p>
        <p><strong>Você pode fechar esta janela e tentar novamente no aplicativo.</strong></p>
      </div>
    </body>
    </html>
  `);
});


// Exporta o router com todas as rotas configuradas.
module.exports = router;
