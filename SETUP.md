# Smart Stationery – run with login, payments and order tracking (Windows)

1. Install Node.js LTS from nodejs.org (version 18 or newer). No other installs are needed.
2. In the project folder, copy `.env.example` to `.env` and fill it in (see below). Never share `.env`.
3. Open the folder in VS Code, open the terminal (Ctrl+`) and run:  node server/server.js
4. Open http://localhost:3000 in your browser (do not double-click index.html any more).

## What you must create yourself (I cannot create keys for you)
- Email + password login works immediately (passwords are hashed with scrypt on the server).
- Google sign-in: console.cloud.google.com > APIs & Services > Credentials > Create OAuth client ID > Web application.
  Add http://localhost:3000 under Authorized JavaScript origins. Paste the client ID into GOOGLE_CLIENT_ID.
- Yahoo sign-in: developer.yahoo.com/apps > Create an app. Yahoo needs an https redirect URL
  https://YOUR-DOMAIN/api/auth/yahoo/callback (set BASE_URL to your https site; it will not work on plain http://localhost).
- Google Pay / PhonePe QR: set UPI_ID to your own UPI ID. Customers scan the QR, pay, then enter the UTR. UPI QR payments
  cannot be confirmed automatically without a payment gateway, so you check the UTR in your UPI app and mark the order paid.
- Cards: create a Razorpay account and use Test Mode keys in RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET. Card numbers are typed
  on Razorpay's page only; this site never sees them. Use live keys only after Razorpay approves your account.

## Orders and tracking
- Every order gets an ID like SS-261022-6D7FE4. Customers track it under "Track Order" with the ID + phone or email.
- Demo timeline (AUTO_TRACKING, on by default): Cash on Delivery orders are confirmed 2 minutes after ordering; UPI/card orders are
  confirmed as soon as payment is made. Then: Packed +5 min, Shipped +2 min, Out for delivery +2 min, Delivered +5 to 10 min.
- Demo UPI payment: on localhost any 12-digit UTR confirms the order. On a live https site the UTR is only recorded ("verifying")
  and you mark the order paid yourself. Set AUTO_TRACKING=0 to move orders by hand. PowerShell example (ADMIN_KEY from .env):
  Invoke-RestMethod -Method Patch http://localhost:3000/api/orders/SS-261022-6D7FE4/status -Headers @{"x-admin-key"="YOUR_KEY"} -ContentType "application/json" -Body '{"step":3,"paid":true}'
- Orders and users are saved in server/data/*.json (fine for a demo; use a real database before going live).
