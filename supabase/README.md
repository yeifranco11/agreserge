# Supabase seguro para AGRESERGE

Este esquema separa la información en tablas reales:

- `agreserge_users`
- `agreserge_entities`
- `agreserge_areas`
- `agreserge_documents`
- `agreserge_permissions`
- `agreserge_assignments`
- `agreserge_procedures`
- `agreserge_audit`

También crea el bucket privado `agreserge-files` para documentos.

## Cómo crear la base

1. Abra Supabase.
2. Vaya a SQL Editor.
3. Pegue el contenido de `supabase/schema.sql`.
4. Ejecute el script.
5. Abra la app e ingrese con `admin@agreserge.com / 1234`.

El primer ingreso crea los datos iniciales en las tablas reales de Supabase.

Las tablas tienen RLS activado y no crean políticas abiertas. La app escribe mediante rutas de servidor con validación de sesión y rol.

## Verificación

Cuando la app esté corriendo, visite:

```text
/api/agreserge-health
```

Debe devolver `ok: true` cuando todas las tablas existen.
