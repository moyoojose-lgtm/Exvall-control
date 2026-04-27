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
} from '../logica.js';

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
