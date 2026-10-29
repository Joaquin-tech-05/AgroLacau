// Función de Netlify para los datos compartidos del equipo (se guardan en Netlify Blobs).
import { getStore } from '@netlify/blobs';
import { manejar } from '../../servidor/sincronizacion.mjs';

export default async function (req) {
  var store = getStore({ name: 'agrolacau', consistency: 'strong' });
  return manejar(req, store, process.env.AGROLACAU_CLAVE);
}

export var config = { path: '/api/datos' };
