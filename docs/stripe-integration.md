Stripe integration
==================

Setup
-----

1. Install the stripe package:

   npm install stripe

2. Set your Stripe secret key in environment variable `STRIPE_SECRET_KEY` (use test key during development). Example (PowerShell):

   $env:STRIPE_SECRET_KEY = 'sk_test_...'

Endpoint
--------

POST /payments/create-checkout-session

Payload options:

- items: array of objects. Each item must include `amount` in cents, `currency`, `quantity` and `name`.
  Example:

  {
    "items": [
      { "name": "Ingresso Pista", "amount": 5000, "currency": "brl", "quantity": 2 },
      { "name": "Ingresso VIP", "amount": 12000, "currency": "brl", "quantity": 1 }
    ],
    "successUrl": "http://localhost:8081/payment-success",
    "cancelUrl": "http://localhost:8081/payment-cancel"
  }

- Or use totalAmount (in cents):

  {
    "totalAmount": 22000,
    "currency": "brl",
    "description": "Compra de ingressos"
  }

Response:

  { "url": "https://checkout.stripe.com/pay/...." }

Notes
-----

- The route uses Stripe Checkout and redirects users to Stripe-hosted payment pages.
- Make sure to supply `successUrl` and `cancelUrl` pointing to your frontend so you can show confirmation.
- Use Stripe test keys for development. For production, use live keys and secure them.
