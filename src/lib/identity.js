// Perbaikan client.me: ambil identitas bot (nomor HP + LID) dengan benar.
//
// Masalah yang diperbaiki:
// Di WhatsApp modern, satu akun bisa tampil dalam DUA bentuk JID:
//   - nomor HP : 62812xxxx@s.whatsapp.net
//   - LID      : 123456789@lid   (Linked Identity, tanpa nomor)
// Zapo menyimpan keduanya di credentials (`meJid` + `meLid`), tapi kode bot
// yang hanya membaca satu sisi akan salah mengenali pesan sendiri / owner.
// Modul ini menormalisasi keduanya jadi satu identitas + helper `isMe()`
// yang menerima JID nomor maupun JID LID (termasuk suffix device `:xx`).
//
// Catatan jujur: bila `meJid` berbentuk LID dan tidak ada `meLid` maupun
// nomor pairing yang dikonfigurasi, nomor HP TIDAK bisa ditebak — fungsi ini
// mengembalikan `phone: null` + peringatan, bukan angka karangan. Isi
// BOT_NUMBER (nomor yang dipakai minta pairing code) untuk melengkapinya.

import { getLoginIdentity, isLidJid } from 'zapo-js';

const digitsOnly = (s) => String(s ?? '').replace(/\D/g, '');

// '62812xxx:12@s.whatsapp.net' -> { user: '62812xxx', device: 12, server: 's.whatsapp.net' }
export function splitJid(jid) {
  if (!jid || typeof jid !== 'string') return null;
  const at = jid.lastIndexOf('@');
  if (at <= 0) return null;
  const userPart = jid.slice(0, at);
  const server = jid.slice(at + 1);
  if (!userPart || !server) return null;
  const [user, deviceRaw] = userPart.split(':');
  if (!user) return null;
  return { user, device: deviceRaw ? Number(deviceRaw) : 0, server };
}

function lidUserOf(jid) {
  const p = splitJid(jid);
  if (!p) return null;
  if (p.server !== 'lid' && !isLidJid(jid)) return null;
  return /^\d+$/.test(p.user) ? p.user : null;
}

function phoneUserOf(jid) {
  const p = splitJid(jid);
  if (!p || p.server !== 's.whatsapp.net') return null;
  return /^\d+$/.test(p.user) ? p.user : null;
}

export function resolveBotIdentity({ meJid, meLid, pairingPhone } = {}) {
  const warnings = [];
  const me = splitJid(meJid);

  let phone = null;
  let phoneSource = null;
  let lid = null;

  if (me?.server === 's.whatsapp.net' && /^\d+$/.test(me.user)) {
    phone = me.user;
    phoneSource = 'meJid';
  }
  if (me?.server === 'lid' && /^\d+$/.test(me.user)) {
    lid = me.user;
  }
  if (!lid) lid = lidUserOf(meLid);
  if (!phone) {
    const fromPairing = digitsOnly(pairingPhone);
    if (fromPairing) {
      phone = fromPairing;
      phoneSource = 'pairingPhone';
    }
  }
  // Fallback terakhir: bila meJid nomor tapi formatnya aneh, coba phoneUserOf.
  if (!phone && !lid) {
    phone = phoneUserOf(meJid);
    if (phone) phoneSource = 'meJid';
  }
  if (!phone) {
    warnings.push(
      'Nomor HP tidak bisa dipastikan: meJid berbentuk LID dan BOT_NUMBER tidak diisi. ' +
        'Isi BOT_NUMBER dengan nomor yang dipakai minta pairing code.',
    );
  }
  if (!lid) {
    warnings.push('LID tidak ditemukan di credentials (meJid/meLid) — isMe() hanya mencocokkan nomor HP.');
  }

  let device = me?.device ?? 0;
  try {
    if (meJid) device = getLoginIdentity(meJid).device ?? device;
  } catch {
    // meJid tidak valid untuk getLoginIdentity — pakai device dari splitJid.
  }

  const phoneJid = phone ? `${phone}@s.whatsapp.net` : null;
  const lidJid = lid ? `${lid}@lid` : null;

  const identity = {
    meJid: meJid ?? null,
    meLid: meLid ?? null,
    phone,
    phoneJid,
    lid,
    lidJid,
    device,
    phoneResolved: phone !== null,
    phoneSource,
    warnings,
    // Benar untuk kedua bentuk: '628..@s.whatsapp.net', '123..@lid',
    // '628..:12@s.whatsapp.net', maupun string digit mentah '628..'.
    isMe(jid) {
      if (!jid || typeof jid !== 'string') return false;
      const clean = jid.trim();
      if (/^\d+$/.test(clean)) return phone !== null && clean === phone;
      const p = splitJid(clean);
      if (!p) return false;
      if (p.server !== 's.whatsapp.net' && p.server !== 'lid') return false;
      return (phone !== null && p.user === phone) || (lid !== null && p.user === lid);
    },
  };
  return identity;
}

export function formatIdentityCard(identity) {
  const lines = [
    `  Nomor HP : ${identity.phone ?? '(tidak diketahui)'}`,
    `  Phone JID: ${identity.phoneJid ?? '-'}`,
    `  LID      : ${identity.lid ?? '(tidak diketahui)'}`,
    `  LID JID  : ${identity.lidJid ?? '-'}`,
    `  Device   : ${identity.device}`,
    `  Sumber nomor: ${identity.phoneSource ?? '-'}`,
  ];
  for (const w of identity.warnings) lines.push(`  ! ${w}`);
  return lines.join('\n');
}
