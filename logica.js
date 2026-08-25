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
    {id:'boda',      name:'Boda',          precio:80, horas:5},
    {id:'comidas',   name:'Comidas',        precio:65, horas:4},
    {id:'cenas',     name:'Cenas',          precio:65, horas:4},
    {id:'servicio3h',name:'Servicio 3H',    precio:45, horas:3},
    {id:'especial',  name:'Especial',       precio:0,  horas:4},
  ],
  lugares: [
    {id:'arzuaga',      name:'Arzuaga',          coche:18, km:0},
    {id:'olmedo',       name:'Olmedo',            coche:20, km:0},
    {id:'valbuena',     name:'Valbuena',          coche:20, km:0},
    {id:'concejo',      name:'Concejo',           coche:13, km:0},
    {id:'montico',      name:'Montico',           coche:7 , km:0},
    {id:'afpesquera',   name:'AF Pesquera',       coche:22, km:0},
    {id:'medinarioseco',name:'Medina Rioseco',     coche:20, km:0},
    {id:'otro',         name:'Otro / Especial',    coche:0 , km:0},
  ],
  extras: { hext: 12, hnoc: 15, km: 0.23 },
  entries: {},
  banco:   {},
  nombre:  '',
  papelera: [], // rastro de auditoría de entradas eliminadas
  vidaLaboralPct: null, // OBSOLETO (25/08/2026): un solo valor global, sustituido por vidaLaboralPorMes. Se mantiene solo para poder migrar perfiles antiguos.
  vidaLaboralPorMes: {}, // "AAAA-M" (M base 0) -> % de jornada (CTP) según el Informe de Vida Laboral de ese mes, introducido a mano (25/08/2026)
  ultimaSincronizacionNube: null, // ISO timestamp de la última subida/bajada automática a la nube
  _kmSembrado: false, // true tras rellenar una vez el km de los lugares por defecto conocidos (25/08/2026)
  _kmSembradoV2: false, // true tras corregir (una vez) los km sembrados con los valores equivocados de la primera version, por los reales de ida y vuelta (25/08/2026)
  _vidaLaboralMigrado: false, // true tras migrar (una vez) el valor único antiguo de vidaLaboralPct a vidaLaboralPorMes (25/08/2026)
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
  const servicios = importado.servicios || estadoActual.servicios;
  migrarHorasServicios(servicios);
  const lugares = importado.lugares || estadoActual.lugares;
  migrarKmLugares(lugares);
  return {
    ...estadoActual,
    entries:   importado.entries   || {},
    banco:     importado.banco     || {},
    irpf:      importado.irpf      ?? estadoActual.irpf,
    irpfHist:  importado.irpfHist  || estadoActual.irpfHist,
    nombre:    importado.nombre    || estadoActual.nombre,
    servicios,
    lugares,
    extras:    importado.extras    || estadoActual.extras,
    // La papelera (rastro de auditoría) también viaja con el backup, para no
    // perder el historial de entradas eliminadas al restaurar en otro dispositivo.
    papelera:  importado.papelera  || estadoActual.papelera || [],
    vidaLaboralPct: importado.vidaLaboralPct !== undefined ? importado.vidaLaboralPct : (estadoActual.vidaLaboralPct ?? null),
    vidaLaboralPorMes: importado.vidaLaboralPorMes !== undefined ? importado.vidaLaboralPorMes : (estadoActual.vidaLaboralPorMes ?? {}),
    ultimaSincronizacionNube: importado.ultimaSincronizacionNube !== undefined ? importado.ultimaSincronizacionNube : (estadoActual.ultimaSincronizacionNube ?? null),
    _kmSembrado: importado._kmSembrado !== undefined ? importado._kmSembrado : (estadoActual._kmSembrado ?? false),
    _kmSembradoV2: importado._kmSembradoV2 !== undefined ? importado._kmSembradoV2 : (estadoActual._kmSembradoV2 ?? false),
    _vidaLaboralMigrado: importado._vidaLaboralMigrado !== undefined ? importado._vidaLaboralMigrado : (estadoActual._vidaLaboralMigrado ?? false),
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

// ── Horas trabajadas (24/08/2026) ─────────────────────────────────────────────

/**
 * Jornada completa de referencia del Convenio de Hostelería y Alojamientos
 * Turísticos de Valladolid (Art. 4): 1.782 horas/año a jornada completa.
 */
export const JORNADA_ANUAL_CONVENIO = 1782;

const HORAS_POR_DEFECTO_SERVICIO = { boda: 5, comidas: 4, cenas: 4, servicio3h: 3, especial: 4 };

/**
 * Añade el campo "horas" a los servicios de un estado que no lo tuvieran
 * (perfiles guardados antes de esta mejora), para que el resto de funciones
 * no fallen con datos antiguos. Muta y devuelve el mismo array.
 * @param {Array} servicios
 * @returns {Array}
 */
export function migrarHorasServicios(servicios) {
  (servicios || []).forEach(s => {
    if (s.horas == null) {
      s.horas = HORAS_POR_DEFECTO_SERVICIO[s.id] != null ? HORAS_POR_DEFECTO_SERVICIO[s.id] : 4;
    }
  });
  return servicios;
}

/**
 * Añade el campo "km" a los lugares de un estado que no lo tuvieran
 * (perfiles guardados antes de esta mejora, 25/08/2026), a 0 por defecto —
 * es la distancia desde Valladolid hasta el lugar, solo informativa, y se
 * rellena a mano en Configuración ya que no se puede adivinar. Muta y
 * devuelve el mismo array.
 * @param {Array} lugares
 * @returns {Array}
 */
export function migrarKmLugares(lugares) {
  (lugares || []).forEach(l => {
    if (l.km == null) l.km = 0;
  });
  return lugares;
}

/**
 * Km POR CARRETERA, SOLO IDA, consultados el 25/08/2026 (primer intento,
 * antes de que el usuario confirmara los reales). Se mantienen solo para
 * poder detectar y corregir automáticamente perfiles que se sembraron con
 * estos valores equivocados (ver `resembrarKmV2`) — no se usan para sembrar
 * nada nuevo.
 */
const KM_POR_DEFECTO_LUGAR_V1 = {
  arzuaga: 35,
  olmedo: 43,
  valbuena: 41,
  afpesquera: 51,
  medinarioseco: 41,
};

/**
 * Km de IDA Y VUELTA desde Valladolid hasta los lugares que vienen por
 * defecto en la app, confirmados por el usuario el 25/08/2026 (sustituyen a
 * los de `KM_POR_DEFECTO_LUGAR_V1`, que eran solo de ida y además no
 * incluían "concejo" ni "montico").
 */
export const KM_POR_DEFECTO_LUGAR = {
  arzuaga: 80,
  olmedo: 81,
  valbuena: 96,
  concejo: 70,
  montico: 44.5,
  afpesquera: 116,
  medinarioseco: 86,
};

/**
 * Rellena, UNA SOLA VEZ por perfil, el km de los lugares por defecto que se
 * pudieron identificar con datos públicos (25/08/2026), para no dejar a los
 * usuarios que ya tenían el perfil creado con todo a 0 para siempre. Se
 * marca con `state._kmSembrado` para no volver a pisar valores que el
 * usuario haya cambiado él mismo más adelante (incluido dejarlos a 0 a
 * propósito). No toca el dinero en ningún caso.
 * @param {object} state
 * @returns {object} el mismo estado, mutado
 */
export function sembrarKmConocidos(state) {
  if (!state || state._kmSembrado) return state;
  (state.lugares || []).forEach(l => {
    if ((l.km == null || l.km === 0) && KM_POR_DEFECTO_LUGAR[l.id] != null) {
      l.km = KM_POR_DEFECTO_LUGAR[l.id];
    }
  });
  state._kmSembrado = true;
  return state;
}

/**
 * Corrige, UNA SOLA VEZ por perfil, los km sembrados automáticamente por
 * `sembrarKmConocidos` con los valores equivocados de la primera versión
 * (25/08/2026: eran solo de ida, y no incluían "concejo" ni "montico"). Solo
 * toca un lugar si su km actual coincide EXACTAMENTE con el valor viejo
 * (V1) o sigue a 0 — es decir, si el usuario nunca lo tocó a mano. Si el
 * usuario ya editó el km de un lugar a otro número cualquiera, se deja tal
 * cual, no se pisa. Se marca con `state._kmSembradoV2` para no repetirlo.
 * No toca el dinero en ningún caso.
 * @param {object} state
 * @returns {object} el mismo estado, mutado
 */
export function resembrarKmV2(state) {
  if (!state || state._kmSembradoV2) return state;
  (state.lugares || []).forEach(l => {
    if (KM_POR_DEFECTO_LUGAR[l.id] == null) return;
    const esValorViejoSinTocar = l.km === KM_POR_DEFECTO_LUGAR_V1[l.id];
    const esCero = l.km == null || l.km === 0;
    if (esValorViejoSinTocar || esCero) {
      l.km = KM_POR_DEFECTO_LUGAR[l.id];
    }
  });
  state._kmSembradoV2 = true;
  return state;
}

// ── Vida Laboral por mes (25/08/2026) ────────────────────────────────────────

/**
 * Migra, UNA SOLA VEZ por perfil, el antiguo valor único `vidaLaboralPct` al
 * nuevo `vidaLaboralPorMes` (un valor por mes, para poder comparar mes a mes
 * en vez de perder el dato anterior cada vez que se actualiza). El valor
 * antiguo se asigna al mes/año que se pasan como referencia (normalmente el
 * mes que estaba abierto cuando se hizo esta mejora). Se marca con
 * `state._vidaLaboralMigrado` para no repetirlo.
 * @param {object} state
 * @param {number} year
 * @param {number} month - base 0
 * @returns {object} el mismo estado, mutado
 */
export function migrarVidaLaboralPorMes(state, year, month) {
  if (!state) return state;
  if (state.vidaLaboralPorMes == null) state.vidaLaboralPorMes = {};
  if (!state._vidaLaboralMigrado && state.vidaLaboralPct != null) {
    const key = `${year}-${month}`;
    if (state.vidaLaboralPorMes[key] == null) {
      state.vidaLaboralPorMes[key] = state.vidaLaboralPct;
    }
  }
  state._vidaLaboralMigrado = true;
  return state;
}

/**
 * % de Vida Laboral (CTP) introducido a mano para un mes concreto, o null si
 * no se ha introducido ninguno para ese mes.
 * @param {object} state
 * @param {number} year
 * @param {number} month - base 0
 * @returns {number|null}
 */
export function vidaLaboralDelMes(state, year, month) {
  const v = (state && state.vidaLaboralPorMes && state.vidaLaboralPorMes[`${year}-${month}`]);
  return v == null ? null : v;
}

/**
 * Km recorridos que se congelan en una entrada al registrarla o editarla:
 * en ruta "por km" son los km calculados/introducidos; en trayecto a precio
 * fijo ("si") es el km configurado en el lugar (distancia desde Valladolid,
 * solo informativo — nunca afecta al precio, que depende únicamente de
 * "coche" del lugar); en cualquier otro caso, 0.
 * @param {object} params
 * @param {string} params.coche - 'no' | 'si' | 'km'
 * @param {number} [params.km]  - km calculados/manuales (solo relevante si coche==='km')
 * @param {object} [params.lug] - lugar seleccionado (solo relevante si coche==='si')
 * @returns {number}
 */
export function kmEntryFijo({ coche, km = 0, lug } = {}) {
  if (coche === 'km') return km || 0;
  if (coche === 'si' && lug) return lug.km || 0;
  return 0;
}

/**
 * Horas totales que representa una entrada: horas del servicio (o de las
 * paradas de una ruta) + horas extra + horas nocturnas.
 * @param {object} e     - entrada (con servId u opcionalmente stops)
 * @param {object} state - estado del perfil (para resolver los servicios)
 * @returns {number}
 */
export function horasEntry(e, state) {
  // Entradas antiguas (antes de esta mejora) no tienen horasServ guardado:
  // se calcula al vuelo con la configuración actual de servicios como mejor
  // aproximación posible.
  let horasServ = e.horasServ;
  if (horasServ == null) {
    if (e.stops && e.stops.length > 0) {
      horasServ = e.stops.reduce((s, st) => {
        const sv = state.servicios.find(x => x.id === st.servId);
        if (!sv) return s;
        // Servicio precio libre (Especial): las horas se introducían a mano,
        // no hay valor de configuración que aproximar — se usa lo guardado
        // en la propia parada si existe, si no, 0.
        if (sv.precio === 0) return s + (st.especHoras || 0);
        return s + (sv.horas != null ? sv.horas : 4);
      }, 0);
    } else {
      const sv = state.servicios.find(x => x.id === e.servId);
      if (!sv) horasServ = 0;
      else if (sv.precio === 0) horasServ = 0; // precio libre sin horasServ congelado: no hay nada que aproximar
      else horasServ = sv.horas != null ? sv.horas : 4;
    }
  }
  return horasServ + (e.hext || 0) + (e.hnoc || 0);
}

/**
 * Horas trabajadas y % de jornada completa (según el convenio) para un
 * conjunto de entradas de un mes.
 * @param {Array}  entries
 * @param {object} state
 * @returns {{ horas: number, pctJornada: number }}
 */
export function calcHorasMes(entries, state) {
  const horas = (entries || []).reduce((s, e) => s + horasEntry(e, state), 0);
  const jornadaMensual = JORNADA_ANUAL_CONVENIO / 12;
  const pctJornada = jornadaMensual > 0 ? parseFloat((horas / jornadaMensual * 100).toFixed(2)) : 0;
  return { horas: parseFloat(horas.toFixed(2)), pctJornada };
}

// ── Avisos de entradas raras o duplicadas (25/08/2026) ───────────────────────

/** Umbral de horas extra/nocturnas en un solo día a partir del cual se avisa. */
export const UMBRAL_HORAS_AVISO = 6;

/** Umbral de kilómetros en una ruta a partir del cual se avisa. */
export const UMBRAL_KM_AVISO = 150;

/**
 * Calcula los avisos (no bloqueantes) que aplican a una entrada antes de
 * guardarla: día duplicado, horas extra/nocturnas fuera de lo normal, km
 * fuera de lo normal, y horas de "Especial" dejadas a 0. Ninguno de estos
 * avisos impide guardar — solo piden confirmación al usuario.
 * @param {object} params
 * @param {number}   params.dia
 * @param {number}   [params.hext]
 * @param {number}   [params.hnoc]
 * @param {number}   [params.km]
 * @param {boolean}  [params.esRuta]           - true si el coche es "por km"
 * @param {Array}    [params.entradasDelMes]   - entradas ya guardadas ese mes
 * @param {boolean}  [params.especLibreConCero] - true si hay algún servicio de precio libre con 0h
 * @returns {string[]} lista de avisos (vacía si no hay ninguno)
 */
export function calcularAvisosEntrada({
  dia, hext = 0, hnoc = 0, km = 0, esRuta = false,
  entradasDelMes = [], especLibreConCero = false,
} = {}) {
  const avisos = [];
  if (dia != null && !esRuta && entradasDelMes.some(e => e.dia === dia)) {
    avisos.push(`Ya hay una entrada el día ${dia}.`);
  }
  if (hext > UMBRAL_HORAS_AVISO) {
    avisos.push(`${hext}h de horas extra es mucho para un solo día — revísalo.`);
  }
  if (hnoc > UMBRAL_HORAS_AVISO) {
    avisos.push(`${hnoc}h de horas nocturnas es mucho para un solo día — revísalo.`);
  }
  if (esRuta && km > UMBRAL_KM_AVISO) {
    avisos.push(`${km} km es una distancia grande — comprueba que no sobra un cero.`);
  }
  if (especLibreConCero) {
    avisos.push('Has dejado las horas de "Especial" a 0.');
  }
  return avisos;
}

// ── Gráfico de ingresos y comparación entre años (25/08/2026) ────────────────

/**
 * Años (número) para los que hay al menos una entrada en el estado.
 * @param {object} state
 * @returns {number[]} años ordenados de más reciente a más antiguo
 */
export function aniosConDatos(state) {
  const anios = new Set();
  Object.keys((state && state.entries) || {}).forEach(k => {
    const anio = parseInt(k.split('-')[0], 10);
    if (!isNaN(anio)) anios.add(anio);
  });
  return Array.from(anios).sort((a, b) => b - a);
}

/**
 * Ingresos brutos por mes (12 valores, Enero a Diciembre) de un año dado.
 * @param {object} state
 * @param {number} year
 * @returns {number[]}
 */
export function ingresosPorMes(state, year) {
  const arr = [];
  for (let i = 0; i < 12; i++) {
    const key = `${year}-${i}`;
    const entries = (state && state.entries && state.entries[key]) || [];
    arr.push(parseFloat(entries.reduce((s, e) => s + e.total, 0).toFixed(2)));
  }
  return arr;
}

/**
 * Datos listos para el gráfico de ingresos y su comparación opcional con
 * otro año.
 * @param {object} state
 * @param {number} anioActual
 * @param {number|null} [anioComparar]
 * @returns {{actual:number[], comparar:number[]|null, totalActual:number, totalComparar:number|null, diffPct:number|null}}
 */
export function compararAnios(state, anioActual, anioComparar) {
  const actual = ingresosPorMes(state, anioActual);
  const comparar = (anioComparar != null) ? ingresosPorMes(state, anioComparar) : null;
  const totalActual = parseFloat(actual.reduce((s, v) => s + v, 0).toFixed(2));
  const totalComparar = comparar ? parseFloat(comparar.reduce((s, v) => s + v, 0).toFixed(2)) : null;
  const diffPct = (comparar && totalComparar > 0)
    ? parseFloat(((totalActual - totalComparar) / totalComparar * 100).toFixed(1))
    : null;
  return { actual, comparar, totalActual, totalComparar, diffPct };
}

// ── Coche: km y dinero generado en el año (25/08/2026) ───────────────────────

/**
 * Km que aporta una entrada al total de coche: los propios si los tiene
 * (rutas "por km", o entradas de precio fijo con el km ya congelado), o si
 * es una entrada de precio fijo ("si") sin km propio (registrada antes de
 * esta mejora del 25/08/2026, o antes de rellenar el km del lugar en
 * Configuración) se busca el km configurado AHORA MISMO para ese lugar —
 * así, en cuanto se rellena el km de un lugar en Configuración, todas sus
 * entradas (pasadas y futuras) cuentan correctamente, sin tocar el dinero
 * (que sigue viniendo solo de precioCoche).
 * @param {object} e        - entrada
 * @param {Array}  lugares  - state.lugares
 * @returns {number}
 */
export function kmEntryCoche(e, lugares = []) {
  if (e.coche === 'si' && !e.km) {
    const lug = lugares.find(l => l.id === e.lugId);
    return (lug && lug.km) || 0;
  }
  return e.km || 0;
}

/**
 * Total de kilómetros recorridos y dinero generado por coche/gasolina
 * (tanto precio fijo por lugar como por km) a lo largo de un año.
 * @param {object} state
 * @param {number} year
 * @returns {{km:number, dinero:number}}
 */
export function datosCocheAnual(state, year) {
  let km = 0, dinero = 0;
  const lugares = (state && state.lugares) || [];
  for (let i = 0; i < 12; i++) {
    const key = `${year}-${i}`;
    const entries = (state && state.entries && state.entries[key]) || [];
    entries.forEach(e => {
      km += kmEntryCoche(e, lugares);
      dinero += e.precioCoche || 0;
    });
  }
  return { km: parseFloat(km.toFixed(1)), dinero: parseFloat(dinero.toFixed(2)) };
}

/**
 * Igual que datosCocheAnual, pero desglosado mes a mes (12 valores, Enero a
 * Diciembre), para poder ver la evolución dentro del año además del total.
 * @param {object} state
 * @param {number} year
 * @returns {Array<{mes:string, km:number, dinero:number}>}
 */
export function datosCocheMensual(state, year) {
  const lugares = (state && state.lugares) || [];
  return MONTHS.map((mes, i) => {
    const key = `${year}-${i}`;
    const entries = (state && state.entries && state.entries[key]) || [];
    let km = 0, dinero = 0;
    entries.forEach(e => {
      km += kmEntryCoche(e, lugares);
      dinero += e.precioCoche || 0;
    });
    return { mes, km: parseFloat(km.toFixed(1)), dinero: parseFloat(dinero.toFixed(2)) };
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
