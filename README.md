# Análisis delictivo territorial del LAPD

Aplicación web académica para explorar denuncias registradas en Los Ángeles, analizar su composición territorial y consultar estimaciones mensuales de incidentes. Integra la carga del dataset original, el procesamiento en el servidor, el entrenamiento y la evaluación de modelos, y la presentación de resultados mediante dashboards.

**Demo:** [lapd-crime-analysis.lrydev.me](https://lapd-crime-analysis.lrydev.me/)

El usuario selecciona una de las **21 divisiones policiales** y consulta delitos frecuentes, evolución mensual, horarios, lugares, puntos de concentración y prioridades de revisión. No necesita cargar los archivos de resultados ni conocer las métricas del modelo para consultar las estadísticas.

## Contexto académico y objetivo

Proyecto final del curso de Inteligencia Artificial de Ingeniería de Sistemas. La pregunta de trabajo es cómo transformar un conjunto extenso de denuncias en información que apoye la revisión territorial y la planificación preventiva.

| Etapa académica | Propósito |
| --- | --- |
| Unidad 1 | Definir el problema, las variables, los datos y el enfoque de solución. |
| Unidad 2 | Experimentar y comparar alternativas de análisis territorial y espacial. |
| Unidad 3 | Integrar el procesamiento, el modelo seleccionado, su evaluación y una demo funcional para interpretar los resultados. |

Este repositorio implementa el **prototipo final de la Unidad 3**. Los experimentos previos contextualizan el trabajo, pero no deben confundirse con el flujo ejecutado por esta aplicación.

El modelo predictivo integrado es una **MLP**, una red neuronal multicapa perteneciente al aprendizaje automático. La agrupación de tipificaciones en perfiles y el ranking de prioridad se calculan con reglas explícitas; no son clasificaciones aprendidas por la MLP.

## Qué permite hacer

- Alternar entre tema claro y oscuro desde el interruptor de la barra superior. La elección se guarda en el navegador y el tema inicial es claro.
- Subir el CSV original desde **Fuente de datos**, sin preparar manualmente las salidas.
- Seguir los bytes y el porcentaje de subida dentro del diálogo y desde el botón de la cabecera.
- Cerrar el diálogo mientras continúa el trabajo, manteniendo abierta la pestaña.
- Distinguir la subida en verde, el procesamiento en naranja, la actualización completada y los errores.
- Seleccionar divisiones en un mapa SVG de encuadre fijo, construido con sus límites oficiales GeoJSON y sin mapas de fondo externos.
- Explorar barras de delitos frecuentes, distribución circular por perfiles, series mensuales, horarios, días y lugares.
- Comparar cantidades registradas y estimadas durante el periodo histórico de prueba.
- Consultar zonas de reporte, prioridades y puntos de concentración espacial.
- Comparar los errores de los métodos en **Precisión**, con métricas técnicas desplegables.

El progreso de subida representa bytes enviados. El porcentaje del procesamiento representa etapas del backend, **no el porcentaje de épocas completadas ni una estimación del tiempo restante**.

## Datos y escalas territoriales

Caso de estudio: archivo `Crime_Data_from_2020_to_Present-vip.csv` del LAPD, con registros de 2020 a 2023.

| Concepto | Ejecución de referencia |
| --- | ---: |
| Registros originales | 852.950 |
| Incidentes utilizables | 848.979 |
| Tipificaciones auditadas | 138 |
| Divisiones representadas en el mapa | 21 |
| Zonas con perfil territorial | 1.000 |
| Zonas presentes en el panel supervisado | 1.102 |
| Filas del panel supervisado | 213.624 |

Diciembre de 2023 se excluye por tratarse de un mes incompleto. Las cifras corresponden a la ejecución de referencia, no son valores garantizados para cualquier archivo que se cargue.

Una **división** contiene varias **zonas de reporte**. El modelo predice por zona de reporte, perfil y mes; la interfaz agrega resultados para facilitar su lectura por división. No deben interpretarse las métricas de una combinación zona–perfil–mes como errores del total de toda una división.

### Seis perfiles delictivos

| Código | Descripción |
| --- | --- |
| P01 | Delitos vehiculares y movilidad |
| P02 | Robo y hurto patrimonial |
| P03 | Robos residenciales e intrusión |
| P04 | Delitos contra la vida y la integridad |
| P05 | Delitos sexuales |
| P06 | Fraude, vandalismo y daños |

Los perfiles se asignan mediante reglas sobre las descripciones de delitos. Una zona puede contener varios perfiles relevantes. El perfil principal es el de mayor participación; el prioritario combina participación (40 %), concentración relativa o *lift* (25 %), tendencia (15 %), severidad (10 %) y evidencia (10 %).

Las matrices de perfiles y rankings se calibran con 2020. Los gráficos descriptivos del periodo completo y los resultados de evaluación usan sus propios cortes temporales. El dashboard distingue estos ámbitos.

## Entrenamiento y evaluación

La variable objetivo es el número de incidentes de **t+1**, utilizando información disponible hasta **t**. La matriz de entrada contiene 15 variables numéricas y seis columnas de codificación del perfil: 21 columnas en total. Incluye rezagos, medias móviles, calendario, tendencia y agregados territoriales.

La MLP tiene capas densas de 128, 64 y 32 unidades, normalización por lotes, Dropout y salida Softplus. Se entrena con el objetivo transformado mediante `log1p`; las métricas finales se calculan después de volver a la escala de incidentes. El notebook contiene los parámetros y la implementación completos.

| Partición | Meses objetivo | Filas |
| --- | --- | ---: |
| Entrenamiento | Febrero de 2021 a enero de 2023 | 150.870 |
| Validación | Febrero a junio de 2023 | 31.338 |
| Prueba | Julio a noviembre de 2023 | 31.416 |

Resultados de referencia exportados en `resultados_modelos.csv`:

| Modelo | MAE ↓ | RMSE ↓ | R² ↑ |
| --- | ---: | ---: | ---: |
| **MLP** | **1,4392** | 2,8949 | 0,5735 |
| HistGradientBoosting | 1,4496 | 2,3916 | 0,7089 |
| Random Forest | 1,4722 | **2,3718** | **0,7137** |
| Persistencia | 1,7730 | 2,8862 | 0,5761 |

La persistencia estima t+1 repitiendo el conteo de t. La MLP reduce su MAE aproximadamente un **18,83 %** y se conserva por ese criterio. Random Forest obtiene mejores RMSE y R²: no se afirma que la MLP sea superior en todas las métricas.

**Las estimaciones mostradas son una evaluación histórica de julio a noviembre de 2023.** Ejecutar el pipeline con un CSV no equivale a ofrecer un pronóstico nuevo posterior al último mes disponible.

## Arquitectura y responsabilidades

| Archivo o carpeta | Responsabilidad |
| --- | --- |
| `src/app/core/models/` | Contratos de datos del dashboard. |
| `src/app/core/data/dashboard.seed.json` | Resultados iniciales de referencia. |
| `src/app/core/services/crime-analysis.service.ts` | Datos del tablero y selección territorial mediante señales. |
| `src/app/core/services/data-job.service.ts` | Subida con progreso, seguimiento del trabajo y aplicación del resultado. |
| `src/app/features/map/` | Mapa SVG y selección de divisiones. |
| `src/app/features/dashboard/zone-view/` | Resumen de la división seleccionada. |
| `src/app/features/dashboard/profiles-hero/` | Dashboard detallado de la división, pese al nombre histórico del componente. |
| `src/app/features/dashboard/model-view/` | Comparación visual de precisión. |
| `src/app/features/dashboard/data-view/` | Fuente, alcance y limitaciones de los datos. |
| `src/app/shared/components/stats-chart/` | Barras, series y gráfico circular, con tablas de datos desplegables. |
| `src/app/shared/components/data-source-dialog/` | Selección del CSV, progreso y mensajes del trabajo. |
| `public/data/lapd-divisions.geojson` | Límites oficiales de las divisiones. |
| `server/main.py` | API de carga, consulta y descarga. |
| `server/runner.py` | Ejecución asíncrona y serializada del notebook. |
| `server/notebooks/` | Notebook incluido con el código de procesamiento y entrenamiento. |
| `server/dashboard_builder.py` | Normalización al contrato del dashboard. |
| `server/operational_builder.py` | Agregados estadísticos por división. |
| `server/build_seed.py` | Regeneración de los resultados iniciales. |

El flujo comienza con un CSV recibido por FastAPI. El ejecutor crea una carpeta por trabajo y ejecuta el notebook mediante Jupyter. Los constructores convierten las salidas en `dashboard.json`. Angular consulta el estado cada 1,5 segundos y solicita el resultado al finalizar. La subida y el seguimiento pertenecen a un servicio compartido y no se cancelan al cerrar el diálogo.

## Ejecutar en desarrollo

Entorno utilizado: **Node.js 22 y Python 3.12**, con un entorno virtual para las dependencias de Python. El entrenamiento usa TensorFlow para CPU; no requiere CUDA ni GPU.

Desde la raíz del repositorio, prepara el backend:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r server/requirements.txt
python -m ipykernel install --sys-prefix --name python3 --display-name "LAPD Python"

export LAPD_CORS_ORIGINS="http://localhost:4200"
python -m uvicorn server.main:app --host 127.0.0.1 --port 8000 --workers 1
```

En otra terminal, inicia el frontend:

```bash
npm ci
npm start
```

Abre `http://localhost:4200/`. En desarrollo sobre `localhost` o `127.0.0.1`, el frontend utiliza `http://localhost:8000`. En un dominio de producción utiliza `/api/` en el mismo origen.

Para cambiar expresamente el origen de la API, define esta variable en `src/index.html`, antes de cargar Angular:

```html
<script>
  globalThis.__LAPD_API_BASE__ = 'https://api.ejemplo.com';
</script>
```

El backend local se comprueba con:

```bash
curl --fail http://127.0.0.1:8000/api/health
```

La respuesta debe indicar `notebookConfigured`, `notebookExists` y `jupyterAvailable` como `true`. Esto verifica la configuración; una prueba completa exige subir un CSV, terminar el trabajo y aplicar su resultado.

### Compilar y comprobar

```bash
npm run build
npx tsc --noEmit -p tsconfig.spec.json
npm test -- --watch=false
```

La compilación genera los archivos publicables en `dist/lapd-crime-analysis/browser/`. Las pruebas con Karma necesitan un navegador Chrome disponible y permisos para iniciarlo. Las pruebas de subida cubren el progreso, el cierre del diálogo, la prevención de envíos duplicados y los errores de transferencia y resultados.

## Uso de la demo

1. Abre **Fuente de datos** y selecciona el dataset original en CSV.
2. Pulsa **Subir y ejecutar notebook**. Elegir el archivo por sí solo no inicia la transferencia.
3. Sigue el progreso verde de subida y el estado naranja del procesamiento.
4. Puedes cerrar el diálogo y seguir el estado desde la cabecera. **No cierres ni recargues la pestaña durante la transferencia.**
5. Cuando se aplican los resultados, selecciona una división y revisa sus gráficos.
6. Consulta **Precisión** para interpretar los errores y **Fuente y alcance** para revisar las condiciones de lectura.

La MLP estima cantidades. Las prioridades apoyan la revisión territorial mediante reglas multicriterio; no son órdenes automáticas de despliegue policial.

## Despliegue utilizado

El entorno de la demo es una VM con Ubuntu 24.04 LTS, 8 vCPU, 32 GB de RAM y 100 GB de disco. Nginx publica Angular y actúa como proxy de la API. Un servicio systemd denominado `lapd` mantiene Uvicorn escuchando en `127.0.0.1:8000`, con **un solo worker**.

| Ruta en la VM | Uso |
| --- | --- |
| `~/lapd-crime-analysis` | Repositorio donde se ejecuta `git pull`. |
| `/opt/lapd` | Copia de trabajo utilizada por el servicio y la compilación. |
| `/opt/lapd/.venv` | Entorno Python del servicio. |
| `/var/www/lapd` | Frontend compilado servido por Nginx. |
| `/var/lib/lapd/jobs` | CSV recibidos y salidas por trabajo. |
| `/etc/lapd.env` | Configuración del backend. |
| `/etc/nginx/sites-available/lapd` | Configuración del sitio y del proxy. |

Nginx debe conservar la ruta `/api/` al enviarla a FastAPI y permitir archivos de hasta 512 MiB si se mantiene el límite predeterminado del backend. El dominio utiliza HTTPS. La aplicación no implementa autenticación propia.

### Publicar cambios del frontend

En esta instalación, `git pull` no actualiza por sí solo `/opt/lapd` ni los archivos publicados. Después de subir los cambios al repositorio, ejecuta en la VM:

```bash
cd ~/lapd-crime-analysis
git pull --ff-only
sudo rsync -a src/ /opt/lapd/src/

cd /opt/lapd
sudo env PATH="/opt/node22/bin:$PATH" npm run build
sudo rsync -a --chown=root:root --chmod=D755,F644 \
  dist/lapd-crime-analysis/browser/ /var/www/lapd/
```

Si cambian `package.json` o `package-lock.json`, copia también esos archivos y ejecuta `npm ci` antes de compilar. Esta actualización del frontend no requiere reiniciar el procesamiento Python.

### Actualizar el backend

Espera a que terminen los trabajos activos antes de actualizar y reiniciar:

```bash
cd ~/lapd-crime-analysis
git pull --ff-only
sudo rsync -a --exclude='__pycache__' --exclude='jobs' server/ /opt/lapd/server/
sudo /opt/lapd/.venv/bin/python -m pip install -r /opt/lapd/server/requirements.txt
sudo systemctl restart lapd
curl --fail http://127.0.0.1:8000/api/health
```

Consulta de operación:

```bash
sudo systemctl status lapd nginx --no-pager
sudo journalctl -u lapd -n 80 --no-pager
sudo du -sh /var/lib/lapd/jobs
df -h /
```

## Salidas y documentación del backend

El servidor genera diez CSV, el modelo `.keras`, el notebook ejecutado y `dashboard.json`. El detalle de cada archivo, la configuración, el contrato de la API y los errores habituales se encuentra en [server/README.md](server/README.md).

Los resultados iniciales se pueden regenerar sin reentrenar si ya se dispone del CSV original y de las salidas del notebook; el procedimiento también se documenta allí.

## Alcance y limitaciones

- Las denuncias registradas no representan toda la criminalidad ocurrida; no se calculan tasas poblacionales.
- Los resultados son descriptivos y predictivos, no causales, y requieren interpretación especializada.
- Los periodos de calibración, descripción y evaluación no son intercambiables.
- Las estimaciones históricas no constituyen una validación operativa futura.
- El archivo `.keras` no sustituye la preparación de variables, el escalado ni la codificación necesarios para reutilizar la red.
- El estado de trabajos vive en memoria. Reiniciar el backend interrumpe ejecuciones y pierde la consulta de esos identificadores, aunque los archivos permanezcan en disco.
- Cerrar el diálogo mantiene el seguimiento; recargar la página pierde el seguimiento del frontend y vuelve a mostrar los resultados iniciales de referencia. No existe una restauración automática del último dashboard procesado.
- Los trabajos se conservan en disco sin limpieza automática y la cola no está distribuida entre varias máquinas.

Las salidas apoyan la revisión de información territorial agregada. No permiten predecir conductas individuales ni automatizar intervenciones policiales.

## Recursos visuales

El favicon utiliza el icono [Map Pinned de Lucide](https://lucide.dev/icons/map-pinned),
adaptado con fondo azul para identificar el análisis territorial. Se incluyen el
[SVG original](public/icons/map-pinned.svg) y su [licencia ISC](public/icons/LICENSE-lucide.txt).
El sitio publica versiones SVG e ICO del favicon sin depender de servicios externos.
