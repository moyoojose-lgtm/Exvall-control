# Mejoras propuestas — Control Monetario Exvall

Documento de trabajo para no perder el hilo de lo que vamos hablando. Cada mejora tiene qué es, para qué vale y el estado en el que está.

Última actualización: 25/08/2026.

---

## 0. Estado general — tanda 1 aplicada

El 24/08/2026 se implementaron y probaron (59/59 tests en verde) los cambios de los puntos 1, 6.1 y 6.2, más la mejora de "rastro de auditoría" del punto 7. Están listos como archivos para copiar sobre el proyecto y hacer push. El punto 2 (aviso push) queda con las decisiones cerradas pero por construir — es la siguiente tanda.

También se ha actualizado la **guía de usuario (el PDF de 23→23 secciones)** a la versión 6, con dos secciones nuevas (Papelera, y el aviso semanal marcado como "próximamente") y las notas de todo lo demás implementado en esta tanda. Se entrega como archivo aparte — sustituye al PDF v5 que se subió al principio de esta conversación.

---

## 1. Compatibilidad con iPhone — ✅ implementado (24/08/2026)

**Qué es:** tres ajustes técnicos para que la app se sienta más "nativa" en iPhone, sin tocar cálculos ni datos guardados.

**Para qué vale:** mejor experiencia de uso día a día, menos fallos molestos al usar la app en el móvil durante un servicio.

Incluye:

- **Zoom automático al tocar campos.** ✅ Todos los campos de formulario que estaban en 13-14px se han subido a 16px (día, servicio, horas, notas, IRPF, precios de Configuración...).
- **Rebote elástico al hacer scroll.** ✅ Añadido `overscroll-behavior: none` en `html` y `body`.
- **Aviso de versión nueva.** ✅ Implementado: aparece un aviso "🔄 Hay una versión nueva — pulsa para actualizar" cuando el Service Worker detecta una versión distinta. Requirió también cambiar `sw.js` para que la nueva versión se quede esperando confirmación en vez de activarse sola en silencio.
- **Versión del Service Worker, automatizada.** ✅ Añadido un segundo trabajo al CI (`version-sw` en `.github/workflows/tests.yml`) que, tras cada push a `main` con los tests en verde, calcula un hash de `index.html` + `manifest.json` y, si algo ha cambiado de verdad, actualiza `CACHE_NAME` en `sw.js` solo y lo sube con su propio commit — ya no hace falta acordarse de subir el número de versión a mano. Requiere que el repositorio tenga activado "Read and write permissions" para las Actions (Settings → Actions → General → Workflow permissions) — revisarlo una vez si el workflow da error de permisos.
- *(Extra menor, opcional, sin hacer todavía)*: pantalla de carga (splash screen) propia al abrir la app, para evitar el parpadeo blanco inicial.

**Estado: ✅ implementado y con los 59 tests en verde (24/08/2026).** Archivos listos para copiar sobre el proyecto (`index.html`, `sw.js`) y hacer push.

---

## 2. Recordatorio de registrar servicios (push, lunes y jueves) — ✅ implementado (24/08/2026)

**Qué es:** notificación push real (llega aunque la app esté cerrada) que avisa si no se ha registrado ningún servicio del fin de semana.

**Para qué vale:** como trabajáis sobre todo el fin de semana, es fácil que se acumulen servicios sin anotar. Un aviso "de verdad" (no un simple mensaje dentro de la app) asegura que llega aunque no se abra la app.

**Cómo funcionaría:**

- **Lunes:** primer aviso si no hay entradas registradas de viernes/sábado/domingo.
- **Jueves:** segundo aviso ("llamada de refuerzo") solo si el lunes no se cubrió — es decir, si para el jueves sigue sin haber entradas de ese fin de semana.
- No requiere que nadie use el login por email del backup en la nube — el permiso de notificaciones se pide directamente al abrir la app, independiente de esa cuenta.
- Requiere: permiso de notificaciones del usuario, app instalada en pantalla de inicio (ya se pide para todo lo demás), y una pequeña tabla nueva en Supabase para guardar a quién avisar y cuándo, más una tarea programada que dispare el envío.

**Decidido (24/08/2026):** aviso a las **17:00**, **individual por perfil/dispositivo** (cada uno tiene la app en su propio móvil, así que no hace falta agrupar por persona, cada dispositivo recibe el suyo). Permiso pedido automáticamente al abrir la app por primera vez. Se decidió también que el aviso sea **simple, para todos, sin comprobar nada** — no hay forma fiable de saber desde fuera si alguien anotó algo el finde (los datos viven solo en cada móvil, y la mayoría no usáis el backup en la nube), así que comprobarlo habría sido una falsa sensación de "inteligencia".

**Cómo se ha construido:**

- **Claves VAPID** generadas para autenticar los envíos (estándar Web Push).
- **Tabla `push_subscriptions`** en Supabase (con RLS: solo insertar la propia, nadie puede leer ni tocar las de otros desde el cliente).
- **Edge Function `avisos-recordatorio`** en Supabase: lee todas las suscripciones y manda el aviso a cada una; si una suscripción ya no existe (desinstalada, navegador cambiado), la borra sola.
- **Cron Job** en la base de datos: dispara la función automáticamente los lunes y jueves.
- **En la app:** al abrir por primera vez, se pide permiso de notificaciones; si se concede, el dispositivo queda suscrito solo, sin que la persona tenga que hacer nada más. El aviso "Instalar en pantalla de inicio" en iPhone ahora menciona que hace falta para recibir los avisos.

