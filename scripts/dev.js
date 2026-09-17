import { spawn } from 'child_process';

console.log('[Ruo UFMS] Khởi động đồng thời máy chủ Backend và ứng dụng Frontend...\n');

// Spawn Backend Server (Port 5000)
const server = spawn('npm', ['--prefix', 'server', 'run', 'dev'], {
  stdio: 'inherit',
  shell: true
});

// Spawn Frontend Client (Port 5173)
const client = spawn('npm', ['--prefix', 'client', 'run', 'dev'], {
  stdio: 'inherit',
  shell: true
});

const cleanup = () => {
  server.kill();
  client.kill();
  process.exit();
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
