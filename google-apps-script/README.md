# Puente gratuito entre AGRESERGE y Google Drive

1. Crear un proyecto en https://script.google.com/ con la cuenta propietaria de los formatos.
2. Copiar `Code.gs` en el editor.
3. En **Configuración del proyecto > Propiedades de la secuencia de comandos**, crear `PORTAL_SECRET` con un valor aleatorio largo.
4. En **Implementar > Nueva implementación > Aplicación web**, ejecutar como propietario y permitir acceso a cualquier usuario con el enlace.
5. Autorizar Drive y copiar la URL terminada en `/exec`.
6. Guardar en Vercel `GOOGLE_APPS_SCRIPT_URL` y `GOOGLE_APPS_SCRIPT_SECRET` para Development y Production.

La URL pública no permite operar sin el secreto. Las plantillas maestras nunca se editan: el script solo crea copias dentro de `PERIODOS GENERADOS/AÑO/MES`.
