// Piccole preferenze per dispositivo (localStorage). Tutto ciò che conta sta nel database;
// qui solo comodità: quali passi della sessione di oggi hai già fatto su questo dispositivo,
// la durata preferita. Ogni accesso è protetto: in navigazione privata può non funzionare.

function leggi(k, def) {
  try { const v = localStorage.getItem(k); return v == null ? def : JSON.parse(v); } catch { return def; }
}
function scrivi(k, v) {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch {}
}

export function passiFatti(giorno) {
  return leggi('dg_passi_' + giorno, []);
}

export function segnaPasso(giorno, chiave) {
  const f = passiFatti(giorno);
  if (!f.includes(chiave)) f.push(chiave);
  scrivi('dg_passi_' + giorno, f);
  // Pulizia dei giorni vecchi.
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith('dg_passi_') && k !== 'dg_passi_' + giorno) localStorage.removeItem(k);
    }
  } catch {}
}

export const durataPreferita = () => leggi('dg_durata', 'corta');
export const impostaDurata = (v) => scrivi('dg_durata', v);

export const chiavePasso = (p) => p.id + (p.scenario ? ':' + p.scenario : '');
