# Portal AGRESERGE - versión final funcional local

## Cambios corregidos
- El perfil Agremiado solo ve Ficha técnica, Cargue documental y AGREBOT.
- Previsualización real de PDF e imágenes en modal usando Blob URL, evitando pantalla blanca y about:blank bloqueado.
- Inicio rediseñado con tamaños de letra acordes y tarjetas KPI controladas.
- Revisión documental con filtros por hospital, nombre/correo y estado.
- Líder institucional ve sus agremiados asignados y solo datos de ficha técnica/avance.
- Asignación de informes: cuando se genera el mes, al líder responsable le aparece en Informes de actividades.
- Enlaces funcionales para Google Docs y Google Sheets.
- Dashboard gerente con gráficas, indicadores, alertas e informe masivo unificado.
- Carga local de documentos, contratos e informes desde el computador.

## Instalación
```bash
npm install
npm run dev
```
Abrir: http://localhost:3000

## Usuarios demo
- admin@agreserge.com / 1234
- gerente@agreserge.com / 1234
- general@agreserge.com / 1234
- lider@agreserge.com / 1234
- agremiado@agreserge.com / 1234

## Nota
La base local usa localStorage del navegador. Si necesita reiniciar los datos, borrar el almacenamiento local del sitio o ejecutar en consola:
```js
localStorage.removeItem('portal_agreserge_db_v30')
```

## Actualización final - Trámites administrativos digitales

Esta versión agrega el módulo **Trámites administrativos** para la Coordinadora Administrativa y Financiera y para el Agremiado.

Incluye:
- Generación local de cartas laborales.
- Generación local de comprobantes de nómina.
- Generación local de comprobantes de pago.
- Certificados de afiliación, paz y salvo y otros trámites.
- Campo de enlace a base Google Sheets / Excel.
- Bandeja digital de trámites por agremiado.
- Solicitud digital desde el perfil Agremiado.
- Generación instantánea desde la Coordinadora Administrativa y Financiera.
- Descarga del documento generado.
- Marcación de trámite como entregado.
- Exportación CSV lista para Google Sheets.

Nota: esta versión es funcional en base local del navegador con localStorage. Para conexión real con Google Sheets/Google Docs se debe configurar API de Google en producción.
