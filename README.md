# ThinkPin

Starter de Next.js con App Router, TypeScript, Tailwind CSS 4, SmoothUI y
componentes de RareUI. La página inicial sirve como muestra visual adaptable
para ambos catálogos.

## Requisitos

- Node.js 20.9 o superior
- pnpm

## Desarrollo

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Abre [http://localhost:3000](http://localhost:3000).

### Supabase

Configura `NEXT_PUBLIC_SUPABASE_URL` y
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` en `.env.local` con los valores de tu
proyecto Supabase. Los clientes SSR están en `src/lib/supabase/client.ts` y
`src/lib/supabase/server.ts`; ambos usan exclusivamente la clave publishable.
El Proxy en `src/proxy.ts` renueva la sesión y filtra las rutas privadas; esas
páginas también validan sus claims en el servidor con `auth.getClaims()`. No
pongas claves secretas ni `service_role` en variables
`NEXT_PUBLIC_*`.

El callback `/auth/callback` intercambia el `code` PKCE una sola vez usando
`exchangeCodeForSession`. Si el código falta, expiró o no es válido, devuelve al
login con un error recuperable. El parámetro `next` solo acepta rutas internas;
destinos externos se sustituyen por `/app`.

El Proxy protege toda la zona `/app`, renueva las cookies y redirige usuarios
sin sesión a `/login`. Las rutas privadas son `/app` (dashboard),
`/app/bookmarks`, `/app/collections`, `/app/favorites`, `/app/search` y
`/app/save`; las operaciones de datos sensibles también deben validar la
identidad en el servidor cuando se conecten a Supabase.

Las URL previas (`/dashboard`, `/library`, `/collections`, `/search` y `/save`)
redirigen a sus equivalentes bajo `/app` para conservar enlaces existentes.
Cuando la persona ya tiene sesión e intenta abrir `/login`, se le redirige a su
destino interno solicitado o, por defecto, a `/app`.

#### Google OAuth

El botón Google de login y signup inicia `signInWithOAuth` y vuelve a
`/auth/callback?next=%2Fapp`, donde se canjea el código PKCE y se guarda
la sesión. Para habilitarlo:

- En Supabase, activa el proveedor Google y configura el OAuth Client ID y
  Client Secret de Google.
- En Google Cloud, agrega `http://localhost:3000` y el origen de producción a
  **Authorized JavaScript origins**.
- En **Authorized redirect URIs** de Google, agrega exactamente la callback
  de Supabase que muestra la configuración del proveedor (no la callback de
  ThinkPin).
- En Supabase **Authentication → URL Configuration → Redirect URLs**, permite
  `http://localhost:3000/auth/callback` y la URL de producción equivalente.

El Client Secret de Google se guarda únicamente en Supabase, nunca en Next.js
ni en el navegador.

#### Perfiles

La migración `supabase/migrations/20261003132200_create_profiles.sql` crea
`public.profiles`, relacionada directamente con `auth.users(id)` y sin una
tabla `users` duplicada. Crea automáticamente un perfil al registrarse una
cuenta, copia el nombre y avatar disponibles en los metadatos del proveedor y
aplica RLS para que cada usuario solo pueda leer y actualizar su propio perfil.
El `username` queda opcional y único.

Aplica la migración desde el SQL Editor de Supabase o con Supabase CLI antes de
consultar perfiles desde la aplicación. El tipo de dominio `UserProfile` está
en `src/types/user.ts`; mantiene `createdAt` y `updatedAt` como fechas
serializadas.

#### Esquema inicial de datos y RLS

Después de aplicar la migración de perfiles, ejecuta
`supabase/migrations/20261003133200_create_core_schema.sql`. Crea `bookmarks`,
`collections`, `bookmark_collections`, `tags`, `bookmark_tags`, `notes` y
`bookmark_activity`. Las tablas privadas incluyen `user_id`; las claves
foráneas compuestas impiden relacionar bookmarks, colecciones o tags de
distintos usuarios. RLS queda habilitado con políticas de propietario desde la
misma migración. La actividad permite leer e insertar, pero no actualizar ni
borrar eventos.

#### Storage y pgvector

Después de las migraciones anteriores, ejecuta
`supabase/migrations/20261003134700_create_avatars_storage_and_vector.sql`.
Configura el bucket privado `avatars` (máximo 5 MiB; JPEG, PNG, WebP o AVIF)
y políticas que limitan lectura, carga, actualización y borrado al usuario
propietario. Usa rutas como `<user-id>/avatar.webp`. Al ser privado, muestra
avatares usando URLs firmadas; no guardes una URL firmada temporal en
`profiles.avatar_url`.

La migración también activa la extensión `vector` en el esquema `extensions`.
Esto solo habilita pgvector: todavía no crea columnas de embeddings, índices
vectoriales ni funcionalidades RAG. Puedes verificarlo en **Database →
Extensions** o con:

```sql
select extname, extnamespace::regnamespace as schema
from pg_extension
where extname = 'vector';
```

## Comandos

```bash
pnpm dev
pnpm lint
pnpm build
pnpm start
```

## Componentes

- SmoothUI está instalado en `src/components/smoothui/`; para agregar otro:
  `pnpm dlx shadcn@latest add @smoothui/<componente>`.
- RareUI está instalado en `components/rareui/`; para agregar otro:
  `pnpm dlx rareui add <componente> -y`.
- Los componentes usan shadcn/ui, Tailwind CSS y Motion. Las dependencias del
  proyecto se administran con pnpm.
