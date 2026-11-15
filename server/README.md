# Backend de procesamiento del LAPD

API FastAPI que recibe el dataset original, ejecuta el notebook incluido en el proyecto y devuelve un resultado listo para los gráficos de Angular. Forma parte del prototipo académico descrito en el [README principal](../README.md).

## Responsabilidades

| Archivo | Función |
| --- | --- |
| `main.py` | Validación de la carga, consulta de trabajos y descarga de artefactos permitidos. |
| `runner.py` | Creación de trabajos, ejecución asíncrona y límite de un notebook activo. |
| `notebooks/Arquitectura_Redes_Neuronales_Perfilamiento_Delictivo.ipynb` | Limpieza, perfiles, panel mensual, entrenamiento, evaluación y exportaciones. |
| `dashboard_builder.py` | Lectura de las salidas y preparación del contrato del dashboard. |
| `operational_builder.py` | Estadísticas por división y series para los gráficos. |
| `build_seed.py` | Generación del JSON inicial de referencia. |
| `requirements.txt` | Dependencias de Python. |

El notebook se distribuye sin resultados guardados y no instala dependencias durante su ejecución. El usuario de la web carga **solo el CSV original**. Los resultados procesados y el modelo se generan en el servidor.

## Instalación local

Ejecuta los comandos desde la raíz del repositorio. El entorno utilizado para el despliegue es Python 3.12 con TensorFlow para CPU.

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r server/requirements.txt
python -m ipykernel install --sys-prefix --name python3 --display-name "LAPD Python"
```

El kernel `python3` debe pertenecer al entorno que contiene las dependencias. No basta con tener Jupyter instalado en otro entorno del sistema.

```bash
export LAPD_CORS_ORIGINS="http://localhost:4200"
python -m uvicorn server.main:app --host 127.0.0.1 --port 8000 --workers 1
```

Mantén **un worker**: el registro de trabajos y el semáforo de concurrencia pertenecen al proceso. Multiplicar workers no crea una cola compartida.

## Configuración

Las variables se leen al importar el backend. En producción, modifica `/etc/lapd.env` y reinicia el servicio cuando no haya trabajos activos para aplicar cambios.

| Variable | Valor predeterminado | Descripción |
| --- | --- | --- |
| `LAPD_NOTEBOOK_PATH` | Notebook incluido en `server/notebooks/` | Ruta alternativa opcional. No requiere configuración para usar el archivo del repositorio. |
| `LAPD_JOBS_DIR` | `server/jobs/` | Carpeta para entradas y salidas. En producción se utiliza `/var/lib/lapd/jobs`. |
| `LAPD_CORS_ORIGINS` | `http://localhost:4200,http://127.0.0.1:4200` | Orígenes autorizados, separados por comas. No es un mecanismo de autenticación. |
| `LAPD_NOTEBOOK_TIMEOUT` | `7200` | Límite en segundos **por celda**, no para todo el trabajo. |
| `LAPD_MAX_UPLOAD_BYTES` | `536870912` | Límite de 512 MiB por CSV. |
| `LAPD_CRIME_NROWS` | Sin límite | Restringe las filas leídas por el notebook para pruebas. No representa una ejecución completa. |

Ejemplo de configuración local con carpeta de resultados explícita:

```bash
export LAPD_JOBS_DIR="$PWD/server/jobs"
export LAPD_CORS_ORIGINS="http://localhost:4200"
export LAPD_NOTEBOOK_TIMEOUT=7200
```

El ejecutor configura `CRIME_DATA` para señalar el archivo recibido y transmite `LAPD_CRIME_NROWS` al notebook como `CRIME_NROWS`. Una muestra pequeña puede fallar por falta de meses o historial suficiente; limitar filas no garantiza que el entrenamiento sea viable.

## Datos de entrada

La petición utiliza `multipart/form-data` con un campo llamado `file`. Se admiten archivos con extensión `.csv`; la extensión por sí sola no valida el contenido.

El notebook espera al menos `date_occurred`, `reporting_district` y `crime_description`. Para reproducir el caso de estudio y sus estadísticas se debe conservar el esquema completo utilizado:

| Grupo | Columnas |
| --- | --- |
| Fechas | `date_occurred`, `date_reported` |
| Territorio | `reporting_district`, `area_name`, `latitude`, `longitude` |
| Delito y contexto | `crime_description`, `premise_description`, `weapon_description`, `modus_operandi` |
| Víctima | `victim_age`, `victim_sex`, `victim_descent` |

