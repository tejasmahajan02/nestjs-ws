### 🚀 1. Pass token via `auth` (recommended)

```javascript
const socket = io('http://localhost:3100', {
  auth: {
    token: 'your_jwt_token_here',
  },
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 2000,
  reconnectionDelayMax: 5000,
});
```
🔵 **Server-side access**:  
```javascript
const token = socket.handshake.auth.token;
```

✅ Safer. Not exposed in URL.  
✅ Best practice for real applications.

---

### 🚀 2. Pass token via `query` params

```javascript
const socket = io('http://localhost:3100', {
  query: {
    token: 'your_jwt_token_here',
  },
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 2000,
  reconnectionDelayMax: 5000,
});
```
🔵 **Server-side access**:  
```javascript
const token = socket.handshake.query.token;
```

⚠️ Visible in URL.  
⚠️ Less secure (but good for quick testing).

---

### 🚀 3. Pass token via **custom headers**  
(Note: This one needs a tiny trick because Socket.IO **does not** natively allow setting headers directly. You have to use the `transportOptions`.)

```javascript
const socket = io('http://localhost:3100', {
  transportOptions: {
    polling: {
      extraHeaders: {
        Authorization: `Bearer your_jwt_token_here`,
      }
    }
  },
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 2000,
  reconnectionDelayMax: 5000,
});
```
🔵 **Server-side access**:  
```javascript
const token = socket.handshake.headers.authorization; 
```
- You might need to split it like:
  ```javascript
  const token = socket.handshake.headers.authorization?.split(' ')[1];
  ```

⚡ This sends token inside HTTP headers during the initial `polling` phase (when WebSocket is **upgrading** from HTTP to WS).

---

### 📜 Quick Table:

| Method | How to Access | Notes |
|:------|:--------------|:------|
| `auth` | `socket.handshake.auth.token` | Best practice |
| `query` | `socket.handshake.query.token` | Quick and easy, but visible |
| `headers` | `socket.handshake.headers.authorization` | Custom, good when following REST standards |

---