/**
 * logica.js — Exvall CM
 * Funciones puras de negocio extraídas de index.html.
 * No dependen del DOM ni de estado global.
 * Se importan en index.html con <script src="logica.js">
 * y se importan en los tests con import { ... } from './logica.js'
 */

// ── Constantes ────────────────────────────────────────────────────────────────

export const MONTHS = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
];

export const DEFAULT_STATE = () => ({
  irpf: 8,
  irpfHist: [],
  currentMonth: new Date().getMonth(),
  servicios: [
    {id:'boda',      name:'Boda',          precio:80},
    {id:'comidas',   name:'Comidas',        precio:65},
    {id:'cenas',     name:'Cenas',          precio:65},
    {id:'servicio3h',name:'Servicio 3H',    precio:45},
    {id:'especial',  name:'Especial',       precio:0 },
  ],
  lugares: [
    {id:'arzuaga',      name:'Arzuaga',          coche:18},
    {id:'olmedo',       name:'Olmedo',            coche:20},
    {id:'valbuena',     name:'Valbuena',          coche:20},
    {id:'concejo',      name:'Concejo',           coche:13},
    {id:'montico',      name:'Montico',           coche:7 },
    {id:'afpesquera',   name:'AF Pesquera',       coche:22},
    {id:'medinarioseco',name:'Medina Rioseco',     coche:20},
    {id:'otro',         name:'Otro / Especial',    coche:0 },
  ],
  extras: { hext: 12, hnoc: 15, km: 0.23 },
  entries: {},
  banco:   {},
  nombre:  '',
});

// ── Cálculo de totales ────────────────────────────────────────────────────────

/**
 * Calcula el total bruto de una entrada dados sus parámetros.
 *
 * @param {object} params
 * @param {string}  params.coche     - 'no' | 'si' | 'km'
 * @param {number}  params.hext      - horas extra
 * @param {number}  params.hnoc      - horas nocturnas
 * @param {number}  params.manual    - precio libre (servicio Especial)
 * @param {number}  params.km        - km recorridos (modo km)
 * @param {Array}   params.stops     - paradas de ruta [{servId, especPrecio}]
 * @param {string}  params.servId    - id del servicio
 * @param {string}  params.lugId     - id del lugar
 * @param {object}  params.state     - estado completo del perfil
 * @returns {number} total bruto
 */
export function calcularTotal({ coche, hext = 0, hnoc = 0, manual = 0, km = 0, stops = [], servId, lugId, state }) {
  let total = 0;

  if (coche === 'km') {
    stops.forEach(s => {
      const serv = state.servicios.find(sv => sv.id === s.servId);
      if (serv) total += serv.precio > 0 ? serv.precio : (s.especPrecio || 0);
    });
    total += km * state.extras.km;
  } else {
    const serv = state.servicios.find(s => s.id === servId);
    const lug  = state.lugares.find(l => l.id === lugId);
    if (serv) total += serv.precio > 0 ? serv.precio : manual;
    if (coche === 'si' && lug) total += lug.coche;
  }

  total += hext * state.extras.hext;
  total += hnoc * state.extras.hnoc;

  return parseFloat(total.toFixed(2));
}

/**
 * Calcula el neto aplicando la retención de IRPF.
 * @param {number} bruto
 * @param {number} irpf  - porcentaje (ej: 8 para 8%)
 * @returns {number}
 */
export function calcularNeto(bruto, irpf) {
  return parseFloat((bruto * (1 - irpf / 100)).toFixed(2));
}

/**
 * Calcula el IRPF retenido.
 * @param {number} bruto
 * @param {number} irpf
 * @returns {number}
 */
export function calcularRetencion(bruto, irpf) {
  return parseFloat((bruto * irpf / 100).toFixed(2));
}

// ── Validación de fechas ──────────────────────────────────────────────────────

/**
 * Devuelve el número máximo de días de un mes dado.
 * @param {number} year  - año completo (ej: 2025)
 * @param {number} month - mes en base 0 (0=Enero … 11=Diciembre)
 * @returns {number} días del mes
 */
