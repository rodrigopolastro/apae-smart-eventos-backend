// 1. INÍCIO DO ARQUIVO: Importa o Express e declara o 'router' UMA ÚNICA VEZ.
const express = require('express');
const router = express.Router();

// 2. Tenta importar o Stripe, tratando o erro se não estiver instalado.
let Stripe = null;
try {
  Stripe = require('stripe');
} catch (err) {
  // O erro será tratado dentro da rota se o Stripe não for encontrado.
}

// 3. ROTA POST: Para criar a sessão de pagamento.
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
    const { totalAmount, currency = 'brl', successUrl, cancelUrl, description } = req.body;

    if (typeof totalAmount !== 'number' || totalAmount <= 0) {
      return res.status(400).json({ message: 'Payload inválido. O `totalAmount` deve ser um número positivo.' });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: currency,
          product_data: {
            name: description || 'Compra de ingressos',
          },
          unit_amount: Math.round(totalAmount), // Espera valor em centavos
        },
        quantity: 1,
      }],
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    res.json({ url: session.url });

  } catch (error) {
    console.error('Stripe create session error:', error);
    res.status(500).json({ message: 'Erro ao criar sessão de pagamento.', details: error.message });
  }
});

// 4. ROTA GET: Para a página de sucesso.
router.get('/payment-success', (req, res) => {
  const sessionId = req.query.session_id;
  console.log(`Pagamento recebido com sucesso! Session ID: ${sessionId}`);
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

// 5. ROTA GET: Para a página de cancelamento.
router.get('/payment-cancel', (req, res) => {
  console.log('Pagamento cancelado pelo usuário.');
  res.send(`
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
        <p>O processo de pagamento foi interrompido.</p>
        <p><strong>Você pode fechar esta janela e tentar novamente no aplicativo.</strong></p>
      </div>
    </body>
    </html>
  `);
});

// 6. FIM DO ARQUIVO: Exporta o 'router' com todas as rotas anexadas.
module.exports = router;
