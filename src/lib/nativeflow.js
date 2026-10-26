// Tombol Native Flow untuk Zapo.
//
// Zapo tidak menyediakan builder tombol siap pakai — tapi `client.message.send`
// menerima `Proto.IMessage` mentah, dan proto Zapo sudah berisi
// `Message.InteractiveMessage.NativeFlowMessage` (tombol `quick_reply`,
// `single_select`, `cta_url`). Modul ini membangun payload itu dengan
// validasi, supaya pemakai tidak perlu menghafal bentuk JSON-nya.
//
// Bentuk yang dipakai = bentuk yang sama dengan menu bot HABI saat ini
// (nativeFlowMessage), jadi perilaku tombol di HP penerima tidak berubah.

function needText(value, name) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${name} wajib string non-kosong`);
  }
  return value;
}

function needButtons(buttons, name, min, max) {
  if (!Array.isArray(buttons) || buttons.length < min || buttons.length > max) {
    throw new Error(`${name} wajib array ${min}..${max} tombol`);
  }
  for (const b of buttons) {
    needText(b?.id, 'button.id');
    needText(b?.title, 'button.title');
  }
  return buttons;
}

function interactiveMessage({ body, footer, headerText, nativeFlowMessage }) {
  const msg = {
    interactiveMessage: {
      body: { text: body },
      ...(footer ? { footer: { text: footer } } : {}),
      ...(headerText ? { header: { title: headerText } } : {}),
      nativeFlowMessage,
    },
  };
  return msg;
}

// Tombol balas cepat (maks 3, tampil di bawah pesan). Dipakai untuk
// konfirmasi / pilihan singkat, mis. [Ya] [Tidak] [Menu].
export function buildQuickReplyMessage({ body, footer, headerText, buttons }) {
  needText(body, 'body');
  needButtons(buttons, 'buttons', 1, 3);
  return interactiveMessage({
    body,
    footer,
    headerText,
    nativeFlowMessage: {
      buttons: buttons.map((b) => ({
        name: 'quick_reply',
        buttonParamsJson: JSON.stringify({ display_text: b.title, id: b.id }),
      })),
      messageVersion: 1,
    },
  });
}

// Satu tombol daftar (single_select) — ini bentuk menu utama HABI
// ('Lihat Kategori'): satu tombol membuka daftar berseksi.
export function buildListMessage({ body, footer, headerText, buttonTitle, sections }) {
  needText(body, 'body');
  needText(buttonTitle, 'buttonTitle');
  if (!Array.isArray(sections) || sections.length === 0) {
    throw new Error('sections wajib array non-kosong');
  }
  for (const s of sections) {
    if (!Array.isArray(s?.rows) || s.rows.length === 0) {
      throw new Error('setiap section wajib punya rows non-kosong');
    }
    for (const r of s.rows) {
      needText(r?.id, 'row.id');
      needText(r?.title, 'row.title');
    }
  }
  return interactiveMessage({
    body,
    footer,
    headerText,
    nativeFlowMessage: {
      buttons: [
        {
          name: 'single_select',
          buttonParamsJson: JSON.stringify({ title: buttonTitle, sections }),
        },
      ],
      messageVersion: 1,
    },
  });
}

// Tombol tautan (maks 3), mis. ke panel / toko / grup.
export function buildCtaUrlMessage({ body, footer, headerText, buttons }) {
  needText(body, 'body');
  needButtons(buttons, 'buttons', 1, 3);
  for (const b of buttons) {
    if (typeof b?.url !== 'string' || !/^https?:\/\//.test(b.url)) {
      throw new Error('button.url wajib URL http(s)');
    }
  }
  return interactiveMessage({
    body,
    footer,
    headerText,
    nativeFlowMessage: {
      buttons: buttons.map((b) => ({
        name: 'cta_url',
        buttonParamsJson: JSON.stringify({ display_text: b.title, url: b.url }),
      })),
      messageVersion: 1,
    },
  });
}

// Kirim pesan native flow lewat client Zapo. Validasi bentuk dulu supaya
// kesalahan ketahuan sebelum kena jaringan.
export async function sendNativeFlow(client, to, message, options) {
  if (!client?.message?.send) throw new Error('client Zapo tidak valid (client.message.send hilang)');
  if (!message?.interactiveMessage?.nativeFlowMessage) {
    throw new Error('message bukan pesan Native Flow (interactiveMessage.nativeFlowMessage hilang)');
  }
  needText(to, 'to');
  return client.message.send(to, message, options);
}

// Buka satu lapis pembungkus (ephemeral / viewOnce / deviceSent) bila ada.
function unwrapOnce(message) {
  if (!message || typeof message !== 'object') return message;
  if (message.ephemeralMessage?.message) return message.ephemeralMessage.message;
  if (message.viewOnceMessage?.message) return message.viewOnceMessage.message;
  if (message.viewOnceMessageV2?.message) return message.viewOnceMessageV2.message;
  if (message.deviceSentMessage?.message) return message.deviceSentMessage.message;
  return message;
}

// Baca jawaban tombol dari pesan masuk (Proto.IMessage).
// Kembali: { kind: 'quick_reply'|'list'|'button', id, title } atau null.
export function parseInteractiveResponse(message) {
  const m = unwrapOnce(message);
  if (!m) return null;
  const r = m.interactiveResponseMessage;
  if (r?.nativeFlowResponseMessage?.paramsJson) {
    try {
      const params = JSON.parse(r.nativeFlowResponseMessage.paramsJson);
      return { kind: 'quick_reply', id: params.id ?? null, title: params.display_text ?? null };
    } catch {
      return null;
    }
  }
  if (m.listResponseMessage) {
    return {
      kind: 'list',
      id: m.listResponseMessage.singleSelectReply?.selectedRowId ?? null,
      title: m.listResponseMessage.singleSelectReply?.title ?? null,
    };
  }
  if (m.buttonsResponseMessage) {
    return {
      kind: 'button',
      id: m.buttonsResponseMessage.selectedButtonId ?? null,
      title: m.buttonsResponseMessage.selectedDisplayText ?? null,
    };
  }
  return null;
}
