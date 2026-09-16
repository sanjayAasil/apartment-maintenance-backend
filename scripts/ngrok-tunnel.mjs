import { spawn } from 'node:child_process';

const port = (process.env.PORT ?? '3000').trim();
if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535) {
  throw new Error(`Invalid PORT value: ${port}`);
}

const args = ['http', `http://localhost:${port}`];
const requestedUrl = process.env.NGROK_URL?.trim();
if (requestedUrl) args.push('--url', requestedUrl);

console.log(`Opening an ngrok tunnel to the NestJS API on port ${port}...`);
console.log('Keep this process running and copy the HTTPS forwarding URL.');

const child = spawn('ngrok', args, { stdio: 'inherit' });

child.on('error', (error) => {
  if (error.code === 'ENOENT') {
    console.error(
      'ngrok was not found. Install it from https://ngrok.com/download, then retry.',
    );
  } else {
    console.error(error.message);
  }
  process.exitCode = 1;
});

child.on('exit', (code, signal) => {
  if (signal) console.log(`ngrok stopped by ${signal}.`);
  process.exitCode = code ?? 0;
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => child.kill(signal));
}
