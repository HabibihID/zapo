// Auto-follow saluran (newsletter) WhatsApp milik user saat bot connect.
//
// Masukan per saluran boleh salah satu bentuk:
//   - JID langsung      : '1234567890123@newsletter'
//   - Link saluran      : 'https://whatsapp.com/channel/0029AbC...'
//   - Kode invite saja  : '0029AbC...'
// Penyelesaian link/kode -> JID memakai `client.newsletter.fetchByInvite`
// (MEX discovery Zapo), follow-nya memakai `client.newsletter.follow`.
// Idempotent: saluran yang sudah diikuti dilewati (dicek via listSubscribed,
// best-effort). Satu saluran gagal tidak menggagalkan yang lain.

export function parseChannelInput(input) {
  const s = String(input ?? '').trim();
  if (!s) return null;
  if (s.endsWith('@newsletter')) return { kind: 'jid', jid: s, raw: s };
  const link = s.match(/whatsapp\.com\/channel\/([A-Za-z0-9_-]+)/);
  if (link) return { kind: 'invite', inviteCode: link[1], raw: s };
  if (/^[A-Za-z0-9_-]{10,}$/.test(s)) return { kind: 'invite', inviteCode: s, raw: s };
  return null;
}

export async function autoFollowChannels(client, inputs, { log = () => {} } = {}) {
  const results = [];
  if (!client?.newsletter?.follow) {
    throw new Error('client Zapo tidak valid (client.newsletter.follow hilang)');
  }

  // Daftar yang sudah diikuti — best effort, gagal = lanjut tanpa filter.
  let followed = new Set();
  try {
    const subs = await client.newsletter.listSubscribed();
    followed = new Set((subs ?? []).map((m) => m?.jid).filter(Boolean));
  } catch {
    followed = new Set();
  }

  for (const input of inputs ?? []) {
    const parsed = parseChannelInput(input);
    if (!parsed) {
      results.push({ input, status: 'failed', error: 'format tidak dikenali (pakai link saluran / kode invite / JID @newsletter)' });
      continue;
    }
    try {
      let jid = parsed.jid ?? null;
      let name = null;
      if (parsed.kind === 'invite') {
        const meta = await client.newsletter.fetchByInvite(parsed.inviteCode);
        jid = meta?.jid ?? null;
        name = meta?.name ?? null;
        if (!jid) throw new Error('fetchByInvite tidak mengembalikan JID');
      } else {
        try {
          const meta = await client.newsletter.fetch(jid);
          name = meta?.name ?? null;
        } catch {
          // Nama best-effort saja; follow tetap jalan.
        }
      }
      if (followed.has(jid)) {
        results.push({ input, jid, name, status: 'already' });
        continue;
      }
      await client.newsletter.follow(jid);
      followed.add(jid);
      results.push({ input, jid, name, status: 'followed' });
      log('saluran diikuti');
    } catch (err) {
      results.push({ input, status: 'failed', error: err?.message ?? String(err) });
    }
  }
  return results;
}
