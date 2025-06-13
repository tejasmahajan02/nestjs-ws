# ⚡ NestJS WebSocket – Do’s & Don’ts Cheat Sheet

## 🔥 `handleConnection()` vs `@SubscribeMessage()`

### ❗ Error Handling in `handleConnection()`

* `WsException` **does not auto-emit** errors in `handleConnection()`.
* Unlike `@SubscribeMessage()`, the client won't receive any errors by default.

### ✅ To send an error to the client:

* 🔧 **Manually emit an error**
* 🛡️ **Or implement a custom exception filter**

---

## 🛑 Guards & Lifecycle Hooks

### ❌ Guards do **not** work on:

* `handleConnection(client: Socket)`
* `handleDisconnect(client: Socket)`

These are **lifecycle hooks**, not decorated handlers. So:

* **No guards**
* **No interceptors**
* **No pipes**
* **No filters**

### ✅ Guards do work on:

```ts
@UseGuards(MyWsGuard)
@SubscribeMessage('my-event')
handleMyEvent(@MessageBody() data: any) {
  // This goes through guard first ✅
}
```

---

## 🛡️ How to Protect `handleConnection()`?

### 🔐 Validate Auth Manually:

```ts
handleConnection(client: Socket) {
  const token = client.handshake.auth?.token || client.handshake.headers['authorization'];
  try {
    const payload = this.jwtService.verify(token);
    client.data.user = payload; // Attach user to socket context
  } catch {
    client.emit('error', { message: 'Unauthorized' });
    client.disconnect();
  }
}
```

---

## 📊 Feature Support Matrix

| Feature      | `@SubscribeMessage()` | `handleConnection()` |
| ------------ | --------------------- | -------------------- |
| Guards       | ✅ Yes                 | ❌ No                 |
| Filters      | ✅ Yes                 | ❌ No (emit manually) |
| Pipes        | ✅ Yes                 | ❌ No                 |
| Interceptors | ✅ Yes                 | ❌ No                 |

---

## ✅ Do's vs ❌ Don'ts

| ✅ **Do**                                                                                        | ❌ **Don't**                                                               |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Use `@UseGuards()` on `@SubscribeMessage()` handlers                                            | Don’t expect `@UseGuards()` to work in `handleConnection()`               |
| Throw `WsException` in `@SubscribeMessage()` to trigger client error handling                   | Don’t throw `WsException` in `handleConnection()` without manual emission |
| Manually validate auth in `handleConnection()` using handshake token or headers                 | Don’t rely on NestJS pipes, guards, or interceptors in lifecycle hooks    |
| Use `client.emit('error', {...})` + `client.disconnect()` to reject unauthenticated connections | Don’t assume client knows why it was disconnected                         |
| Store user data on `client.data` for use in other handlers                                      | Don’t skip backend verification—always validate on server side            |
| Use custom exception filters for consistent error formatting in message handlers                | Don’t expect default error formatting in raw socket lifecycle hooks       |
| DRY up your auth logic via a `GatewayAuthGuard` or helper utility                               | Don’t copy/paste token validation code into multiple places               |

---

## ⚙️ Quick Code Summary

```ts
// ✅ Good practice in handleConnection()
handleConnection(client: Socket) {
  try {
    const token = client.handshake.auth?.token;
    const user = this.jwtService.verify(token);
    client.data.user = user; // Attach to socket context
  } catch {
    client.emit('error', { message: 'Unauthorized' });
    client.disconnect();
  }
}

// ✅ Protected message handler
@UseGuards(WsAuthGuard)
@SubscribeMessage('some-event')
handleMessage(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
  // Guarded & safe
}
```