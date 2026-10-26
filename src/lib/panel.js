// Klien API panel Pterodactyl untuk Zapo (port dari core/panel.js Baileys).
//
// Prinsip yang sama dengan Baileys: JANGAN buang status & detail panel.
// 404 = ID tidak ada (pesan bisa ditindak: cek .listserver), bukan pesan
// generik "Gagal hapus server" yang menyembunyikan sebabnya.
//
// fetchImpl bisa di-inject (tes memakai fetch tiruan, tanpa jaringan).

export function createPanelClient({ domain, apiKey, fetchImpl = globalThis.fetch } = {}) {
  const headers = () => ({
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  });

  function requireConfig() {
    if (!domain || !apiKey) {
      throw new Error('Panel belum dikonfigurasi (isi PANEL_DOMAIN & PANEL_API_KEY di panel)');
    }
  }

  async function readDetail(res) {
    try {
      const data = await res.json();
      return data?.errors?.[0]?.detail || '';
    } catch {
      return '';
    }
  }

  async function deleteServer(serverId) {
    requireConfig();
    const res = await fetchImpl(`${domain}/api/application/servers/${serverId}`, {
      method: 'DELETE',
      headers: headers(),
    });
    if (res.ok || res.status === 204) return true;
    const detail = await readDetail(res);
    if (res.status === 404) {
      throw new Error(`Server tidak ditemukan (ID ${serverId} tidak ada di panel — cek .listserver)`);
    }
    throw new Error(`Gagal hapus server (HTTP ${res.status}${detail ? `: ${detail}` : ''})`);
  }

  async function listServers() {
    requireConfig();
    const res = await fetchImpl(`${domain}/api/application/servers`, { headers: headers() });
    if (!res.ok) {
      const detail = await readDetail(res);
      throw new Error(`Gagal mengambil daftar server (HTTP ${res.status}${detail ? `: ${detail}` : ''})`);
    }
    const data = await res.json();
    return (data?.data || []).map((row) => row?.attributes).filter(Boolean);
  }

  return { deleteServer, listServers };
}
