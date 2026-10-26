// Saran typo untuk Zapo — port MESIN SKOR dari core/deteksi-typo.js Baileys
// (fungsi murni, tanpa dependensi Baileys), dengan sumber entri dari
// registry router Zapo, bukan dari pemuat-plugin Baileys.
//
// PERBAIKAN yang ikut di sini (sama seperti fix Baileys build68):
// tombol saran membawa ARGUMEN asli — ".delpanel 13", bukan ".delpanel"
// saja — karena tap tombol menjalankan isi tombol sebagai perintah.

import { buildQuickReplyMessage, sendNativeFlow } from './nativeflow.js';

const keyboardRows = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
const keyboardNeighbors = new Map();

for (let rowIndex = 0; rowIndex < keyboardRows.length; rowIndex++) {
  const row = keyboardRows[rowIndex];
  for (let index = 0; index < row.length; index++) {
    const key = row[index];
    const neighbors = new Set();
    for (let r = Math.max(0, rowIndex - 1); r <= Math.min(keyboardRows.length - 1, rowIndex + 1); r++) {
      const target = keyboardRows[r];
      const start = Math.max(0, index - 1);
      const end = Math.min(target.length - 1, index + 1);
      for (let i = start; i <= end; i++) if (target[i] !== key) neighbors.add(target[i]);
    }
    keyboardNeighbors.set(key, neighbors);
  }
}

function normalizeCommand(value) {
  return String(value || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '');
}

function compactCommand(value) {
  return normalizeCommand(value).replace(/[-_]/g, '');
}

function maxDistanceForLength(length) {
  if (length <= 2) return 1;
  if (length <= 4) return 1;
  if (length <= 7) return 2;
  if (length <= 11) return 3;
  return 4;
}

function minScoreForLength(length) {
  if (length <= 3) return 0.82;
  if (length <= 4) return 0.78;
  if (length <= 6) return 0.72;
  if (length <= 9) return 0.68;
  return 0.64;
}

function damerauLevenshtein(a, b, limit = Infinity) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  if (Math.abs(a.length - b.length) > limit) return limit + 1;

  const previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  let prevPrev = null;
  let prev = previous;

  for (let i = 1; i <= a.length; i++) {
    const current = new Array(b.length + 1);
    current[0] = i;
    for (let j = 1; j <= b.length; j++) {
      let value = Math.min(
        prev[j] + 1,
        current[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      if (i > 1 && j > 1 && prevPrev && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        value = Math.min(value, prevPrev[j - 2] + 1);
      }
      current[j] = value;
    }
    prevPrev = prev;
    prev = current;
  }

  const distance = prev[b.length];
  return distance > limit ? limit + 1 : distance;
}

function diceSimilarity(a, b) {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  const counts = new Map();
  for (let i = 0; i < a.length - 1; i++) {
    const pair = a.slice(i, i + 2);
    counts.set(pair, (counts.get(pair) || 0) + 1);
  }
  let overlap = 0;
  for (let i = 0; i < b.length - 1; i++) {
    const pair = b.slice(i, i + 2);
    const count = counts.get(pair) || 0;
    if (count) {
      overlap++;
      counts.set(pair, count - 1);
    }
  }
  return (2 * overlap) / ((a.length - 1) + (b.length - 1));
}

function prefixSimilarity(a, b) {
  let length = 0;
  const limit = Math.min(a.length, b.length);
  while (length < limit && a[length] === b[length]) length++;
  return length / Math.max(a.length, b.length, 1);
}

function suffixSimilarity(a, b) {
  let length = 0;
  let ai = a.length - 1;
  let bi = b.length - 1;
  while (ai >= 0 && bi >= 0 && a[ai] === b[bi]) {
    length++;
    ai--;
    bi--;
  }
  return length / Math.max(a.length, b.length, 1);
}

function keyboardSimilarity(a, b) {
  const limit = Math.min(a.length, b.length);
  if (!limit) return 0;
  let good = 0;
  for (let i = 0; i < limit; i++) {
    if (a[i] === b[i]) {
      good += 1;
      continue;
    }
    if (keyboardNeighbors.get(b[i])?.has(a[i])) good += 0.72;
  }
  return good / Math.max(a.length, b.length);
}

function orderedOverlap(a, b) {
  if (!a || !b) return 0;
  let j = 0;
  let matched = 0;
  for (const char of a) {
    const index = b.indexOf(char, j);
    if (index === -1) continue;
    matched++;
    j = index + 1;
  }
  return matched / Math.max(a.length, b.length, 1);
}

function repeatedCharPenalty(a, b) {
  const collapse = (value) => value.replace(/(.)\1+/g, '$1');
  return 1 - Math.min(1, damerauLevenshtein(collapse(a), collapse(b), 3) / Math.max(collapse(a).length, collapse(b).length, 1));
}

function isAdjacentTransposition(a, b) {
  if (a.length !== b.length) return false;
  const differences = [];
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) differences.push(i);
  return differences.length === 2 && differences[1] === differences[0] + 1 && a[differences[0]] === b[differences[1]] && a[differences[1]] === b[differences[0]];
}

