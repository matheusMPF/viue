import { writeFile } from 'node:fs/promises';

const target = await (
  await fetch('http://127.0.0.1:9225/json/new?http://localhost:3000', { method: 'PUT' })
).json();
const socket = new WebSocket(target.webSocketDebuggerUrl);
const pending = new Map();
let nextId = 1;

await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true });
  socket.addEventListener('error', reject, { once: true });
});

function send(method, params = {}) {
  const id = nextId++;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  if (message.method === 'Fetch.requestPaused') {
    const body = Buffer.from(
      JSON.stringify({
        success: false,
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Seu e-mail ainda não foi verificado.',
        requiresVerification: true,
      }),
    ).toString('base64');
    void send('Fetch.fulfillRequest', {
      requestId: message.params.requestId,
      responseCode: 403,
      responseHeaders: [{ name: 'Content-Type', value: 'application/json' }],
      body,
    });
    return;
  }
  const request = pending.get(message.id);
  if (!request) return;
  pending.delete(message.id);
  if (message.error) request.reject(new Error(message.error.message));
  else request.resolve(message.result);
});

async function evaluate(expression) {
  const result = await send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  return result.result.value;
}

await send('Page.enable');
await send('Runtime.enable');
await send('Fetch.enable', {
  patterns: [{ urlPattern: '*api/auth/login', requestStage: 'Request' }],
});
await send('Emulation.setDeviceMetricsOverride', {
  width: 1366,
  height: 768,
  deviceScaleFactor: 1,
  mobile: false,
});
await send('Page.navigate', { url: 'http://localhost:3000' });

for (let attempt = 0; attempt < 100; attempt += 1) {
  const ready = await evaluate(
    "document.readyState === 'complete' && Boolean(document.querySelector('.auth-form'))",
  );
  if (ready) break;
  await new Promise((resolve) => setTimeout(resolve, 50));
}
await new Promise((resolve) => setTimeout(resolve, 700));

await evaluate(`(() => {
  const setValue = (input, value) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  };
  setValue(document.querySelector('input[name="email"]'), 'pendente@exemplo.com');
  setValue(document.querySelector('input[name="password"]'), 'senha-de-teste');
  document.querySelector('.auth-form').requestSubmit();
})()`);

let result;
for (let attempt = 0; attempt < 100; attempt += 1) {
  result = await evaluate(`(() => ({
    heading: document.querySelector('.auth-heading h2')?.textContent,
    toastTitle: document.querySelector('.toast-content strong')?.textContent,
    toastDescription: document.querySelector('.toast-content p')?.textContent,
    pageHeight: document.documentElement.scrollHeight,
    viewportHeight: innerHeight,
  }))()`);
  if (result.heading === 'Confira seu e-mail' && result.toastTitle) break;
  await new Promise((resolve) => setTimeout(resolve, 50));
}

const screenshot = await send('Page.captureScreenshot', { format: 'png', fromSurface: true });
await writeFile('pending-login-check.png', Buffer.from(screenshot.data, 'base64'));
console.log(JSON.stringify(result, null, 2));
socket.close();