**Probado:** invocación de prueba a la Edge Function → 200 OK, sin errores. Los 59 tests de la app siguen en verde.

**Dos límites conocidos, documentados en el manual:**
- La hora del disparador (15:00 UTC) equivale a las 17:00 en horario de verano, pero a las 16:00 en horario de invierno — los avisos programados no ajustan solos el cambio de hora.
- En iPhone, solo llegan si la app está instalada en pantalla de inicio (no vale con Safari abierto).

**Estado: ✅ implementado y probado (24/08/2026).** Archivos afectados: `index.html`, `sw.js`, más infraestructura en Supabase (tabla, Edge Function, Cron Job).

---

## 3. Control de horas vs. alta en la Seguridad Social — ✅ implementado (25/08/2026)

**Qué es:** comparar las horas/días que registráis como trabajados en la app contra lo que consta de alta en la Seguridad Social, para detectar cuándo curráis un servicio sin que os hayan dado de alta ese día.

**Para qué vale:** tener pruebas propias por si algún día hace falta reclamar (inspección de trabajo, accidente, paro, jubilación...). La empresa no os facilita el dato de alta, así que hay que sacarlo vosotros mismos.

### 3.1 No hay atajo automático — no existe API pública

Confirmado tras buscarlo: la Seguridad Social no ofrece ninguna vía para que una app de terceros consulte el estado de alta de forma automática. Toda la comprobación es manual, con identificación propia (Cl@ve, certificado digital, o el sistema de verificación por SMS + foto del DNI si no tienes ninguno de los anteriores).

### 3.2 Los dos informes que sirven, y cuál usar según el caso

**Informe de Vida Laboral** — https://portal.seg-social.gob.es/wps/portal/importass/importass/Categorias/Vida+laboral+e+informes/Informes+sobre+tu+situacion+laboral/Informe+de+tu+vida+laboral

- Lista **todos** los periodos de alta y baja de tu vida laboral, cada uno con fecha de inicio y fecha de fin exactas, y la empresa/régimen correspondiente.
- Si la empresa os da de alta un solo día (lo habitual para un servicio suelto), en teoría aparece como una línea de un día exacto — no es un resumen mensual, es un histórico de movimientos.
- **El problema real no es el informe, es el retraso**: la Seguridad Social tarda en procesar lo que la empresa comunica (puede ser cuestión de días, o la empresa puede agrupar varias altas y mandarlas juntas a fin de mes). Por eso si lo consultas demasiado pronto, no aparece todavía — de ahí la sensación de "solo se ve a fin de mes".
- **Recomendación práctica:** consultarlo una vez al mes, con margen (por ejemplo, a mitad del mes siguiente), nunca el mismo día del servicio.

**Informe de situación en la Seguridad Social a una fecha concreta** — https://portal.seg-social.gob.es/wps/portal/importass/importass/Categorias/Vida+laboral+e+informes/Informes+sobre+tu+situacion+laboral/Informe+de+situacion+laboral+a+fecha+concreta

- Responde directamente sí/no a "¿estabas de alta el día X?", para cualquier fecha pasada que elijas.
- Más rápido para comprobar un servicio suelto sin tener que leer todo el histórico de la vida laboral.
- Sujeto al mismo retraso de procesamiento que el informe anterior — no sirve para comprobar "en caliente" el mismo día o al día siguiente del servicio.

### 3.3 Cómo se pediría, paso a paso

