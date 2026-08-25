/**
 * tests/exvall.test.js — Suite completa Exvall CM
 * Ejecutar con: npm test
 */

import { describe, it, expect } from 'vitest';
import {
  calcularTotal,
  calcularNeto,
  calcularRetencion,
  validarDia,
  diasEnMes,
  validarBackup,
  aplicarBackup,
  contarEntradas,
  buildResumenAnual,
  pdfTxt,
  DEFAULT_STATE,
  MONTHS,
  migrarHorasServicios,
  horasEntry,
  calcHorasMes,
  JORNADA_ANUAL_CONVENIO,
  calcularAvisosEntrada,
  UMBRAL_HORAS_AVISO,
  UMBRAL_KM_AVISO,
  aniosConDatos,
  ingresosPorMes,
  compararAnios,
  datosCocheAnual,
  datosCocheMensual,
  kmEntryCoche,
  migrarKmLugares,
  kmEntryFijo,
  sembrarKmConocidos,
  KM_POR_DEFECTO_LUGAR,
  resembrarKmV2,
  migrarVidaLaboralPorMes,
  vidaLaboralDelMes,
} from './logica.js';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS de test
// ─────────────────────────────────────────────────────────────────────────────

/** Estado mínimo para tests de cálculo */
const mkState = (overrides = {}) => ({
  ...DEFAULT_STATE(),
  ...overrides,
});

// ─────────────────────────────────────────────────────────────────────────────
// 2.3 — CÁLCULO DE TOTALES
// ─────────────────────────────────────────────────────────────────────────────

describe('calcularTotal — servicio sin coche', () => {

  it('Boda sin extras ni coche → 80€', () => {
    const state = mkState();
    const total = calcularTotal({ coche:'no', servId:'boda', lugId:'arzuaga', state });
    expect(total).toBe(80);
  });

  it('Comidas sin extras ni coche → 65€', () => {
    const state = mkState();
    expect(calcularTotal({ coche:'no', servId:'comidas', lugId:'arzuaga', state })).toBe(65);
  });

  it('Servicio 3H sin extras ni coche → 45€', () => {
    const state = mkState();
    expect(calcularTotal({ coche:'no', servId:'servicio3h', lugId:'arzuaga', state })).toBe(45);
  });

  it('Boda + 2 horas extra (12€/h) → 80 + 24 = 104€', () => {
    const state = mkState();
    expect(calcularTotal({ coche:'no', servId:'boda', lugId:'arzuaga', hext:2, state })).toBe(104);
  });

  it('Boda + 1.5 horas nocturnas (15€/h) → 80 + 22.5 = 102.5€', () => {
    const state = mkState();
    expect(calcularTotal({ coche:'no', servId:'boda', lugId:'arzuaga', hnoc:1.5, state })).toBe(102.5);
  });

  it('Boda + 1 extra + 1 nocturna → 80 + 12 + 15 = 107€', () => {
    const state = mkState();
    expect(calcularTotal({ coche:'no', servId:'boda', lugId:'arzuaga', hext:1, hnoc:1, state })).toBe(107);
  });

});

describe('calcularTotal — servicio con coche fijo', () => {

  it('Boda en Arzuaga con coche fijo → 80 + 18 = 98€', () => {
    const state = mkState();
    expect(calcularTotal({ coche:'si', servId:'boda', lugId:'arzuaga', state })).toBe(98);
  });

  it('Boda en Olmedo con coche fijo → 80 + 20 = 100€', () => {
    const state = mkState();
    expect(calcularTotal({ coche:'si', servId:'boda', lugId:'olmedo', state })).toBe(100);
  });

  it('Cenas en Montico con coche + 1 extra → 65 + 7 + 12 = 84€', () => {
    const state = mkState();
    expect(calcularTotal({ coche:'si', servId:'cenas', lugId:'montico', hext:1, state })).toBe(84);
  });

});

describe('calcularTotal — servicio por km', () => {

  it('Ruta de 50km a 0.23€/km → 11.5€ solo de coche', () => {
    const state = mkState();
    const stops = [{ servId:'boda', especPrecio:0 }];
    // km solo, sin servicio en stops (precio 0 porque boda tiene precio>0)
    const boda = state.servicios.find(s => s.id === 'boda');
    const totalServicios = boda.precio; // 80
    const totalKm = 50 * 0.23;         // 11.5
    expect(calcularTotal({ coche:'km', km:50, stops, state })).toBe(parseFloat((totalServicios + totalKm).toFixed(2)));
  });

  it('Ruta 100km → total km = 23€', () => {
    const state = mkState();
    const stops = [{ servId:'boda', especPrecio:0 }];
    const result = calcularTotal({ coche:'km', km:100, stops, state });
    expect(result).toBe(parseFloat((80 + 23).toFixed(2)));
  });

  it('Especial a 150€ + 50km → 150 + 11.5 = 161.5€', () => {
    const state = mkState();
    const stops = [{ servId:'especial', especPrecio:150 }];
    expect(calcularTotal({ coche:'km', km:50, stops, state })).toBe(161.5);
  });

});

describe('calcularTotal — servicio Especial precio libre', () => {

  it('Especial a 200€ sin coche → 200€', () => {
    const state = mkState();
    expect(calcularTotal({ coche:'no', servId:'especial', lugId:'arzuaga', manual:200, state })).toBe(200);
  });

  it('Especial a 150€ + coche Arzuaga → 150 + 18 = 168€', () => {
    const state = mkState();
    expect(calcularTotal({ coche:'si', servId:'especial', lugId:'arzuaga', manual:150, state })).toBe(168);
  });

});

