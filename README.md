# 7 Pharmaceuticals Mock Backend

This project now includes a simple mock backend for shared inventory and cart handling.

## Run the mock backend

1. Install dependencies:

```bash
npm install
```

2. Start the server:

```bash
npm start
```

3. Open the app in your browser:

- `http://localhost:3000/Index.html`

## What changed

- `server.js` provides shared inventory and per-session cart state
- `package.json` defines `express` and `cors`
- Frontend now fetches `/api/products` and calls `/api/cart/add`, `/api/cart/remove`, `/api/cart/checkout`, and `/api/cart`
- Session state is tracked using a generated `X-Session-Id`

## Notes

- The backend is in-memory only. Restarting the server resets inventory and sessions.
- This is a mock backend for development and shared stock simulation only.