1. Entrar en Import@ss (https://portal.seg-social.gob.es/wps/portal/importass) o la Sede Electrónica de la Seguridad Social.
2. Identificarse con Cl@ve, certificado digital, o el sistema de verificación sin certificado (SMS al móvil registrado + foto del DNI).
3. Ir a "Vida laboral e informes" → elegir entre "Informe de tu vida laboral" (histórico completo) o "Informe de situación a una fecha concreta" (una fecha puntual).
4. Descargar el PDF/documento generado.
5. Contrastar manualmente las fechas del informe contra los días registrados en la app (esto es lo que la mejora nº 3 automatizaría del lado de la app: marcar cada entrada como "alta confirmada" tras hacer esta comprobación).

### 3.4 Diseño revisado (24/08/2026) — descartado el marcado por día, sustituido por horas vs. convenio

El diseño original (marcar cada día como "alta confirmada/pendiente" comparando contra la Vida Laboral) no sirve: al ser fijos, la Vida Laboral solo muestra un periodo continuo de alta desde la fecha de inicio (sin fecha de baja), no movimientos día a día — así que no hay nada que cruzar ahí. Tampoco la nómina trae el total de horas trabajadas del mes.

Nuevo enfoque, acordado con el usuario:

- Cada **servicio** (Configuración) tendrá un número de horas asociado, editable, con estos valores por defecto: Bodas = 5h, Servicio 3H = 3h, resto = 4h.
- Cada entrada permitirá añadir, además, **horas extra** y **horas nocturnas** (22:00-6:00) como campos opcionales, sumando aparte.
- La app calculará sola las **horas trabajadas del mes** y el **% que representan** sobre la jornada completa del convenio de Hostelería de Valladolid (1.782 h/año) — para compararlo el propio usuario, a simple vista, contra el % de jornada parcial que figura en su Vida Laboral (CTP).
- En Resumen: desglosar el dinero de "servicio" y el de "coche/gasolina" por separado (ahora van sumados en un único total), y mostrar el número de servicios/viajes del mes — diseño de detalle dejado a mi criterio.
- Aplica solo al trabajo de camarero/eventos con Expeso (el que registra esta app) — el otro empleo del usuario (Ondoan, restauración colectiva) es un trabajo aparte, no se mezcla aquí.

### 3.5 Referencia — tablas salariales del convenio (Hostelería y Alojamientos Turísticos de Valladolid, 2018-2026)

Fuente: [Convenio Colectivo de Hostelería y Alojamientos Turísticos de Valladolid — BOP 2021/247](https://noticias.juridicas.com/base_datos/Laboral/715405-convenio-colectivo-provincial-de-hosteleria-y-alojamientos-turisticos-de-la.html)

Jornada completa: 40 h/semana, 1.782 h/año (Art. 4). Tabla salarial 2026, categoría Camarero/Barman/Sumiller (N.S. IV), jornada completa:

- Salario de tabla: 1.206,26 €/mes — 16.887,64 €/año (a 14 pagas)
- **Hora normal:** 16.887,64 ÷ 1.782 = **9,48 €/hora**
- **Hora extra** (Art. 13, +40%): **13,27 €/hora**
- **Hora nocturna** (Art. 12, 22:00-6:00, +25% sobre salario base): **11,85 €/hora**

Estos son los mínimos oficiales de tabla a jornada completa — no tienen en cuenta el % de jornada parcial real del usuario ni posibles complementos (p. ej. "Complemento Personal" en su nómina), así que sirven como referencia de partida, no como lo que la empresa paga exactamente.

**Estado: ✅ implementado y probado (24/08/2026)**, 68/68 tests en verde (9 nuevos). Archivos afectados: `index.html`, `logica.js`, `exvall.test.js`. Construido: horas por servicio (editable, congelada al registrar), suma de horas extra/nocturnas al total mensual, panel de horas + % de jornada en Registrar, dinero desglosado servicio/coche, e histórico anual de horas por tipo de servicio en Resumen (sección 4.2). Aplicado y subido por el usuario (24/08/2026).

### 3.6 Revisado/corregido — encontrado al probar en la app (24/08/2026)

El usuario probó la función en la app real y encontró tres cosas a revisar. Las tres están ya implementadas y probadas (25/08/2026):

1. **Servicio "Especial" no debería tener horas fijas de configuración — ✅ corregido.** Ahora el campo "Horas (Especial)" aparece en el formulario de Registrar (y en cada parada de una ruta), visible solo cuando el servicio es "Especial", igual que ya pasaba con el precio manual. Ese valor se congela en la entrada al registrarla o al editarla (el modal de edición también tiene ya su propia casilla de horas para "Especial", precargada con el valor guardado).

2. **El histórico de horas por tipo de servicio (Resumen) mostraba un dinero que no cuadraba — ✅ corregido.** Causa confirmada: `renderHistoricoHorasTipo()` sumaba `e.total` (que incluye coche + horas extra/nocturnas) en vez de solo el dinero del servicio. Ahora resta el coche/gasolina antes de sumar, igual que el panel de "Dinero de este mes" de Registrar. Verificado con un caso de prueba idéntico al reportado: 2 Bodas de 80€ (una de ellas con 18€ de coche) ahora muestran correctamente **160,00 €** en la columna "Dinero" (antes: 178,00 €).

3. **Faltaba una casilla para introducir las horas/% reales de la Vida Laboral — ✅ construido.** En el panel "Horas trabajadas este mes" de Registrar hay ahora un campo para introducir a mano el % de jornada (CTP) que figura en el Informe de Vida Laboral. En cuanto se rellena, la app muestra directamente la diferencia en puntos porcentuales contra el % calculado a partir de las horas registradas — ya no hace falta comparar mentalmente fuera de la app. El dato se guarda por perfil (no por mes, ya que en la Vida Laboral de un trabajador fijo el % no cambia mes a mes) y viaja también con las copias de seguridad (exportar/importar y Supabase).

**Estado: ✅ implementado y probado (25/08/2026)**, 75/75 tests en verde (7 nuevos sobre los 68 anteriores). Archivos afectados: `index.html`, `logica.js`, `exvall.test.js`. Verificado también con una prueba de navegador sin interfaz (Playwright): flujo completo de registrar Boda con coche, Boda sin coche y Especial con horas manuales, editar la entrada Especial, y rellenar el % de Vida Laboral — cero errores de JavaScript.

---

## 4. Otras ideas a valorar

### 4.1 Comparar precios configurados en la app contra mínimos reales (de momento, comprobación manual "por fuera")

**Decisión del usuario (24/08/2026): NO se implementa como función dentro de la app.** En su lugar, esta información (fórmulas del convenio, referencia del km exento de IRPF) se documentó en el **manual de la aplicación** (`Guia_ControlMonetarioExvall_v5.pdf`), como explicación de referencia, no como cálculo automático.

**Estado: ✅ hecho (24/08/2026).** Añadida la Sección 22 al final del manual, con las tablas de precio de hora normal/extra/nocturna del convenio y la referencia del km exento de IRPF.

- **Hora extra y hora nocturna:** el convenio de Hostelería de Valladolid fija la hora extra al +40% y la nocturnidad al +25% sobre el salario base (no en euros fijos, como tenéis configurado ahora — 12 €/hora extra y 15 €/hora nocturna). Para saber si eso está bien pagado, hace falta el salario base real de la nómina de cada uno y hacer la cuenta: (salario base anual + antigüedad) ÷ jornada anual × 1,40 (para la extra) o × 1,25 (para la nocturna).
- **Precio por kilómetro — fuente oficial confirmada:**
  - El convenio de Valladolid **no** fija ningún precio por km (solo un plus de transporte de 0,71 €/día para ir de casa al trabajo, que es otra cosa).
  - No hay convenio estatal de hostelería en España — el sector se regula provincia a provincia, así que no hay "otro sitio" por encima donde buscar.
  - El Estatuto de los Trabajadores obliga en general a que la empresa asuma los gastos derivados del trabajo, pero no fija una cifra concreta en euros.
  - La única cifra oficial que existe es la de Hacienda, como límite de gasto exento de IRPF: **0,26 €/km**, fijada por la **Orden HFP/792/2023, de 12 de julio** (BOE núm. 169, de 17 de julio de 2023), que modificó el artículo 9 del Reglamento del IRPF (Real Decreto 439/2007). Antes estaba en 0,19 €/km.
  - Enlace oficial al BOE: https://www.boe.es/buscar/doc.php?id=BOE-A-2023-16461
  - No es un mínimo obligatorio que la empresa tenga que pagar, pero es el argumento más sólido y "oficial" que tenéis para negociar: con vuestros 0,23 €/km configurados estáis por debajo incluso de esa referencia fiscal.

### 4.2 Histórico o gráfico de horas por tipo de evento

Ver de un vistazo qué tipo de servicio (boda, comida, discoteca...) compensa peor en horas extra/nocturnas, para tener argumentos si se negocia el precio con la empresa.

**Decisión del usuario (24/08/2026): SÍ, se construye.**

**Estado: ✅ implementado (24/08/2026).** Tabla en Resumen: veces, horas totales, dinero total y €/hora por tipo de servicio, acumulado por año.

### 4.3 Exportar un informe específico "control de alta SS"

Combinar los datos del punto 3 (qué días tienen alta confirmada y cuáles no) con las fechas y horas trabajadas, en un PDF listo para enseñar a un gestor, abogado o inspección.

**Decisión del usuario (24/08/2026): NO se construye.**

**Estado: ❌ descartado.**

### 4.4 Importar y leer el informe de Vida Laboral automáticamente

*(Era la "idea futura" que estaba dentro del punto 3.4 original)*: que la app permita subir el PDF del Informe de Vida Laboral (o del Informe de situación a fecha concreta) y lo lea sola, cruzando las fechas de alta contra las entradas registradas, sin tener que hacerlo a mano.

**Decisión del usuario (24/08/2026): SÍ, se construye.**

Al implementar el resto de esta sección se detectó un problema de fondo: al ser fijos, la Vida Laboral no tiene información día a día que cruzar (solo un periodo continuo de alta desde la fecha de inicio, sin bajas), así que un importador automático no tendría, en la práctica, nada útil que comparar.

**Decisión final del usuario (24/08/2026): NO se construye el importador automático.** El dato de la Vida Laboral (% CTP) se introduce a mano.

**Estado: ❌ descartado el importador automático — sustituido por el campo manual de % de Vida Laboral (sección 3.6, punto 3), ya implementado el 25/08/2026, que compara ese dato directamente dentro de la app en vez de tener que mirarlo por fuera.**

---

## 5. La ley que obliga a fichar — y si una app propia puede servir como prueba oficial

Investigado a fondo porque la idea de fondo es: si la empresa no os ficha bien, ¿puede esta misma app (o una versión evolucionada de ella) hacer las veces de "fichaje oficial" vuestro?

### 5.1 Qué dice la ley exactamente

- Norma: **Real Decreto-ley 8/2019**, que modificó el **artículo 34.9 del Estatuto de los Trabajadores**.
- Obligación: "La empresa garantizará el registro diario de jornada, que deberá incluir el horario concreto de inicio y finalización de la jornada de trabajo de cada persona trabajadora." Aplica a todas las empresas, de cualquier tamaño y sector — sin excepción para hostelería ni para contratos eventuales.
- No basta con anotar el total de horas del día: hay que registrar hora de entrada y hora de salida concretas (y las pausas que no cuenten como tiempo de trabajo).
- La ley no obliga a que el sistema sea digital — vale papel — pero si es en papel, tiene que estar firmado por el trabajador para tener validez ante un juez (varias sentencias han anulado registros en papel sin firma).
- Los registros hay que conservarlos **mínimo 4 años**, y deben estar disponibles para el propio trabajador, sus representantes legales y la Inspección de Trabajo.
- El **Criterio Técnico de la Inspección de Trabajo y Seguridad Social** (que desarrolla cómo debe aplicarse esta obligación en la práctica) insiste en que el sistema debe garantizar la fiabilidad e inalterabilidad de los datos una vez registrados.

### 5.2 El punto clave: la obligación es de la empresa, no vuestra

Esto es importante para no llevarnos a confusión: la ley obliga a **la empresa** a llevar el registro, no a los trabajadores. Una app que vosotros mismos gestionéis nunca sustituye legalmente esa obligación empresarial — no se puede "hacer oficial" en el sentido de que la empresa quede exenta de tener la suya propia.

Pero sí importa, y mucho, como prueba en caso de conflicto:

- El Tribunal Supremo ha aclarado que si la empresa no lleva registro y **el horario es irregular** (que es exactamente vuestro caso: unas veces boda, otras discoteca, sin horario fijo), la falta de registro empresarial juega en contra de la empresa a la hora de demostrar cuántas horas se hicieron realmente.
- Con horario fijo y conocido, en cambio, el trabajador tendría que aportar indicios adicionales de que superó ese horario (mensajes, documentos...) para que la falta de registro perjudique a la empresa.
- No hay una sentencia que diga explícitamente "una app personal del trabajador vale como prueba plena", pero sí se acepta como indicio cualquier documento o registro de actividad que respalde lo que se reclama — cuanto más consistente, fechado y difícil de manipular a posteriori sea vuestro registro, más peso tiene.

**Conclusión práctica:** la app no se puede convertir en el "registro horario oficial" que exime a la empresa de nada, pero sí puede convertirse en vuestra mejor prueba personal si algún día hay que reclamar — y dado que tenéis horario irregular, la ley juega a vuestro favor si la empresa no tiene el suyo en condiciones.

### 5.3 Sanciones a la empresa si no cumple (para que sepáis el contexto)

Según el artículo 7.5 de la LISOS (Ley de Infracciones y Sanciones en el Orden Social), no llevar registro de jornada se considera infracción **grave**:

| Grado | Importe |
|---|---|
| Mínimo | 751 € – 1.500 € |
| Medio | 1.501 € – 3.750 € |
| Máximo | 3.751 € – 7.500 € |

(La sanción es por infracción, la Inspección decide el grado según reincidencia, número de trabajadores afectados, etc.)

### 5.4 Competencia — apps de fichaje que ya existen

Para saber si "crear una app paralela oficial" tiene sentido o ya está resuelto por otros, esto es lo que hay en el mercado:

- **Skello** — la más orientada a hostelería/restauración/retail específicamente: cuadrantes automáticos, fichaje desde app incluso sin turno asignado, firma digital de hojas de horario.
- **FichMe** — española, se posiciona para "bares, restaurantes, hoteles y catering", con soporte de turnos partidos (varios fichajes al día) y "modo kiosco" (tablet fija en barra/cocina para fichar con PIN).
- **Factorial, Sesame HR, Bizneo HR, Kenjo** — suites de RRHH más generalistas (fichaje + nóminas + vacaciones + evaluaciones), no específicas de hostelería pero muy usadas en pymes españolas. Algunas (Sesame, Bizneo) incluyen geolocalización y reconocimiento facial.
- **aTurnos** — especializada en turnos rotativos complejos y bolsas de horas, con planificación asistida.

**Diferencia clave con lo que necesitáis vosotros:** todas estas herramientas son para que la **empresa** gestione el fichaje de su plantilla — se las vende a negocios, no a un trabajador suelto que quiere su propio control paralelo. No hay (o no hemos encontrado) una app pensada específicamente para que un trabajador extra/eventual lleve su propio registro independiente cruzado con altas de Seguridad Social — que es exactamente el hueco que cubre Control Monetario Exvall si se le añaden las mejoras de los puntos 3 y 5.

**Decisión del usuario (24/08/2026): NO se construye nada de fichaje oficial aquí — se usará una aplicación distinta más específica para eso.**

**Estado: investigación cerrada y punto cerrado sin implementación.** Control Monetario Exvall se queda como registro de servicios/dinero/horas (con las mejoras ya hechas de las secciones 3, 7 y 9), sin evolucionar hacia una app de fichaje — para eso el usuario usará otra herramienta especializada.

---

## 6. Calidad de código y seguridad

**Aclaración primero:** la app **sí tiene tests** — el README lo dice: 59 tests con Vitest que cubren cálculo de totales, IRPF, validación de fechas y el ciclo completo de backup. El problema no es la falta de tests, es que nadie los ejecuta automáticamente.

### 6.1 Integración continua (CI) — que los tests se ejecuten solos — ✅ implementado

**Qué es:** ahora mismo, `npm test` solo se lanza si alguien lo hace a mano desde su ordenador antes de subir un cambio. No hay ningún GitHub Actions configurado en el repositorio (comprobado: no existe la carpeta `.github/workflows`). Eso significa que un cambio que rompa un cálculo se puede subir directamente a la web en vivo sin que nadie se entere hasta que un camarero vea un total mal.

**Para qué vale:** con un pipeline de CI, cada vez que se sube un cambio al repositorio, GitHub ejecuta los 59 tests automáticamente y avisa si algo falla, antes de que llegue a producción.

**Cómo se hizo:** archivo `.github/workflows/tests.yml` que instala las dependencias (`npm ci`) y ejecuta `npm test` en cada `push` y cada `pull request` a `main`.

**Hallazgo importante al implementarlo:** `package.json` no tenía Vitest declarado como dependencia — en un ordenador limpio, `npm install && npm test` fallaba con "vitest not found" (los tests solo funcionaban porque quien los creó ya tenía Vitest instalado globalmente en su máquina). Corregido: Vitest añadido a `devDependencies` y generado el `package-lock.json` que tampoco existía, necesario para que la instalación sea idéntica siempre.

**Estado: ✅ implementado y probado (24/08/2026)** — 59/59 tests en verde con `npm install && npm test` desde cero. Archivos listos: `.github/workflows/tests.yml`, `package.json`, `package-lock.json`.

**Segundo hallazgo, este ya al probarlo en tu ordenador (no en el mío):** `exvall.test.js` importaba `../logica.js` en vez de `./logica.js` — un bug que ya existía en el repositorio original desde el principio, y que además se me había colado a mí sin darme cuenta en mis propias pruebas (tenía sin querer una copia vieja de `logica.js` guardada en una carpeta superior desde el principio de la conversación, y por eso a mí "me pasaban" los tests). Tu ordenador limpio es el que destapó el problema de verdad. Corregido y verificado en un entorno aislado de verdad — ya en tu repo con el commit `249a499`.

### 6.2 Blindar las librerías externas (SRI + versiones fijas) — ✅ implementado

**Qué es:** la app carga tres librerías desde una CDN pública (jsdelivr): Excel (`xlsx@0.18.5`), PDF (`jspdf@2.5.1`) y Supabase (`@supabase/supabase-js@2`). Comprobado en el código:

- `xlsx` y `jspdf` están fijadas a una versión exacta (`0.18.5`, `2.5.1`) — bien.
- `supabase-js` solo está fijada a la versión mayor (`@2`), no a una versión exacta — puede cambiar sola sin avisar si sale una versión nueva.
- **Ninguna de las tres lleva verificación de integridad (SRI, `integrity="sha384-..."`)**. Esto significa que si la CDN sirviera alguna vez un archivo distinto al esperado (por un fallo o por un ataque a la CDN), la app lo cargaría sin comprobar nada, con acceso a todos los datos que maneja.

**Para qué vale:** cerrar ese hueco de "me fío ciegamente de lo que me sirva un servidor externo".

**Cómo se hizo:**
- `supabase-js` fijado a la versión exacta `2.112.4` (era la última estable en el momento de hacerlo), igual que las otras dos librerías.
- Añadido `integrity="sha384-..."` y `crossorigin="anonymous"` a los tres `<script src=...>`. Los hashes se calcularon de verdad (no copiados de una web), descargando el paquete exacto de npm de cada librería y sacando el SHA-384 real del archivo que sirve la CDN.
- **Nota para el futuro:** si algún día se actualiza la versión de alguna de las tres librerías, hay que repetir este proceso (bajar la versión nueva, calcular su hash, cambiar el número de versión y el hash a la vez) — si solo se cambia el número de versión sin el hash, el navegador bloqueará la carga de la librería porque no coincidirá.

**Estado: ✅ implementado y probado (24/08/2026).**

### 6.3 Revisar la configuración de Supabase (esto sí lo tienes que comprobar tú)

Esta parte no se puede verificar desde fuera del proyecto — solo entrando en el panel de Supabase con tu cuenta. Aquí va la guía paso a paso.

**Lo que ya comprobé yo por mi cuenta, para que estés tranquilo de entrada:** la clave que la app lleva incrustada en el código (`SUPA_KEY`) es la clave pública "anon" (lo confirmé decodificando el token: dice `"role":"anon"`), no la clave secreta "service_role". Eso es justo como debe ser — la clave anon está pensada para ir en el navegador de cualquiera, no es un secreto en sí misma. El problema solo aparecería si además la base de datos no tiene bien configurado quién puede ver qué, que es lo que hay que comprobar en el dashboard.

**Paso a paso para comprobarlo tú:**

1. Entra en https://supabase.com/dashboard e inicia sesión con la cuenta del proyecto.
2. Abre el proyecto de Exvall CM (el que tiene la URL `bmezfzvbvuqehrfvwswp.supabase.co`).
3. En el menú lateral, ve a **"Table Editor"** (Editor de tablas). Verás la lista de tablas que usa el backup (perfiles, entradas, etc.).
4. Junto al nombre de cada tabla debe haber un indicador (un escudo o un aviso) que diga si **Row Level Security (RLS)** está activado o no. Si alguna tabla lo tiene **desactivado**, cualquiera con la clave anon (que está a la vista en el código de la app) podría leer o modificar los datos de todo el mundo — eso sería el problema real a corregir.
5. Ve a **"Authentication" → "Policies"** (Políticas). Ahí verás, tabla por tabla, las reglas configuradas: quién puede leer (`SELECT`), insertar (`INSERT`), modificar (`UPDATE`) o borrar (`DELETE`).
6. Para cada tabla, comprueba que existe una política para cada una de esas cuatro operaciones (no solo para leer) y que la condición de cada una compara con el usuario que ha iniciado sesión — normalmente algo como `auth.uid() = user_id`. Si ves una política sin condición, o con una condición del tipo "usuario autenticado" sin más (sin comparar con el dueño del dato), esa tabla dejaría ver o tocar los datos de otras personas.
7. Si tienes dudas de si una política está bien escrita, puedes ir a **"SQL Editor"** y ejecutar una consulta simulando ser un usuario cualquiera, para comprobar en la práctica qué puede ver.

**Señales de alarma a vigilar:** una tabla con RLS activado pero sin ninguna política (en ese caso nadie puede acceder a nada, la app dejaría de funcionar y se notaría rápido); o una tabla con una política de tipo "true" o sin condición (ese es el peligroso, porque no falla de forma visible — simplemente cualquiera puede ver los datos de cualquiera, y podría pasar desapercibido).

**Estado: ✅ comprobado el 24/08/2026, todo correcto.** Se entró directamente en el dashboard (proyecto `exvall-cm`) y se verificó:

- Solo existe una tabla en el esquema público: `copias de seguridad` (la del backup en la nube).
- **RLS activado** en esa tabla.
- Una única política, "Cada usuario solo ve sus propias copias de seguridad", aplicada a las **cuatro operaciones** (`ALL` — no solo lectura, que es el fallo típico).
- Condición usada tanto para leer como para escribir: `auth.uid() = user_id` — correcta, compara con el usuario que ha iniciado sesión, sin agujeros ni reglas abiertas tipo "true".

No hace falta ninguna acción aquí. Solo habría que repetir esta comprobación si en el futuro se añaden tablas nuevas a la base de datos.

---

## 7. Rastro de auditoría (historial de entradas) — ✅ implementado

**Qué es:** refuerza el valor de la app como prueba propia (justo el objetivo de los puntos 3 y 5) haciendo que no se pueda "maquillar" el registro después de que pase algo — ni borrando entradas sin dejar rastro, ni perdiendo el dato de cómo estaba una entrada antes de editarla.

**De dónde viene la idea:** revisando el código para el punto 6 se vio que ya existía una base (`createdAt` al crear una entrada, `editedAt` al editarla), pero con dos huecos: al editar dos veces, el segundo `editedAt` pisaba al primero sin dejar constancia de la edición anterior; y al eliminar una entrada, `deleteEntry()` la borraba del todo con `splice()`, sin ningún rastro de que hubiera existido.

**Qué se ha cambiado:**

- **Papelera, no borrado total.** Al eliminar una entrada, ahora se guarda una copia completa en `state.papelera` con la fecha exacta de eliminación (`eliminadoEn`), antes de quitarla de la lista de entradas activas. Se puede consultar (de solo lectura, sin poder restaurar todavía) en Configuración → Papelera.
- **Historial acumulativo de ediciones.** Cada vez que se edita una entrada, se añade una línea a un array `historial` dentro de la propia entrada, con la fecha y el total que tenía justo antes de esa edición — no se pisa lo anterior, se acumula.
- **Visible en la propia tabla.** Al pasar el ratón (o mantener pulsado en el móvil) sobre una fila de la tabla de entradas, aparece cuándo se creó y cuántas veces se ha editado.
- **Viaja con los backups.** Tanto la papelera como el historial de ediciones se incluyen ahora en las copias de seguridad `.json` y en el backup en la nube (Supabase) — antes se habrían quedado solo en el dispositivo donde ocurrió el cambio.

**Qué queda fuera de esta primera versión, para no complicar de más:** no hay botón de "restaurar" una entrada desde la papelera (habría que volver a crearla a mano si hiciera falta recuperarla); y el historial de ediciones guarda solo el total y el día anteriores, no todos los campos (servicio, lugar, horas...) — si algún día hace falta más detalle, se puede ampliar.

**Estado: ✅ implementado y probado (24/08/2026)**, 59/59 tests en verde. Archivos afectados: `index.html`, `logica.js`.

---

## 8. Aviso: `node_modules` se subió al repositorio por error — ✅ resuelto (24/08/2026)

Al hacer `git add` + `commit` + `push` con los cambios de esta tanda, se subieron también los **~680 archivos de `node_modules`** (las dependencias descargadas por `npm install`), porque el repositorio no tenía un archivo `.gitignore` que le dijera a git que los ignorase. No rompe nada ni es peligroso, pero infla el repositorio innecesariamente (esas carpetas se generan solas con `npm install`, no deberían guardarse).

**Solución preparada:** un `.gitignore` con `node_modules/` dentro, más el comando para sacar esa carpeta del repositorio sin borrarla de tu disco. Comandos para aplicarlo (desde la carpeta del proyecto en tu terminal):

```powershell
"node_modules/" | Out-File -FilePath .gitignore -Encoding utf8
git rm -r --cached node_modules
git add .gitignore
git commit -m "chore: dejar de trackear node_modules y añadir .gitignore"
git push
```

**Estado: ✅ aplicado y subido (24/08/2026)** — 680 archivos sacados del repositorio, `.gitignore` añadido.

---

## 9. Reportar bug o mejora — ✅ implementado (24/08/2026)

**Qué es:** un botón "🐞 Reportar bug o mejora" en Configuración para que cualquiera que use la app pueda avisar de un fallo o sugerir una idea, sin salir de la app más que a una pestaña nueva.

**Cómo se decidió:** se valoraron tres formas (formulario dentro de la app con Supabase, formulario externo con Google Forms, o un simple botón de email). Se eligió **Google Forms** por ser la más rápida de montar y porque ya trae de serie el aviso por email al llegar una respuesta nueva, sin tener que programar nada aparte.

**Qué se ha montado:**

- Un formulario en Google Forms ("Exvall CM — Reportar bug o mejora") con: **Tipo** (Bug / Mejora), **Descripción** (obligatoria), y tres campos técnicos que la persona no rellena a mano — **Versión de la app**, **Dispositivo** y **Navegador**.
- **Aviso por email activado** en el propio formulario ("Recibir por correo electrónico notificaciones de respuestas nuevas") — cada reporte nuevo llega directo a `moyoojose@gmail.com`, sin nada más que configurar.
- El botón de la app abre el formulario en una pestaña nueva con esos tres campos técnicos **ya rellenados solos** (usando la versión real del Service Worker activo, y detectando iPhone/Android/ordenador y Safari/Chrome/etc. del dispositivo de quien reporta) — la persona solo tiene que elegir Tipo y escribir la Descripción.
- Todas las respuestas también quedan guardadas y consultables juntas en el panel de Google Forms, no solo por email.

**Qué queda fuera de esta primera versión:** no hay ningún cruce automático con el repositorio de GitHub (por ejemplo, crear un "Issue" solo con los bugs) — de momento es solo el formulario con aviso por email. Si más adelante hace falta ese cruce, se puede añadir después sin tocar lo ya hecho.

**Estado: ✅ implementado y probado (24/08/2026)**, 59/59 tests en verde (no afecta a la lógica de cálculo). Archivo afectado: `index.html`.

---

## 10. Hacer la app más "profesional" — ✅ implementado (25/08/2026)

A raíz de la pregunta "¿qué le falta a la app para ser más profesional?", se documentaron cinco propuestas y se cerraron todas con el usuario el 25/08/2026. **Diseño confirmado, pendiente de implementar** (siguiente paso).

### 10.1 Ayuda dentro de la propia app — ✅ diseño confirmado

**Qué es:** ahora mismo toda la explicación de cómo funciona la app vive en el PDF externo. Si alguien tiene una duda mientras está registrando un servicio, tiene que salir de la app a buscarlo.

**Diseño confirmado:**

- **Botón "❓ Ayuda" fijo** (junto al de modo oscuro) que abre un modal con un mini-manual en HTML, organizado por secciones cortas (Registrar, Horas, Especial, Ruta con varias paradas, IRPF, Backup...).
- **Iconos "❓" puntuales** junto a los campos que más dudas generan: Horas (Especial), % Vida Laboral, IRPF, coche por km.
- **Sección específica sobre rutas con varias paradas** (coche "por km" + varias paradas en un mismo trayecto): el usuario ha confirmado que esto genera dudas entre compañeros ("vamos con coche a dos sitios"), así que se explica paso a paso con un ejemplo concreto (ej. "Boda en Arzuaga + Comida en Olmedo el mismo día, mismo coche") tanto en el modal de ayuda como con su propio icono "❓" junto al selector de "Coche: por km".
- Sin tour guiado paso a paso (se descartó: cuesta más de mantener de lo que aporta a usuarios que ya conocen la app).

### 10.2 Avisar de entradas duplicadas o valores raros — ✅ diseño confirmado

**Reglas** (avisan, no bloquean — salvo la 1, que ya existe hoy):

1. *(ya existe)* Precio manual de "Especial" a 0€ → bloquea el guardado.
2. Ya existe una entrada ese mismo día del mes (cualquier servicio, no solo el mismo) → aviso, no bloquea.
3. Horas extra u horas nocturnas por encima de 6h cada una → aviso.
4. Kilómetros por encima de 150km → aviso.
5. Horas del servicio "Especial" dejadas a 0 → aviso suave.

Un único modal reutilizable que junta todos los avisos que apliquen a la vez (no uno detrás de otro).

### 10.3 Gráficos sencillos en Resumen — ✅ diseño confirmado

Un gráfico de barras de ingresos por mes (bruto y neto), hecho a mano con `<canvas>` (sin librería externa nueva), en la pestaña Resumen. Se empieza solo por este; el de horas por tipo de servicio queda para una siguiente tanda si este primero convence.

### 10.4 Comparar un año con otro — ✅ diseño confirmado

Selector "Comparar con: [año]" en Resumen, superpuesto sobre el gráfico de barras del punto 10.3 (dos barras por mes), más una frase-resumen de la diferencia. Empieza comparando contra cualquier año de los que haya datos (no solo el año anterior), ya que el selector no cuesta más trabajo que limitarlo a uno solo.

### 10.5 Copia de seguridad automática — ✅ diseño confirmado (25/08/2026, sustituye al "recordatorio")

**Qué es:** en vez de solo avisar de que hace tiempo que no se hace copia, la copia se hace sola. Se decidió tras hablarlo con el usuario, aceptando el matiz explicado (con dos dispositivos, si algún día alguno registra sin cobertura mientras el otro sube al mismo tiempo, gana el que suba último y el otro se pierde sin avisar — riesgo asumido porque los servicios se registran normalmente el domingo/lunes, con los dos ya con cobertura).

**Diseño:**

- **Subida automática:** unos segundos después de guardar/editar/borrar una entrada (con sesión de nube ya iniciada), se sube sola a Supabase — sin tocar el botón "Subir backup". Se agrupan varios cambios seguidos en una sola subida (para no subir en cada pulsación), esperando una pausa breve tras el último cambio.
- **Descarga automática al abrir:** al entrar en la app (con sesión iniciada), se compara la fecha de la copia en la nube con la del perfil local; si la de la nube es más reciente, se trae sola antes de mostrar nada, para arrancar siempre con lo último.
- **Si falla** (sin conexión, error de Supabase): no se interrumpe el uso de la app ni se repite el aviso constantemente — se reintenta en la siguiente subida automática, y se refleja en el propio panel de "Copia de seguridad en la nube" (ej. "Última subida: hace 2 días" o "pendiente de subir — sin conexión") en vez de con avisos molestos.
- Los botones manuales "⬆ Subir backup" y "⬇ Restaurar" se mantienen, para forzar una subida/bajada concreta cuando se quiera.

**Estado de los 5 puntos (10.1-10.5): ✅ implementados y probados (25/08/2026)**, 93/93 tests en verde (7 nuevos sobre los 86 anteriores). Archivos afectados: `index.html`, `logica.js`, `exvall.test.js`. Verificado con navegador sin interfaz (Playwright): modal de ayuda con la sección de rutas, iconos "❓" puntuales, avisos de día duplicado y de horas excesivas (tanto confirmando como cancelando), el gráfico de ingresos con su selector de año de comparación, y que la subida automática a la nube no falla cuando no hay sesión iniciada — cero errores de JavaScript. También comprobado visualmente con capturas en modo claro y oscuro.

---

## Notas técnicas de referencia

- Repositorio: https://github.com/moyoojose-lgtm/Exvall-control
- App: HTML + CSS + JS vanilla, sin frameworks. IndexedDB para datos locales. Service Worker para offline. Supabase para backup en la nube.
- Convenio aplicable: Hostelería y Alojamientos Turísticos de la provincia de Valladolid (código 47000235011982, vigente hasta el 31/12/2026).
- Normativa de referencia: RDL 8/2019 (registro de jornada, art. 34.9 ET); Orden HFP/792/2023 (0,26 €/km exento de IRPF).