Los nombres de columnas se normalizan a minúsculas. El notebook detecta el orden de día y mes, normaliza campos y excluye el último mes de ocurrencia por considerarlo incompleto. Para evaluar otro dataset se debe revisar si esta exclusión sigue siendo apropiada.

El constructor del dashboard utiliza las mismas columnas seleccionadas que el notebook antes de eliminar duplicados. Esto permite conciliar los conteos de las divisiones con los 848.979 incidentes utilizables del caso de referencia.

## API

| Método | Ruta | Resultado |
| --- | --- | --- |
| GET | `/api/health` | Estado del servicio y disponibilidad del notebook y Jupyter. |
| POST | `/api/jobs` | Recibe el CSV y devuelve el trabajo con HTTP 202. |
| GET | `/api/jobs/{id}` | Estado, etapa, mensajes y últimas líneas del log. |
| GET | `/api/jobs/{id}/result` | JSON del dashboard cuando el trabajo terminó. |
| GET | `/api/jobs/{id}/artifacts/{filename}` | Descarga de un artefacto incluido en la lista permitida. |

Prueba básica:

```bash
curl --fail http://127.0.0.1:8000/api/health
```

Carga desde terminal, como alternativa a la interfaz:

```bash
curl --fail \
  -F 'file=@/ruta/Crime_Data_from_2020_to_Present-vip.csv' \
  http://127.0.0.1:8000/api/jobs
```

Consulta con el identificador devuelto por la carga:

```bash
LAPD_JOB_ID="identificador-devuelto"
curl --fail "http://127.0.0.1:8000/api/jobs/$LAPD_JOB_ID"
curl --fail "http://127.0.0.1:8000/api/jobs/$LAPD_JOB_ID/result"
```

Códigos relevantes: `400` para extensión o artefacto no permitido, `413` para carga demasiado grande, `404` para trabajo o archivo inexistente y `409` cuando se solicita un resultado todavía no disponible. Un trabajo aceptado con 202 puede terminar en `failed`; hay que consultar su estado.

## Ciclo de ejecución

1. El archivo se almacena en `<LAPD_JOBS_DIR>/<id>/input.csv`.
2. Se crea un hilo para el trabajo. El semáforo permite un solo procesamiento activo; los demás esperan como `queued`.
3. El notebook incluido se copia a la carpeta del trabajo como `notebook.ipynb`.
4. Se ejecuta `python -m jupyter nbconvert --to notebook --execute`, con `CRIME_DATA` y el kernel `python3`.
5. El notebook prepara el dataset, entrena y evalúa los modelos, y exporta los artefactos.
6. Los constructores preparan `dashboard.json`.
7. El trabajo cambia a `completed`. Angular obtiene el JSON y aplica sus datos al tablero.

Los estados de la API son `queued`, `running`, `completed` y `failed`. El progreso marca etapas: inicio del notebook (10), normalización de resultados (85) y finalización (100). Un fallo también cierra el trabajo con progreso 100; **el campo `status` determina si hubo éxito**.

La API conserva hasta 200 líneas del log en memoria y devuelve las últimas 40 al consultar el trabajo. Las salidas de las celdas también quedan en el notebook ejecutado; el log del proceso no es una transmisión detallada de cada época del entrenamiento.

En el frontend existen fases adicionales: subida, archivo enviado y aplicación del resultado. El color verde durante la subida representa transferencia real de bytes, medida con XMLHttpRequest; el naranja representa procesamiento. El éxito visual final se muestra después de aplicar el resultado, no solo después de terminar el notebook.

## Archivos generados y uso

| Archivo | Contenido y uso |
| --- | --- |
| `catalogo_perfiles.csv` | Definición de los seis grupos delictivos. |
| `auditoria_tipificaciones.csv` | Asignación auditable de descripciones a perfiles y submodalidades. |
| `matriz_zona_perfil.csv` | Conteos y participaciones por zona durante la calibración. |
| `perfil_zona_largo.csv` | Caracterización y prioridad por zona y perfil. |
| `perfil_zona_resumen.csv` | Perfil principal, secundarios y prioridad de cada zona. |
| `ranking_zona_perfil.csv` | Orden de prioridad territorial por zona y perfil. |
| `resultados_modelos.csv` | MAE, RMSE y R² de los métodos evaluados. |
| `predicciones_test.csv` | Valores observados y estimados de los meses de prueba. |
| `predicciones_zona_perfil.csv` | Promedios de evaluación por zona y perfil. |
| `hotspots_perfil.csv` | Concentración espacial por celdas de aproximadamente 500 m. |
| `mlp_perfilamiento.keras` | Red neuronal entrenada. |
| `executed.ipynb` | Notebook ejecutado, con sus salidas. |
| `dashboard.json` | Contrato final que consume Angular. |

