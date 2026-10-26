// Animasi konsol tanpa dependensi: spinner, langkah bertahap, banner.
// Dipakai saat `npm install` (postinstall), `npm start`, dan proses lainnya.

const FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';

export function banner(lines) {
  const width = Math.max(...lines.map((l) => l.length)) + 4;
  const top = '╔' + '═'.repeat(width) + '╗';
  const bottom = '╚' + '═'.repeat(width) + '╝';
  const out = [top];
  for (const line of lines) {
    out.push('║ ' + line.padEnd(width - 2) + ' ║');
  }
  out.push(bottom);
  console.log(CYAN + out.join('\n') + RESET);
}

export function ok(msg) {
  console.log(`${GREEN}✔${RESET} ${msg}`);
}

export function info(msg) {
  console.log(`${DIM}→${RESET} ${msg}`);
}

export function warn(msg) {
  console.log(`${YELLOW}!${RESET} ${msg}`);
}

// Spinner satu baris. Kembalikan `stop(okText)` untuk mengakhiri.
export function spinner(label) {
  let i = 0;
  const timer = setInterval(() => {
    process.stdout.write(`\r${CYAN}${FRAMES[i++ % FRAMES.length]}${RESET} ${label}`);
  }, 80);
  let stopped = false;
  return (doneText) => {
    if (stopped) return;
    stopped = true;
    clearInterval(timer);
    process.stdout.write(`\r${GREEN}✔${RESET} ${doneText || label}\n`);
  };
}

// Jalankan langkah-langkah berurutan, tiap langkah tampil sebagai spinner.
// steps: [{ label, run: async () => any }]
export async function runSteps(steps) {
  const results = [];
  for (const step of steps) {
    const stop = spinner(step.label);
    try {
      const value = await step.run();
      stop(step.label);
      results.push(value);
    } catch (err) {
      clearInterval();
      process.stdout.write(`\r${YELLOW}!${RESET} ${step.label} — gagal: ${err.message}\n`);
      throw err;
    }
  }
  return results;
}

// Progress bar sederhana untuk tugas berdurasi (mis. auto-follow banyak channel).
export function progressBar(done, total, label) {
  const width = 24;
  const filled = total > 0 ? Math.round((done / total) * width) : 0;
  const bar = '█'.repeat(filled) + '░'.repeat(width - filled);
  process.stdout.write(`\r${CYAN}${bar}${RESET} ${done}/${total} ${label || ''}`);
  if (done >= total) process.stdout.write('\n');
}
