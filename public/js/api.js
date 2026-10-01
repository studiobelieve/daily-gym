// Chiamate al server. Un 401 riporta alla schermata di login.
import { oggiLocale } from './shared/testo.js';

export const oggi = () => oggiLocale();

let suNonAutenticato = () => {};
export function quandoNonAutenticato(fn) { suNonAutenticato = fn; }

export class ErroreApi extends Error {
  constructor(msg, status) { super(msg); this.status = status; }
}

async function richiesta(metodo, url, corpo, { raw, tipo } = {}) {
  const opz = { method: metodo, headers: {}, credentials: 'same-origin' };
  if (raw) {
    opz.body = raw;
    opz.headers['Content-Type'] = tipo;
  } else if (corpo !== undefined) {
    opz.body = JSON.stringify(corpo);
    opz.headers['Content-Type'] = 'application/json';
  }
  let r;
  try {
    r = await fetch(url, opz);
  } catch {
    throw new ErroreApi('Sei offline o il server non risponde. Riprova tra poco.', 0);
  }
  if (r.status === 401 && !url.endsWith('/api/login')) {
    suNonAutenticato();
    throw new ErroreApi('Accesso richiesto.', 401);
  }
  const ct = r.headers.get('content-type') || '';
  if (!ct.includes('application/json')) {
    if (!r.ok) throw new ErroreApi(`Errore ${r.status}`, r.status);
    return r.blob();
  }
  const dati = await r.json();
  if (!r.ok) throw new ErroreApi(dati.errore || `Errore ${r.status}`, r.status);
  return dati;
}

const conGiorno = (url) => url + (url.includes('?') ? '&' : '?') + 'giorno=' + oggi();

export const api = {
  get: (url) => richiesta('GET', conGiorno(url)),
  post: (url, corpo = {}) => richiesta('POST', url, { giorno: oggi(), ...corpo }),
  put: (url, corpo = {}) => richiesta('PUT', url, corpo),
  del: (url) => richiesta('DELETE', url),
  audio: (url, blob) => richiesta('POST', url, undefined, { raw: blob, tipo: blob.type || 'audio/webm' }),
};