export function diasEnMes(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Valida si un día es válido para el mes y año dados.
 * @param {number} dia
 * @param {number} year
 * @param {number} month - base 0
 * @returns {{ ok: boolean, mensaje: string }}
 */
export function validarDia(dia, year, month) {
  if (!dia || isNaN(dia) || dia < 1) {
    return { ok: false, mensaje: 'El día no puede estar vacío.' };
  }
  const max = diasEnMes(year, month);
  if (dia > max) {
    return { ok: false, mensaje: `El día debe estar entre 1 y ${max} para ${MONTHS[month]}.` };
  }
  return { ok: true, mensaje: '' };
}

// ── Backup — exportar e importar ─────────────────────────────────────────────

/**
 * Campos mínimos que debe tener un backup para ser válido.
 */
const CAMPOS_REQUERIDOS = ['entries', 'servicios', 'lugares', 'extras', 'irpf'];

/**
 * Valida que un objeto importado es un backup Exvall CM válido.
 * @param {any} data - objeto parseado del JSON
 * @returns {{ ok: boolean, mensaje: string }}
 */
export function validarBackup(data) {
  if (!data || typeof data !== 'object') {
    return { ok: false, mensaje: 'El archivo no contiene JSON válido.' };
  }
  for (const campo of CAMPOS_REQUERIDOS) {
    if (!(campo in data)) {
      return { ok: false, mensaje: `El archivo no es un backup válido (falta campo: "${campo}").` };
    }
  }
  if (typeof data.entries !== 'object') {
    return { ok: false, mensaje: 'El campo "entries" no tiene el formato correcto.' };
  }
  if (!Array.isArray(data.servicios)) {
    return { ok: false, mensaje: 'El campo "servicios" no tiene el formato correcto.' };
  }
  return { ok: true, mensaje: '' };
}

/**
 * Aplica un backup importado sobre el estado actual.
 * Devuelve el nuevo estado combinado.
 * @param {object} estadoActual
 * @param {object} importado
 * @returns {object} nuevo estado
 */
export function aplicarBackup(estadoActual, importado) {
  return {
    ...estadoActual,
    entries:   importado.entries   || {},
    banco:     importado.banco     || {},
    irpf:      importado.irpf      ?? estadoActual.irpf,
    irpfHist:  importado.irpfHist  || estadoActual.irpfHist,
    nombre:    importado.nombre    || estadoActual.nombre,
    servicios: importado.servicios || estadoActual.servicios,
    lugares:   importado.lugares   || estadoActual.lugares,
    extras:    importado.extras    || estadoActual.extras,
  };
}

/**
 * Cuenta el total de entradas en un estado.
 * @param {object} entries - state.entries
 * @returns {number}
 */
export function contarEntradas(entries) {
  return Object.values(entries || {}).reduce((s, arr) => s + (Array.isArray(arr) ? arr.length : 0), 0);
}

// ── Resumen mensual ───────────────────────────────────────────────────────────

/**
 * Construye las filas de resumen anual mes a mes.
 * @param {object} state     - estado del perfil
 * @param {number} year      - año a resumir
 * @returns {Array<object>}
 */
export function buildResumenAnual(state, year) {
  return MONTHS.map((mes, i) => {
    const key     = `${year}-${i}`;
    const entries = state.entries[key] || [];
    const bruto   = entries.reduce((s, e) => s + e.total, 0);
    const ret     = entries.reduce((s, e) => s + (e.total * (e.irpf || state.irpf) / 100), 0);
    const banco   = (state.banco && state.banco[key]) || 0;
    const irpfRate = state.irpf / 100;
    const brutoCubierto = irpfRate < 1 ? banco / (1 - irpfRate) : 0;
    const mano    = parseFloat(Math.max(0, bruto - brutoCubierto).toFixed(2));
    const neto    = parseFloat((bruto - ret).toFixed(2));
    return {
      mes,
      bruto:  parseFloat(bruto.toFixed(2)),
      ret:    parseFloat(ret.toFixed(2)),
      banco:  parseFloat(banco.toFixed(2)),
      mano,
      neto,
    };
  });
}

// ── Normalización para PDF ────────────────────────────────────────────────────

/**
 * Elimina caracteres no soportados por jsPDF + Helvetica.
 * @param {string} str
 * @returns {string}
 */
export function pdfTxt(str) {
  if (!str) return '';
  return String(str)
    .replace(/á/g,'a').replace(/é/g,'e').replace(/í/g,'i').replace(/ó/g,'o').replace(/ú/g,'u')
    .replace(/Á/g,'A').replace(/É/g,'E').replace(/Í/g,'I').replace(/Ó/g,'O').replace(/Ú/g,'U')
    .replace(/ñ/g,'n').replace(/Ñ/g,'N').replace(/ü/g,'u').replace(/Ü/g,'U')
    .replace(/¿/g,'?').replace(/¡/g,'!').replace(/€/g,'EUR')
    .replace(/–/g,'-').replace(/—/g,'-');
}