describe('calcularNeto y calcularRetencion', () => {

  it('100€ bruto al 8% IRPF → neto 92€', () => {
    expect(calcularNeto(100, 8)).toBe(92);
  });

  it('100€ bruto al 15% IRPF → neto 85€', () => {
    expect(calcularNeto(100, 15)).toBe(85);
  });

  it('100€ bruto al 0% IRPF → neto 100€', () => {
    expect(calcularNeto(100, 0)).toBe(100);
  });

  it('80€ bruto al 8% IRPF → retención 6.4€', () => {
    expect(calcularRetencion(80, 8)).toBe(6.4);
  });

  it('98€ bruto al 8% IRPF → neto = 90.16€', () => {
    expect(calcularNeto(98, 8)).toBe(90.16);
  });

  it('neto + retención = bruto (siempre)', () => {
    const bruto = 107.50;
    const irpf  = 8;
    const neto  = calcularNeto(bruto, irpf);
    const ret   = calcularRetencion(bruto, irpf);
    expect(parseFloat((neto + ret).toFixed(2))).toBe(bruto);
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// 2.4 — VALIDACIÓN DE FECHAS
// ─────────────────────────────────────────────────────────────────────────────

describe('diasEnMes', () => {

  it('Enero 2025 tiene 31 días', () => {
    expect(diasEnMes(2025, 0)).toBe(31);
  });

  it('Febrero 2025 tiene 28 días (no bisiesto)', () => {
    expect(diasEnMes(2025, 1)).toBe(28);
  });

  it('Febrero 2024 tiene 29 días (bisiesto)', () => {
    expect(diasEnMes(2024, 1)).toBe(29);
  });

  it('Abril tiene 30 días', () => {
    expect(diasEnMes(2025, 3)).toBe(30);
  });

  it('Diciembre tiene 31 días', () => {
    expect(diasEnMes(2025, 11)).toBe(31);
  });

});

describe('validarDia', () => {

  it('Día 31 en Enero (0) → válido', () => {
    expect(validarDia(31, 2025, 0).ok).toBe(true);
  });

  it('Día 31 en Abril (3) → inválido', () => {
    const r = validarDia(31, 2025, 3);
    expect(r.ok).toBe(false);
    expect(r.mensaje).toContain('30');
  });

  it('Día 30 en Febrero (1) año normal → inválido', () => {
    expect(validarDia(30, 2025, 1).ok).toBe(false);
  });

  it('Día 29 en Febrero (1) año bisiesto → válido', () => {
    expect(validarDia(29, 2024, 1).ok).toBe(true);
  });

  it('Día 28 en Febrero (1) año normal → válido', () => {
    expect(validarDia(28, 2025, 1).ok).toBe(true);
  });

  it('Día 0 → inválido', () => {
    expect(validarDia(0, 2025, 0).ok).toBe(false);
  });

  it('Día negativo → inválido', () => {
    expect(validarDia(-1, 2025, 0).ok).toBe(false);
  });

  it('NaN → inválido', () => {
    expect(validarDia(NaN, 2025, 0).ok).toBe(false);
  });

  it('Día 1 siempre válido', () => {
    for (let m = 0; m < 12; m++) {
      expect(validarDia(1, 2025, m).ok).toBe(true);
    }
  });

  it('El mensaje incluye el nombre del mes cuando el día es inválido', () => {
    const r = validarDia(31, 2025, 3); // Abril
    expect(r.mensaje).toContain('Abril');
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// 2.5 — BACKUP: EXPORTAR E IMPORTAR
// ─────────────────────────────────────────────────────────────────────────────

describe('validarBackup', () => {

  it('Backup completo válido → ok: true', () => {
    const backup = {
      entries:   { '2025-0': [{ dia:1, total:80 }] },
      servicios: [{ id:'boda', name:'Boda', precio:80 }],
      lugares:   [{ id:'arzuaga', name:'Arzuaga', coche:18 }],
      extras:    { hext:12, hnoc:15, km:0.23 },
      irpf:      8,
    };
    expect(validarBackup(backup).ok).toBe(true);
  });

  it('null → inválido', () => {
    expect(validarBackup(null).ok).toBe(false);
  });

  it('String → inválido', () => {
    expect(validarBackup('hola').ok).toBe(false);
  });

  it('Sin campo entries → inválido', () => {
    const backup = { servicios:[], lugares:[], extras:{}, irpf:8 };
    const r = validarBackup(backup);
    expect(r.ok).toBe(false);
    expect(r.mensaje).toContain('entries');
  });

  it('Sin campo servicios → inválido', () => {
    const backup = { entries:{}, lugares:[], extras:{}, irpf:8 };
    expect(validarBackup(backup).ok).toBe(false);
    expect(validarBackup(backup).mensaje).toContain('servicios');
  });

  it('entries no es objeto → inválido', () => {
    const backup = { entries:'mal', servicios:[], lugares:[], extras:{}, irpf:8 };
    expect(validarBackup(backup).ok).toBe(false);
  });

  it('servicios no es array → inválido', () => {
    const backup = { entries:{}, servicios:'mal', lugares:[], extras:{}, irpf:8 };
    expect(validarBackup(backup).ok).toBe(false);
  });

});

describe('aplicarBackup — ciclo exportar → importar', () => {

  it('Los datos importados se aplican sobre el estado', () => {
    const estadoActual = DEFAULT_STATE();
    const backup = {
      entries:   { '2025-0': [{ dia:5, total:80, irpf:8 }] },
      banco:     { '2025-0': 73.6 },
      servicios: estadoActual.servicios,
      lugares:   estadoActual.lugares,
      extras:    estadoActual.extras,
      irpf:      8,
      irpfHist:  [{ valor:8, desde:'01/01/2025' }],
      nombre:    'María',
    };
    const nuevo = aplicarBackup(estadoActual, backup);
    expect(nuevo.entries['2025-0']).toHaveLength(1);
    expect(nuevo.entries['2025-0'][0].total).toBe(80);
    expect(nuevo.nombre).toBe('María');
    expect(nuevo.banco['2025-0']).toBe(73.6);
  });

  it('Ciclo completo: estado → backup → estado restaurado es idéntico', () => {
    const original = DEFAULT_STATE();
    original.entries['2025-2'] = [
      { dia:10, total:98, irpf:8 },
      { dia:15, total:65, irpf:8 },
    ];
    original.nombre = 'José';
    original.irpf   = 8;

    // Simular exportar (JSON.stringify → JSON.parse)
    const backup = JSON.parse(JSON.stringify(original));

    // Simular importar
    const restaurado = aplicarBackup(DEFAULT_STATE(), backup);

    expect(restaurado.entries['2025-2']).toHaveLength(2);
    expect(restaurado.entries['2025-2'][0].total).toBe(98);
    expect(restaurado.nombre).toBe('José');
    expect(restaurado.irpf).toBe(8);
  });

  it('Importar no borra datos no incluidos en el backup (usa defaults)', () => {
    const estadoActual = DEFAULT_STATE();
    const backupParcial = {
      entries:   { '2025-5': [{ dia:1, total:80, irpf:8 }] },
      servicios: estadoActual.servicios,
      lugares:   estadoActual.lugares,
      extras:    estadoActual.extras,
      irpf:      8,
    };
    const nuevo = aplicarBackup(estadoActual, backupParcial);
    // banco no estaba en el backup, debe ser {} (no undefined)
    expect(nuevo.banco).toEqual({});
  });

  it('El % de Vida Laboral viaja con el backup si está presente', () => {
    const estadoActual = DEFAULT_STATE();
    const backup = {
      entries: {}, servicios: estadoActual.servicios, lugares: estadoActual.lugares,
      extras: estadoActual.extras, irpf: 8, vidaLaboralPct: 87.5,
    };
    const nuevo = aplicarBackup(estadoActual, backup);
    expect(nuevo.vidaLaboralPct).toBe(87.5);
  });

  it('El % de Vida Laboral se conserva del estado actual si el backup no lo trae', () => {
    const estadoActual = { ...DEFAULT_STATE(), vidaLaboralPct: 95 };
    const backup = {
      entries: {}, servicios: estadoActual.servicios, lugares: estadoActual.lugares,
      extras: estadoActual.extras, irpf: 8,
    };
    const nuevo = aplicarBackup(estadoActual, backup);
    expect(nuevo.vidaLaboralPct).toBe(95);
  });

});

describe('contarEntradas', () => {

  it('Entries vacío → 0', () => {
    expect(contarEntradas({})).toBe(0);
  });

  it('Un mes con 3 entradas → 3', () => {
    const entries = { '2025-0': [{},{},{}] };
    expect(contarEntradas(entries)).toBe(3);
  });

  it('Varios meses → suma total', () => {
    const entries = { '2025-0': [{},{}], '2025-1': [{}], '2025-5': [{},{},{}] };
    expect(contarEntradas(entries)).toBe(6);
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// EXTRAS — pdfTxt y buildResumenAnual
// ─────────────────────────────────────────────────────────────────────────────

describe('pdfTxt — normalización para PDF', () => {

  it('Elimina vocales con tilde', () => {
    expect(pdfTxt('Canción')).toBe('Cancion');
  });

  it('Elimina ñ y Ñ', () => {
    expect(pdfTxt('España')).toBe('Espana');
    expect(pdfTxt('ÑoÑo')).toBe('NoNo');
  });

  it('Sustituye € por EUR', () => {
    expect(pdfTxt('100 €')).toBe('100 EUR');
  });

  it('String vacío → string vacío', () => {
    expect(pdfTxt('')).toBe('');
  });

  it('null/undefined → string vacío', () => {
    expect(pdfTxt(null)).toBe('');
    expect(pdfTxt(undefined)).toBe('');
  });

  it('Sin caracteres especiales → sin cambios', () => {
    expect(pdfTxt('Boda 2025')).toBe('Boda 2025');
  });

  it('Texto complejo con mezcla', () => {
    expect(pdfTxt('José — Arzuagá 80,00 €')).toBe('Jose - Arzuaga 80,00 EUR');
  });

});

describe('buildResumenAnual', () => {

  it('Sin entradas → todos los meses con bruto 0', () => {
    const state = DEFAULT_STATE();
    const resumen = buildResumenAnual(state, 2025);
    expect(resumen).toHaveLength(12);
    resumen.forEach(r => {
      expect(r.bruto).toBe(0);
      expect(r.neto).toBe(0);
    });
  });

  it('Con entradas en enero → bruto correcto', () => {
    const state = DEFAULT_STATE();
    state.entries['2025-0'] = [
      { total:80, irpf:8 },
      { total:65, irpf:8 },
    ];
    const resumen = buildResumenAnual(state, 2025);
    expect(resumen[0].bruto).toBe(145);
    expect(resumen[0].neto).toBe(parseFloat((145 * 0.92).toFixed(2)));
  });

  it('El banco reduce el "en mano" correctamente', () => {
    const state = DEFAULT_STATE();
    state.entries['2025-0'] = [{ total:100, irpf:8 }];
    // Ingresado en banco: 92€ (neto de 100€ al 8%)
    state.banco['2025-0'] = 92;
    const resumen = buildResumenAnual(state, 2025);
    // brutoCubierto = 92 / 0.92 = 100 → mano = max(0, 100-100) = 0
    expect(resumen[0].mano).toBe(0);
  });

  it('Los nombres de los meses son correctos', () => {
    const state = DEFAULT_STATE();
    const resumen = buildResumenAnual(state, 2025);
    expect(resumen[0].mes).toBe('Enero');
    expect(resumen[11].mes).toBe('Diciembre');
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// HORAS TRABAJADAS (24/08/2026)
// ─────────────────────────────────────────────────────────────────────────────

describe('migrarHorasServicios', () => {

  it('Añade las horas por defecto a servicios sin ese campo', () => {
    const servicios = [
      { id: 'boda', name: 'Boda', precio: 80 },
      { id: 'servicio3h', name: 'Servicio 3H', precio: 45 },
      { id: 'otro-cualquiera', name: 'Otro', precio: 20 },
    ];
    migrarHorasServicios(servicios);
    expect(servicios[0].horas).toBe(5);
    expect(servicios[1].horas).toBe(3);
    expect(servicios[2].horas).toBe(4); // sin default conocido → 4 por defecto
  });

  it('No sobrescribe las horas si ya existen', () => {
    const servicios = [{ id: 'boda', name: 'Boda', precio: 80, horas: 6 }];
    migrarHorasServicios(servicios);
    expect(servicios[0].horas).toBe(6);
  });

  it('DEFAULT_STATE ya trae las horas por defecto correctas', () => {
    const state = DEFAULT_STATE();
    const boda = state.servicios.find(s => s.id === 'boda');
    const s3h  = state.servicios.find(s => s.id === 'servicio3h');
    const resto = state.servicios.find(s => s.id === 'comidas');
    expect(boda.horas).toBe(5);
    expect(s3h.horas).toBe(3);
    expect(resto.horas).toBe(4);
  });

  it('DEFAULT_STATE trae vidaLaboralPct a null (sin dato introducido)', () => {
    const state = DEFAULT_STATE();
    expect(state.vidaLaboralPct).toBeNull();
  });

  it('DEFAULT_STATE trae ultimaSincronizacionNube a null (sin sincronizar aún)', () => {
    const state = DEFAULT_STATE();
    expect(state.ultimaSincronizacionNube).toBeNull();
  });

});

describe('migrarKmLugares', () => {

  it('Añade km a 0 a los lugares que no tienen ese campo', () => {
    const lugares = [
      { id: 'olmedo', name: 'Olmedo', coche: 20 },
      { id: 'arzuaga', name: 'Arzuaga', coche: 18 },
    ];
    migrarKmLugares(lugares);
    expect(lugares[0].km).toBe(0);
    expect(lugares[1].km).toBe(0);
  });

  it('No sobrescribe el km si ya existe', () => {
    const lugares = [{ id: 'olmedo', name: 'Olmedo', coche: 20, km: 35 }];
    migrarKmLugares(lugares);
    expect(lugares[0].km).toBe(35);
  });

  it('DEFAULT_STATE ya trae km a 0 en todos los lugares', () => {
    const state = DEFAULT_STATE();
    expect(state.lugares.every(l => l.km === 0)).toBe(true);
  });

});

describe('sembrarKmConocidos', () => {

  it('Rellena todos los lugares con km conocido, dejando a 0 solo "otro" (sin km configurado)', () => {
    const state = DEFAULT_STATE();
    sembrarKmConocidos(state);
    expect(state.lugares.find(l => l.id === 'olmedo').km).toBe(KM_POR_DEFECTO_LUGAR.olmedo);
    expect(state.lugares.find(l => l.id === 'arzuaga').km).toBe(KM_POR_DEFECTO_LUGAR.arzuaga);
    expect(state.lugares.find(l => l.id === 'valbuena').km).toBe(KM_POR_DEFECTO_LUGAR.valbuena);
    expect(state.lugares.find(l => l.id === 'afpesquera').km).toBe(KM_POR_DEFECTO_LUGAR.afpesquera);
    expect(state.lugares.find(l => l.id === 'medinarioseco').km).toBe(KM_POR_DEFECTO_LUGAR.medinarioseco);
    expect(state.lugares.find(l => l.id === 'concejo').km).toBe(KM_POR_DEFECTO_LUGAR.concejo);
    expect(state.lugares.find(l => l.id === 'montico').km).toBe(KM_POR_DEFECTO_LUGAR.montico);
    // Sin km configurado (no tiene sentido para un catch-all genérico): se queda en 0
    expect(state.lugares.find(l => l.id === 'otro').km).toBe(0);
    expect(state._kmSembrado).toBe(true);
  });

  it('Solo se ejecuta una vez: no pisa un km que el usuario haya cambiado él mismo después', () => {
    const state = DEFAULT_STATE();
    sembrarKmConocidos(state);
    // El usuario decide cambiar el km de Olmedo a mano después de la siembra
    state.lugares.find(l => l.id === 'olmedo').km = 5;
    sembrarKmConocidos(state); // segunda llamada, no debería hacer nada
    expect(state.lugares.find(l => l.id === 'olmedo').km).toBe(5);
  });

  it('No toca lugares personalizados añadidos por el usuario (id desconocido)', () => {
    const state = DEFAULT_STATE();
    state.lugares.push({ id: 'mi-lugar-custom', name: 'Mi lugar', coche: 10, km: 0 });
    sembrarKmConocidos(state);
    expect(state.lugares.find(l => l.id === 'mi-lugar-custom').km).toBe(0);
  });

});

describe('resembrarKmV2', () => {

  it('Corrige un lugar que tenía el valor viejo (V1, solo ida) sin tocar, al nuevo (ida y vuelta)', () => {
    const state = DEFAULT_STATE();
    // Simula un perfil ya sembrado con la primera versión (solo ida)
    state.lugares.find(l => l.id === 'olmedo').km = 43; // V1
    state._kmSembrado = true;
    resembrarKmV2(state);
    expect(state.lugares.find(l => l.id === 'olmedo').km).toBe(KM_POR_DEFECTO_LUGAR.olmedo); // 81
    expect(state._kmSembradoV2).toBe(true);
  });

  it('Rellena "concejo" y "montico" aunque sigan a 0 (la V1 no los incluía)', () => {
    const state = DEFAULT_STATE();
    state._kmSembrado = true; // ya sembrado con V1, concejo/montico se quedaron a 0
    resembrarKmV2(state);
    expect(state.lugares.find(l => l.id === 'concejo').km).toBe(KM_POR_DEFECTO_LUGAR.concejo);
    expect(state.lugares.find(l => l.id === 'montico').km).toBe(KM_POR_DEFECTO_LUGAR.montico);
  });

  it('NO pisa un km que el usuario haya cambiado él mismo a otro valor cualquiera', () => {
    const state = DEFAULT_STATE();
    state.lugares.find(l => l.id === 'olmedo').km = 25; // el usuario lo puso a mano
    state._kmSembrado = true;
    resembrarKmV2(state);
    expect(state.lugares.find(l => l.id === 'olmedo').km).toBe(25);
  });

  it('Solo se ejecuta una vez', () => {
    const state = DEFAULT_STATE();
    state._kmSembrado = true;
    resembrarKmV2(state);
    state.lugares.find(l => l.id === 'olmedo').km = 5; // el usuario lo cambia después
    resembrarKmV2(state); // segunda llamada, no debería tocar nada
    expect(state.lugares.find(l => l.id === 'olmedo').km).toBe(5);
  });

});

describe('kmEntryFijo', () => {

  it('Ruta "por km": devuelve los km pasados', () => {
    expect(kmEntryFijo({ coche: 'km', km: 42 })).toBe(42);
  });

  it('Ruta "por km" sin km → 0', () => {
    expect(kmEntryFijo({ coche: 'km' })).toBe(0);
  });

  it('Precio fijo ("si") con lugar con km configurado: congela ese km', () => {
    const lug = { id: 'olmedo', name: 'Olmedo', coche: 20, km: 33 };
    expect(kmEntryFijo({ coche: 'si', lug })).toBe(33);
  });

  it('Precio fijo ("si") con lugar sin km configurado (0 por defecto)', () => {
    const lug = { id: 'arzuaga', name: 'Arzuaga', coche: 18, km: 0 };
    expect(kmEntryFijo({ coche: 'si', lug })).toBe(0);
  });

  it('Precio fijo ("si") sin lugar resuelto → 0', () => {
    expect(kmEntryFijo({ coche: 'si', lug: null })).toBe(0);
  });

  it('Sin coche ("no") → 0', () => {
    const lug = { id: 'olmedo', name: 'Olmedo', coche: 20, km: 33 };
    expect(kmEntryFijo({ coche: 'no', lug })).toBe(0);
  });

});

describe('migrarVidaLaboralPorMes', () => {

  it('DEFAULT_STATE ya trae vidaLaboralPorMes vacío', () => {
    const state = DEFAULT_STATE();
    expect(state.vidaLaboralPorMes).toEqual({});
  });

  it('Migra el valor único antiguo al mes/año indicado', () => {
    const state = DEFAULT_STATE();
    state.vidaLaboralPct = 100;
    migrarVidaLaboralPorMes(state, 2026, 7); // Agosto
    expect(state.vidaLaboralPorMes['2026-7']).toBe(100);
    expect(state._vidaLaboralMigrado).toBe(true);
  });

  it('No hace nada si no había valor único antiguo', () => {
    const state = DEFAULT_STATE();
    migrarVidaLaboralPorMes(state, 2026, 7);
    expect(state.vidaLaboralPorMes).toEqual({});
  });

  it('Solo migra una vez: no pisa un valor de ese mes ya introducido después', () => {
    const state = DEFAULT_STATE();
    state.vidaLaboralPct = 100;
    migrarVidaLaboralPorMes(state, 2026, 7);
    state.vidaLaboralPorMes['2026-7'] = 50; // el usuario lo cambia a mano
    migrarVidaLaboralPorMes(state, 2026, 7); // segunda llamada, no debería tocar nada
    expect(state.vidaLaboralPorMes['2026-7']).toBe(50);
  });

  it('No sobrescribe si el mes de destino ya tenía un valor antes de migrar', () => {
    const state = DEFAULT_STATE();
    state.vidaLaboralPct = 100;
    state.vidaLaboralPorMes = { '2026-7': 80 };
    migrarVidaLaboralPorMes(state, 2026, 7);
    expect(state.vidaLaboralPorMes['2026-7']).toBe(80);
  });

});

describe('vidaLaboralDelMes', () => {

  it('Devuelve null si no hay valor guardado para ese mes', () => {
    const state = DEFAULT_STATE();
    expect(vidaLaboralDelMes(state, 2026, 7)).toBeNull();
  });

  it('Devuelve el valor guardado de ese mes concreto', () => {
    const state = DEFAULT_STATE();
    state.vidaLaboralPorMes = { '2026-2': 95, '2026-7': 100 };
    expect(vidaLaboralDelMes(state, 2026, 7)).toBe(100);
    expect(vidaLaboralDelMes(state, 2026, 2)).toBe(95);
  });

  it('No confunde meses de años distintos', () => {
    const state = DEFAULT_STATE();
    state.vidaLaboralPorMes = { '2025-7': 90 };
    expect(vidaLaboralDelMes(state, 2026, 7)).toBeNull();
  });

});

describe('horasEntry', () => {

  it('Entrada normal usa horasServ congelado si existe', () => {
    const state = mkState();
    const e = { servId: 'boda', horasServ: 5, hext: 0, hnoc: 0 };
    expect(horasEntry(e, state)).toBe(5);
  });

  it('Suma horas extra y nocturnas al horasServ congelado', () => {
    const state = mkState();
    const e = { servId: 'servicio3h', horasServ: 3, hext: 2, hnoc: 1 };
    expect(horasEntry(e, state)).toBe(6);
  });

  it('Entrada antigua sin horasServ calcula a partir del servicio actual', () => {
    const state = mkState();
    const e = { servId: 'boda', hext: 0, hnoc: 0 }; // sin horasServ
    expect(horasEntry(e, state)).toBe(5);
  });

  it('Entrada de ruta (stops) suma las horas de cada parada', () => {
    const state = mkState();
    const e = {
      stops: [{ servId: 'boda' }, { servId: 'servicio3h' }],
      hext: 0, hnoc: 0,
    };
    expect(horasEntry(e, state)).toBe(8); // 5 + 3
  });

  it('Servicio Especial (precio libre) usa el horasServ congelado a mano', () => {
    const state = mkState();
    const e = { servId: 'especial', horasServ: 6, hext: 0, hnoc: 0 };
    expect(horasEntry(e, state)).toBe(6);
  });

  it('Servicio Especial antiguo sin horasServ congelado → 0 (no hay valor que aproximar)', () => {
    const state = mkState();
    const e = { servId: 'especial', hext: 0, hnoc: 0 }; // sin horasServ
    expect(horasEntry(e, state)).toBe(0);
  });

  it('Parada Especial (stop) en ruta antigua usa especHoras de la propia parada', () => {
    const state = mkState();
    const e = {
      stops: [{ servId: 'especial', especHoras: 3 }, { servId: 'boda' }],
      hext: 0, hnoc: 0,
    };
    expect(horasEntry(e, state)).toBe(8); // 3 + 5
  });

  it('Parada Especial (stop) antigua sin especHoras → 0 para esa parada', () => {
    const state = mkState();
    const e = {
      stops: [{ servId: 'especial' }, { servId: 'boda' }],
      hext: 0, hnoc: 0,
    };
    expect(horasEntry(e, state)).toBe(5); // 0 + 5
  });

});

describe('calcularAvisosEntrada', () => {

  it('Sin nada raro, no hay avisos', () => {
    const avisos = calcularAvisosEntrada({ dia: 5, hext: 1, hnoc: 0, entradasDelMes: [] });
    expect(avisos).toEqual([]);
  });

  it('Avisa si ya hay una entrada ese mismo día (no ruta)', () => {
    const avisos = calcularAvisosEntrada({ dia: 5, entradasDelMes: [{ dia: 5 }] });
    expect(avisos.some(a => a.includes('Ya hay una entrada'))).toBe(true);
  });

  it('No avisa de día duplicado si es una ruta (esRuta:true)', () => {
    const avisos = calcularAvisosEntrada({ dia: 5, esRuta: true, entradasDelMes: [{ dia: 5 }] });
    expect(avisos.some(a => a.includes('Ya hay una entrada'))).toBe(false);
  });

  it(`Avisa si las horas extra superan el umbral (${UMBRAL_HORAS_AVISO}h)`, () => {
    const avisos = calcularAvisosEntrada({ dia: 5, hext: UMBRAL_HORAS_AVISO + 1, entradasDelMes: [] });
    expect(avisos.some(a => a.includes('horas extra'))).toBe(true);
  });

  it(`No avisa si las horas extra están justo en el umbral (${UMBRAL_HORAS_AVISO}h)`, () => {
    const avisos = calcularAvisosEntrada({ dia: 5, hext: UMBRAL_HORAS_AVISO, entradasDelMes: [] });
    expect(avisos.some(a => a.includes('horas extra'))).toBe(false);
  });

  it(`Avisa si las horas nocturnas superan el umbral (${UMBRAL_HORAS_AVISO}h)`, () => {
    const avisos = calcularAvisosEntrada({ dia: 5, hnoc: UMBRAL_HORAS_AVISO + 1, entradasDelMes: [] });
    expect(avisos.some(a => a.includes('horas nocturnas'))).toBe(true);
  });

  it(`Avisa si los km de una ruta superan el umbral (${UMBRAL_KM_AVISO}km)`, () => {
    const avisos = calcularAvisosEntrada({ dia: 5, esRuta: true, km: UMBRAL_KM_AVISO + 1, entradasDelMes: [] });
    expect(avisos.some(a => a.includes('km'))).toBe(true);
  });

  it('No avisa de km si no es una ruta, aunque el valor sea alto', () => {
    const avisos = calcularAvisosEntrada({ dia: 5, esRuta: false, km: 999, entradasDelMes: [] });
    expect(avisos.some(a => a.includes('km'))).toBe(false);
  });

  it('Avisa si el servicio Especial se deja con 0 horas', () => {
    const avisos = calcularAvisosEntrada({ dia: 5, especLibreConCero: true, entradasDelMes: [] });
    expect(avisos.some(a => a.includes('Especial'))).toBe(true);
  });

  it('Junta varios avisos a la vez si aplican varias reglas', () => {
    const avisos = calcularAvisosEntrada({
      dia: 5, hext: 10, hnoc: 8, entradasDelMes: [{ dia: 5 }], especLibreConCero: true,
    });
    expect(avisos.length).toBe(4);
  });

});

describe('aniosConDatos', () => {

  it('Devuelve una lista vacía si no hay entradas', () => {
    const state = mkState();
    expect(aniosConDatos(state)).toEqual([]);
  });

  it('Extrae los años con datos, sin duplicados y ordenados de más reciente a más antiguo', () => {
    const state = mkState({ entries: {
      '2024-0': [{ dia: 1, total: 50 }],
      '2024-5': [{ dia: 1, total: 50 }],
      '2025-3': [{ dia: 1, total: 50 }],
    }});
    expect(aniosConDatos(state)).toEqual([2025, 2024]);
  });

});

describe('ingresosPorMes', () => {

  it('Devuelve 12 posiciones (Enero-Diciembre), a 0 si no hay entradas ese mes', () => {
    const state = mkState({ entries: { '2025-2': [{ dia: 1, total: 80 }] } });
    const arr = ingresosPorMes(state, 2025);
    expect(arr).toHaveLength(12);
    expect(arr[2]).toBe(80);
    expect(arr[0]).toBe(0);
  });

  it('Suma varias entradas del mismo mes', () => {
    const state = mkState({ entries: { '2025-0': [{ dia: 1, total: 80 }, { dia: 5, total: 45 }] } });
    expect(ingresosPorMes(state, 2025)[0]).toBe(125);
  });

});

describe('compararAnios', () => {

  it('Sin año de comparación, solo devuelve los datos del año actual', () => {
    const state = mkState({ entries: { '2025-0': [{ dia: 1, total: 100 }] } });
    const r = compararAnios(state, 2025, null);
    expect(r.totalActual).toBe(100);
    expect(r.comparar).toBeNull();
    expect(r.diffPct).toBeNull();
  });

  it('Con año de comparación, calcula el % de diferencia correctamente', () => {
    const state = mkState({ entries: {
      '2025-0': [{ dia: 1, total: 110 }],
      '2024-0': [{ dia: 1, total: 100 }],
    }});
    const r = compararAnios(state, 2025, 2024);
    expect(r.totalActual).toBe(110);
    expect(r.totalComparar).toBe(100);
    expect(r.diffPct).toBe(10);
  });

  it('diffPct es null si el año de comparación no tiene ingresos (evita división por 0)', () => {
    const state = mkState({ entries: { '2025-0': [{ dia: 1, total: 100 }] } });
    const r = compararAnios(state, 2025, 2023);
    expect(r.totalComparar).toBe(0);
    expect(r.diffPct).toBeNull();
  });

});

describe('datosCocheAnual', () => {

  it('Sin entradas, km y dinero a 0', () => {
    const state = mkState();
    expect(datosCocheAnual(state, 2025)).toEqual({ km: 0, dinero: 0 });
  });

  it('Suma los km de rutas "por km" y el dinero de coche (fijo y por km)', () => {
    const state = mkState({ entries: {
      '2025-0': [
        { dia: 1, total: 98, km: 0, precioCoche: 18 },   // coche fijo (sin km)
        { dia: 5, total: 91.5, km: 50, precioCoche: 11.5 }, // por km
      ],
    }});
    const r = datosCocheAnual(state, 2025);
    expect(r.km).toBe(50);
    expect(r.dinero).toBe(29.5);
  });

  it('Ignora entradas sin coche (precioCoche 0 o ausente)', () => {
    const state = mkState({ entries: { '2025-0': [{ dia: 1, total: 80 }] } });
    expect(datosCocheAnual(state, 2025)).toEqual({ km: 0, dinero: 0 });
  });

  it('Suma a lo largo de todos los meses del año', () => {
    const state = mkState({ entries: {
      '2025-0': [{ dia: 1, km: 30, precioCoche: 6.9 }],
      '2025-6': [{ dia: 1, km: 70, precioCoche: 16.1 }],
    }});
    const r = datosCocheAnual(state, 2025);
    expect(r.km).toBe(100);
    expect(r.dinero).toBe(23);
  });

  it('Con lugares de precio fijo que ya tienen km congelado (25/08/2026), también cuentan para el total de km sin alterar el dinero', () => {
    const state = mkState({ entries: {
      '2025-0': [
        { dia: 1, total: 98, km: 25, precioCoche: 18 },     // coche fijo, con km del lugar congelado
        { dia: 5, total: 91.5, km: 50, precioCoche: 11.5 }, // por km
      ],
    }});
    const r = datosCocheAnual(state, 2025);
    expect(r.km).toBe(75);
    expect(r.dinero).toBe(29.5); // el dinero no cambia, sigue viniendo solo de precioCoche
  });

  it('Entradas de precio fijo SIN km propio (registradas antes de rellenar el km del lugar) cuentan igualmente, buscando el km actual del lugar', () => {
    const state = mkState({
      lugares: [{ id: 'olmedo', name: 'Olmedo', coche: 20, km: 32 }],
      entries: { '2025-0': [
        { dia: 1, total: 100, coche: 'si', lugId: 'olmedo', km: 0, precioCoche: 20 }, // entrada "antigua", sin km congelado
      ] },
    });
    const r = datosCocheAnual(state, 2025);
    expect(r.km).toBe(32);
    expect(r.dinero).toBe(20); // el dinero sigue igual, no depende del km
  });

  it('Entrada de precio fijo cuyo lugar todavía no tiene km configurado (0) sigue sumando 0 km', () => {
    const state = mkState({
      lugares: [{ id: 'arzuaga', name: 'Arzuaga', coche: 18, km: 0 }],
      entries: { '2025-0': [
        { dia: 1, total: 98, coche: 'si', lugId: 'arzuaga', km: 0, precioCoche: 18 },
      ] },
    });
    expect(datosCocheAnual(state, 2025)).toEqual({ km: 0, dinero: 18 });
  });

});

describe('kmEntryCoche', () => {

  it('Entrada con km propio (ruta "por km" o precio fijo ya congelado): usa ese km', () => {
    expect(kmEntryCoche({ coche: 'km', km: 45 }, [])).toBe(45);
    expect(kmEntryCoche({ coche: 'si', lugId: 'olmedo', km: 32 }, [{ id: 'olmedo', km: 99 }])).toBe(32);
  });

  it('Precio fijo sin km propio: busca el km actual del lugar', () => {
    const lugares = [{ id: 'olmedo', name: 'Olmedo', coche: 20, km: 32 }];
    expect(kmEntryCoche({ coche: 'si', lugId: 'olmedo', km: 0 }, lugares)).toBe(32);
  });

  it('Precio fijo sin km propio y lugar no encontrado (borrado): 0', () => {
    expect(kmEntryCoche({ coche: 'si', lugId: 'no-existe', km: 0 }, [])).toBe(0);
  });

  it('Ruta "por km" sin km: 0', () => {
    expect(kmEntryCoche({ coche: 'km' }, [])).toBe(0);
  });

});

describe('datosCocheMensual', () => {

  it('Sin entradas: 12 meses a 0', () => {
    const state = mkState();
    const r = datosCocheMensual(state, 2025);
    expect(r.length).toBe(12);
    expect(r.every(m => m.km === 0 && m.dinero === 0)).toBe(true);
    expect(r[0].mes).toBe('Enero');
  });

  it('Desglosa por mes correctamente, incluyendo el fallback de km por lugar', () => {
    const state = mkState({
      lugares: [{ id: 'olmedo', name: 'Olmedo', coche: 20, km: 32 }],
      entries: {
        '2025-0': [{ dia: 1, coche: 'si', lugId: 'olmedo', km: 0, precioCoche: 20 }],
        '2025-6': [{ dia: 1, coche: 'km', km: 70, precioCoche: 16.1 }],
      },
    });
    const r = datosCocheMensual(state, 2025);
    expect(r[0]).toEqual({ mes: 'Enero', km: 32, dinero: 20 });
    expect(r[6]).toEqual({ mes: 'Julio', km: 70, dinero: 16.1 });
    expect(r[1]).toEqual({ mes: 'Febrero', km: 0, dinero: 0 });
    // El total anual debe coincidir con la suma de los meses
    const anual = datosCocheAnual(state, 2025);
    expect(anual.km).toBe(parseFloat(r.reduce((s, m) => s + m.km, 0).toFixed(1)));
    expect(anual.dinero).toBe(parseFloat(r.reduce((s, m) => s + m.dinero, 0).toFixed(2)));
  });

});

describe('calcHorasMes', () => {

  it('Sin entradas → 0 horas y 0% de jornada', () => {
    const state = mkState();
    const { horas, pctJornada } = calcHorasMes([], state);
    expect(horas).toBe(0);
    expect(pctJornada).toBe(0);
  });

  it('Calcula horas totales y % de jornada del convenio correctamente', () => {
    const state = mkState();
    const entries = [
      { servId: 'boda', horasServ: 5, hext: 0, hnoc: 0 },
      { servId: 'servicio3h', horasServ: 3, hext: 2, hnoc: 0 },
    ];
    const { horas, pctJornada } = calcHorasMes(entries, state);
    expect(horas).toBe(10); // 5 + 3 + 2
    const jornadaMensual = JORNADA_ANUAL_CONVENIO / 12;
    expect(pctJornada).toBe(parseFloat((10 / jornadaMensual * 100).toFixed(2)));
  });

});
