# Cambios listos para aplicar — hacer la app más "profesional" (25/08/2026)

## Cómo aplicarlo

1. Copia estos 4 archivos encima de los tuyos, respetando las carpetas: `index.html`, `logica.js`, `exvall.test.js`, `Guia_ControlMonetarioExvall_v5.pdf`.
2. En la terminal, dentro de la carpeta del proyecto: `npm test` — deberían salir 93 tests en verde (antes eran 86; se han añadido 7 tests nuevos).
3. Si todo está bien, `git add`, `commit` y `push` como siempre. Si te sale "rejected (fetch first)", ya sabes: `git pull` y luego `git push` otra vez.

**Importante esta vez:** antes de aplicar esto, comprueba que ya tienes aplicado el cambio anterior (el de "Especial con horas manuales" + el bug del histórico + el % de Vida Laboral) — este paquete continúa desde ahí. Si tienes dudas, aplica igualmente estos 4 archivos: llevan todo junto, tanto lo de la vez pasada como lo de esta.

**No he podido subirlo yo directamente al repositorio** — este entorno no tiene tus credenciales de GitHub configuradas, así que como siempre te dejo los archivos listos para que tú hagas el push.

## Qué se ha añadido (las 5 mejoras "para ser más profesional")

**1. Ayuda dentro de la app.** Junto al botón de modo oscuro hay un nuevo botón "❓ Ayuda" con un mini-manual resumido (Registrar, Especial, Rutas con varias paradas — la explicación que pediste para los compañeros que no lo entienden—, Horas, IRPF, Backup). Además, los campos con más dudas (coche por km, horas de Especial, % de Vida Laboral, IRPF) tienen su propio icono "❓" con una explicación corta al lado, sin salir de donde se está.

**2. Avisos antes de guardar algo raro.** Sin bloquear nada, la app te pregunta "¿seguro?" si: ya hay una entrada ese mismo día, hay más de 6 horas extra o nocturnas en un solo día, una ruta tiene más de 150 km, o dejas el servicio "Especial" con 0 horas. Si pulsas "Guardar de todas formas", se guarda igual — es solo un segundo vistazo por si se te ha ido un dedo al escribir.

**3. Gráfico de ingresos.** En Resumen hay ahora un gráfico de barras con los ingresos de cada mes del año, hecho sin ninguna librería externa nueva (para no añadir nada que vigilar en seguridad).

**4. Comparar con otro año.** En ese mismo gráfico hay un selector "Comparar con" para superponer cualquier otro año que tengas con datos, más una frase como "Llevas 4.200€ este año — el año pasado por estas fechas ibas por 3.850€ (+9%)".

**5. Copia de seguridad automática.** Con la sesión de nube iniciada, ya no hace falta tocar ningún botón: la copia se sube sola unos segundos después de registrar, editar o borrar algo, y se baja sola al abrir la app si hay algo más nuevo en la nube. Los botones "Subir backup" / "Restaurar" se quedan por si alguna vez quieres forzarlo a mano. Si un día no hay conexión, la app sigue funcionando normal y se reintenta sola en cuanto puede.

**Manual actualizado.** Se ha añadido la Sección 23 al final de `Guia_ControlMonetarioExvall_v5.pdf` con la explicación de estas 5 cosas — incluido el matiz de las copias automáticas con dos dispositivos que hablamos.

## Verificación hecha antes de entregarlo

- 93/93 tests unitarios en verde (`npm test`).
- Prueba de navegador sin interfaz: se abrió el modal de ayuda (comprobando que incluye la sección de rutas), se comprobó el icono "❓" puntual, se provocó un aviso de día duplicado (confirmando "guardar de todas formas" y comprobando que se guardan las dos entradas), se provocó un aviso de horas excesivas (esta vez cancelando, comprobando que NO se guarda nada), se comprobó que el gráfico se dibuja con datos reales y que el selector de comparar año funciona, y que la subida automática a la nube no rompe nada cuando no hay sesión iniciada. Cero errores de JavaScript en todo el recorrido.
- Capturas visuales del gráfico en modo claro y modo oscuro, para comprobar que se lee bien en los dos.

## Documento de seguimiento

También te adjunto `mejoras_exvall.md` actualizado — la sección 10 completa (los 5 puntos) ya está marcada como implementada y probada.
