# Control Monetario Exvall

Aplicación web PWA para el registro y control de ingresos de trabajo por servicios. Funciona directamente desde el navegador sin instalación desde tienda — iPhone, Android y PC.

## Qué hace

- Registrar servicios con día, tipo, lugar, horas extra, horas nocturnas y desplazamiento
- Calcular totales brutos y netos con retención de IRPF configurable
- Calcular rutas por kilómetros con mapas reales (OpenStreetMap)
- Resumen anual mes a mes con control de cobros en banco y en mano
- Exportar informes en Excel (.xlsx) y PDF
- Múltiples perfiles de usuario independientes en el mismo dispositivo
- Backup local (JSON) y backup en la nube (Supabase) con login por magic link
- Funciona sin conexión — solo el cálculo de rutas requiere internet

## Instalación

### iPhone (Safari)
1. Abre Safari y ve a la URL de la app
2. Pulsa el botón Compartir ⎙
3. Selecciona "Añadir a pantalla de inicio"

### Android (Chrome)
1. Abre Chrome y ve a la URL de la app
2. Chrome mostrará un banner de instalación automáticamente
3. O pulsa ⋮ → "Añadir a pantalla de inicio"

### PC / Mac
Funciona directamente en el navegador. También instalable como app de escritorio desde Chrome o Edge.

## Tecnología

- HTML + CSS + JavaScript vanilla — sin frameworks
- IndexedDB para persistencia local de datos
- Service Worker para uso offline
- jsPDF + SheetJS para exportación
- Supabase para backup en la nube (autenticación por magic link)
- Vitest para tests

## Tests

```bash
npm test
```

59 tests que cubren cálculos de totales, IRPF, validación de fechas y ciclo completo de backup.

## Estructura

```
index.html          # Aplicación completa
logica.js           # Funciones puras de negocio (importadas en tests)
sw.js               # Service Worker
manifest.json       # Configuración PWA
tests/
  exvall.test.js    # Suite de tests (Vitest)
package.json        # Scripts npm
```

## Datos y privacidad

Los datos se guardan localmente en el dispositivo usando IndexedDB. El backup en la nube usa Supabase con Row Level Security — cada usuario solo puede acceder a sus propios datos.