function scoreCandidate(input, candidate) {
  const command = input;
  const target = candidate.command;
  const compactInput = compactCommand(command);
  const compactTarget = candidate.compact;
  const maxDistance = maxDistanceForLength(command.length);
  const distance = damerauLevenshtein(command, target, maxDistance);
  if (distance > maxDistance) return null;

  const compactDistance = damerauLevenshtein(compactInput, compactTarget, Math.max(maxDistance, 2));
  if (compactDistance > Math.max(maxDistance, 2)) return null;

  const maxLength = Math.max(command.length, target.length, 1);
  const edit = 1 - distance / maxLength;
  const compactEdit = 1 - compactDistance / Math.max(compactInput.length, compactTarget.length, 1);
  const dice = diceSimilarity(command, target);
  const prefix = prefixSimilarity(command, target);
  const suffix = suffixSimilarity(command, target);
  const keyboard = keyboardSimilarity(command, target);
  const ordered = orderedOverlap(command, target);
  const repeats = repeatedCharPenalty(command, target);
  const transposition = isAdjacentTransposition(command, target);
  const lengthGap = Math.abs(command.length - target.length);

  let score =
    edit * 0.38 +
    compactEdit * 0.10 +
    dice * 0.14 +
    keyboard * 0.10 +
    prefix * 0.09 +
    suffix * 0.04 +
    ordered * 0.07 +
    repeats * 0.08;

  if (transposition) score += 0.12;
  if (lengthGap === 0) score += 0.025;
  if (lengthGap > 2) score -= 0.10;
  if (distance === 1) score += 0.08;
  if (distance === 2 && command.length >= 7) score += 0.025;
  if (keyboard > 0.65 && distance <= 2) score += 0.04;

  return {
    ...candidate,
    distance,
    score: Math.max(0, Math.min(1, score)),
    edit,
    transposition,
    compactEdit,
    keyboard,
  };
}

function acceptanceThreshold(command, best, second) {
  const length = command.length;
  const strongOneEdit = best.distance === 1 && best.edit >= 0.67 && best.score >= 0.56;
  if (strongOneEdit) return true;

  if (best.distance === 2 && length >= 5 && best.edit >= 0.67 && best.score >= 0.64) return true;
  if (best.distance === 3 && length >= 9 && best.edit >= 0.70 && best.score >= 0.69) return true;

  const minimumScore = minScoreForLength(length);
  const minimumEdit = length <= 4 ? 0.67 : length <= 7 ? 0.60 : 0.55;
  if (best.score < minimumScore || best.edit < minimumEdit) return false;

  if (second) {
    const closeDistance = second.distance <= best.distance;
    const closeScore = best.score - second.score < (length <= 4 ? 0.08 : 0.055);
    const closeEdit = second.edit >= best.edit - 0.04;
    if (closeDistance && closeScore && closeEdit) return false;
  }

  return true;
}

// entries: [{ command, category }] dari registry router.
export function findBestCommandMatch(input, entries = []) {
  const command = normalizeCommand(input);
  if (!command) return null;

  const unique = new Map();
  for (const entry of entries) {
    const name = normalizeCommand(entry.command);
    const compact = compactCommand(entry.command);
    if (name.length < 2 || compact.length < 2) continue;
    if (!unique.has(name)) {
      unique.set(name, { command: name, compact, category: entry.category || 'umum' });
    }
  }

  const candidates = [];
  for (const entry of unique.values()) {
    if (entry.command === command) continue;
    const result = scoreCandidate(command, entry);
    if (result) candidates.push(result);
  }

  if (!candidates.length) return null;

  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.distance !== b.distance) return a.distance - b.distance;
    if (b.edit !== a.edit) return b.edit - a.edit;
    if (b.keyboard !== a.keyboard) return b.keyboard - a.keyboard;
    if (a.command.length !== b.command.length) return a.command.length - b.command.length;
    return a.command.localeCompare(b.command);
  });

  const best = candidates[0];
  const second = candidates[1];
  if (!acceptanceThreshold(command, best, second)) return null;

  return {
    command: best.command,
    distance: best.distance,
    similarity: Math.max(0, Math.min(100, Math.round(best.edit * 100))),
    score: Math.round(best.score * 100),
    category: best.category,
  };
}

function buildTypoText(prefix, typedCommand, match) {
  const suggested = `${prefix}${String(match.command || '').replace(/^\.+/, '')}`;
  return [
    '💢 *COMMAND TIDAK DITEMUKAN*',
    '',
    '╭─〔 *MUNGKIN INI* 〕',
    `│ • ${suggested}`,
    `│ • ${match.similarity}% mirip`,
    '╰────────────',
  ].join('\n');
}

// Kirim saran typo sebagai pesan Native Flow quick_reply. Tombol membawa
// perintah LENGKAP beserta argumen (".delpanel 13") supaya tap langsung
// menjalankan perintah yang dimaksud — bukan command tanpa argumen.
export async function sendTypoSuggestion(client, chat, prefix, typedCommand, argsText = '', entries = []) {
  const bestMatch = findBestCommandMatch(typedCommand, entries);
  if (!bestMatch) return false;

  const teks = buildTypoText(prefix, typedCommand, bestMatch);
  const commandId = `${prefix}${bestMatch.command}`;
  const runCommand = argsText ? `${commandId} ${argsText}` : commandId;

  try {
    await sendNativeFlow(client, chat, buildQuickReplyMessage({
      body: teks,
      footer: '↳ Tekan tombol untuk menjalankan.',
      buttons: [{ id: runCommand, title: runCommand }],
    }));
    return true;
  } catch (error) {
    // Fallback teks (darurat saja) bila Native Flow gagal terkirim.
    try {
      await client.message.send(chat, { conversation: teks });
      return true;
    } catch {
      return false;
    }
  }
}
