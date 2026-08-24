# Cambios listos para aplicar — control de horas + histórico + manual

## Cómo aplicarlo

1. Copia estos 4 archivos encima de los tuyos, respetando las carpetas: `index.html`, `logica.js`, `exvall.test.js`, `Guia_ControlMonetarioExvall_v5.pdf`.
2. En la terminal, dentro de la carpeta del proyecto: `npm test` — deberían salir 68 tests en verde (antes eran 59; se han añadido 9 tests nuevos para las funciones de horas).
3. Si todo está bien, `git add`, `commit` y `push` como siempre. Si te sale "rejected (fetch first)", ya sabes: `git pull` y luego `git push` otra vez.

**No he podido subirlo yo directamente al repositorio** — este entorno no tiene tus credenciales de GitHub configuradas, así que como siempre te dejo los archivos listos para que tú hagas el push.

## Qué se ha añadido

**Horas por servicio.** Cada servicio (Configuración) tiene ahora un número de horas asociado, editable junto al precio: Boda = 5h, Servicio 3H = 3h, el resto = 4h por defecto. Se congela en cada entrada al registrarla (igual que el precio de coche), así que cambiar la configuración después no altera entradas ya guardadas. Los perfiles que ya tenías se migran solos la primera vez que abras la app (no hace falta que hagas nada).

**Horas extra y nocturnas.** Ya existían como campos en cada entrada (con precio configurable en €/hora) — ahora se suman también al total de horas trabajadas del mes.

**Panel de horas en Registrar.** Al entrar en un mes con entradas, verás cuántas horas has trabajado ese mes y qué % representan sobre la jornada completa del convenio (1.782 h/año) — para que lo compares tú mismo contra el % de tu contrato (CTP) que sale en la Vida Laboral.

**Dinero desglosado.** También en Registrar: cuánto dinero es de servicios y cuánto de coche/gasolina, por separado (antes iba todo junto en un único total), más el número de servicios del mes.

**Histórico por tipo de servicio (Resumen).** Tabla nueva con el año completo: cuántas veces se ha hecho cada tipo de servicio (Boda, Servicio 3H...), horas totales, dinero total y el €/hora resultante — para ver de un vistazo qué tipo de evento compensa peor.

**Manual actualizado.** Se ha añadido la Sección 22 al final de `Guia_ControlMonetarioExvall_v5.pdf`, con la explicación de todo lo anterior y la comparativa de precios del convenio (hora normal, extra y nocturna según la tabla salarial 2026, más la referencia del km exento de IRPF) — esto es solo información dentro del manual, no se calcula dentro de la app.

## Lo que NO se ha construido en esta tanda

**Importar y leer el informe de Vida Laboral automáticamente.** Lo dejé pendiente a propósito: dado que sois fijos, la Vida Laboral no tiene información día a día que cruzar (solo un periodo continuo de alta), así que antes de construir algo que en la práctica no compararía nada útil, prefiero comentarlo contigo primero.