El notebook genera los hotspots cuando existen coordenadas y volumen suficientes. El constructor actual espera `hotspots_perfil.csv`; un dataset que no permita generar esa salida puede fallar al construir el dashboard, aunque otras etapas hayan terminado.

El archivo `.keras` conserva la red, pero la inferencia requiere también el mismo escalado, codificación, construcción de variables y transformación del objetivo. No se debe asumir que basta con cargarlo para procesar cualquier CSV o responder una consulta futura.

## Contrato del dashboard

`dashboard.json` contiene `zones`, `profiles`, `profileCatalog`, `models`, `typifications`, `scope`, `globalMix`, `premiseLabels` y `modelRun`.

Cada división incluye un objeto `analytics` con delitos frecuentes, serie mensual, horas, días, composición por perfiles, comparación histórica, zonas de reporte, ranking y hotspots. El frontend utiliza las definiciones de `src/app/core/models/crime-analysis.models.ts`.

Las matrices territoriales y las prioridades corresponden al periodo de calibración. La composición descriptiva del periodo completo se calcula desde los incidentes clasificados, para no presentarla como si fuera el mismo corte de la matriz de calibración. Las predicciones de prueba son históricas, no un pronóstico nuevo después del último mes disponible.

## Regenerar el conjunto inicial

No es necesario reentrenar para actualizar el archivo inicial si ya existen el CSV original y las salidas de una ejecución compatible:

```bash
source .venv/bin/activate
python server/build_seed.py \
  --raw /ruta/Crime_Data_from_2020_to_Present-vip.csv \
  --outputs /ruta/salidas-del-notebook \
  --out src/app/core/data/dashboard.seed.json \
  --panel-rows 213624 \
  --train-rows 150870 \
  --valid-rows 31338 \
  --panel-zones 1102
```

Los números del ejemplo corresponden a la ejecución de referencia y deben actualizarse si cambia el análisis. El script permite declarar metadatos adicionales; consulta `python server/build_seed.py --help`. No utilices esos argumentos para ocultar diferencias entre los datos recibidos y los resultados calculados.

Después de regenerar el JSON, vuelve a compilar Angular para publicar el nuevo conjunto inicial. Los trabajos nuevos actualizan la sesión abierta, pero no reemplazan automáticamente este archivo del repositorio.

## Operación y diagnóstico

| Situación | Comprobación |
| --- | --- |
| `notebookExists: false` | Revisa el archivo incluido y cualquier valor de `LAPD_NOTEBOOK_PATH`. |
| Jupyter o dependencias no disponibles | Ejecuta la API y el kernel desde `/opt/lapd/.venv` en la VM. |
| Subida rechazada con 413 | Comprueba tanto `client_max_body_size` en Nginx como `LAPD_MAX_UPLOAD_BYTES`. |
| Fallo por historial insuficiente | Revisa meses disponibles, columnas y límites de filas para pruebas. |
| Trabajo `failed` | Consulta `error`, `logs`, `journalctl -u lapd` y el notebook ejecutado, si está disponible. |
| HTTP 404 después de reiniciar | El registro en memoria se perdió; los archivos existentes no se registran automáticamente. |
| Cambios de código sin efecto | Confirma que actualizaste `/opt/lapd`, no solo el clon de Git; reinicia el backend si cambió Python. |

Comandos del despliegue utilizado:

```bash
sudo systemctl status lapd --no-pager
sudo journalctl -u lapd -n 80 --no-pager
sudo du -sh /var/lib/lapd/jobs
df -h /
```

El servicio no implementa autenticación propia, cancelación de trabajos, recuperación automática de estados ni limpieza de resultados. La configuración de acceso, la conservación de archivos y el seguimiento de consumo pertenecen a la operación del despliegue. No reinicies el servicio mientras existan ejecuciones que quieras conservar activas.
