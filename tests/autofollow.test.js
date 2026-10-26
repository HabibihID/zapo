import test from 'node:test';
import assert from 'node:assert/strict';
import { parseChannelInput, autoFollowChannels } from '../src/lib/autofollow.js';

test('parseChannelInput: JID, link, kode invite', () => {
  assert.deepEqual(parseChannelInput('1234567890123@newsletter'), { kind: 'jid', jid: '1234567890123@newsletter', raw: '1234567890123@newsletter' });
  assert.deepEqual(parseChannelInput('https://whatsapp.com/channel/0029AbC123'), { kind: 'invite', inviteCode: '0029AbC123', raw: 'https://whatsapp.com/channel/0029AbC123' });
  assert.deepEqual(parseChannelInput('https://whatsapp.com/channel/0029AbC123/45'), { kind: 'invite', inviteCode: '0029AbC123', raw: 'https://whatsapp.com/channel/0029AbC123/45' });
  assert.deepEqual(parseChannelInput('0029AbC1234567'), { kind: 'invite', inviteCode: '0029AbC1234567', raw: '0029AbC1234567' });
  assert.equal(parseChannelInput(''), null);
  assert.equal(parseChannelInput('asal tulis'), null);
});

function mockClient({ subscribed = [], failFollow = null } = {}) {
  const followed = [];
  return {
    followed,
    newsletter: {
      listSubscribed: async () => subscribed.map((jid) => ({ jid })),
      fetchByInvite: async (code) => ({ jid: `111${code.length}@newsletter`, name: `Saluran ${code}` }),
      fetch: async (jid) => ({ jid, name: 'Saluran JID' }),
      follow: async (jid) => {
        if (failFollow === jid) throw new Error('gagal follow (simulasi)');
        followed.push(jid);
      },
    },
  };
}

test('autoFollow: invite -> JID -> follow, sudah diikuti dilewati', async () => {
  const client = mockClient({ subscribed: ['11110@newsletter'] });
  const res = await autoFollowChannels(client, [
    'https://whatsapp.com/channel/0029AAAA', // invite 8 char -> jid 1118@newsletter (baru)
    '11110@newsletter', // sudah diikuti? tidak: ini JID langsung 11110, beda dari hasil invite
  ]);
  assert.equal(res[0].status, 'followed');
  assert.equal(res[0].jid, '1118@newsletter');
  assert.equal(client.followed.includes('1118@newsletter'), true);
});

test('autoFollow: yang sudah diikuti tidak di-follow ulang', async () => {
  const client = mockClient({ subscribed: ['1234567890123@newsletter'] });
  const res = await autoFollowChannels(client, ['1234567890123@newsletter']);
  assert.equal(res[0].status, 'already');
  assert.equal(client.followed.length, 0);
});

test('autoFollow: satu gagal tidak menggagalkan yang lain', async () => {
  const client = mockClient({ failFollow: '1118@newsletter' });
  const res = await autoFollowChannels(client, [
    'https://whatsapp.com/channel/0029AAAA',
    '1234567890123@newsletter',
  ]);
  assert.equal(res[0].status, 'failed');
  assert.equal(res[1].status, 'followed');
});
