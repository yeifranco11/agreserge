# AGRESERGE DEL VALLE - Intranet SaaS Empresarial

## Cómo ejecutar
1. Abrir esta carpeta en Visual Studio Code.
2. Ejecutar en terminal:

```bash
npm install
npm run dev
```

3. Abrir en el navegador:

```bash
http://localhost:3000
```

## Usuarios demo
- Administrador del sistema: admin@agreserge.com / 1234
- Administrativo AGRESERGE: documental@agreserge.com / 1234
- Líder: lider@agreserge.com / 1234
- Agremiado: agremiado@agreserge.com / 1234

## Funcionalidades incluidas
- Login funcional con sesión persistente en localStorage y cookie.
- Roles reales en interfaz: administrador, administrativo, líder y agremiado.
- Middleware/proxy básico para rutas protegidas.
- Dashboard ejecutivo.
- Parametrización de instituciones, áreas, usuarios, líderes y asignaciones.
- ERP documental con filtros por institución, área, tipo y búsqueda.
- Checklist documental asistencial y administrativo.
- Ficha técnica del agremiado.
- Cargue, estado, vencimiento, comentarios y vista previa simulada de documentos.
- Diagnóstico de IA documental simulada.
- Gestión de anexos contractuales e informe de actividades.
- Asignación de anexos a líderes.
- Acceso de líderes solo a anexos/agremiados asignados.
- Consolidación de informe de actividades en archivo descargable.
- Google Docs integrado mediante enlaces editables.
- Estadísticas, reportes y análisis.
- Auditoría y trazabilidad.
- Cambio de clave.
- Sistema en español.

## Nota técnica
Esta versión funciona como prototipo frontend empresarial con base de datos simulada en localStorage del navegador. Para producción se recomienda conectar Supabase/PostgreSQL, almacenamiento de archivos y autenticación real con políticas RLS.
