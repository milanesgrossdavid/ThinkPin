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

#### Guardar bookmarks

`POST /api/bookmarks` requiere una sesión de Supabase y acepta únicamente
`{ "url": "https://example.com/article" }`. El servidor valida HTTP/HTTPS,
normaliza la URL para deduplicar, elimina fragmentos y parámetros de tracking
conocidos sin descartar otros parámetros, y deriva `domain` de la URL.
`user_id` siempre sale de `auth.getUser()`, nunca del body. El endpoint conserva
la URL original en `url`, guarda la URL determinística en `normalized_url`,
deja `canonical_url` nula hasta obtener metadata y marca el bookmark con
`content_status = pending`; devuelve `201` sin esperar scraping ni IA.

La base de datos garantiza unicidad por usuario tanto para `canonical_url`
cuando está disponible como para `normalized_url`. Se busca primero una
coincidencia canonical y luego una normalizada. Si ya existe, el endpoint
responde `409` con `code: "BOOKMARK_ALREADY_EXISTS"` y `bookmarkId`; también
resuelve carreras concurrentes de inserción. No se hace enriquecimiento
asíncrono todavía: al integrar Inngest, el job se encolará después del guardado,
sin hacer que un fallo de análisis pierda el bookmark.

#### Extracción de metadata

`src/lib/ingestion/metadata.ts` exporta `extractMetadata(url)`, un extractor
independiente de Supabase que devuelve título, descripción, imagen, nombre del
sitio, favicon y canonical URL. Prefiere Open Graph, resuelve URLs relativas
contra la URL final tras redirecciones y usa el hostname como título de
fallback. La petición tiene timeout, límite de tamaño y cantidad de
redirecciones; el User-Agent identifica al extractor. Errores de red, páginas
bloqueadas, contenido no HTML o HTML incompleto producen metadata mínima, no
un error que invalide el bookmark.

Como el worker hará fetch a URLs de usuario, valida y fija la resolución DNS
para permitir únicamente direcciones IP públicas en cada salto, evitando
accesos a servicios locales/privados y redirecciones hacia ellos. El extractor
aún no está conectado a un job ni se ejecuta durante `POST /api/bookmarks`.

La limpieza de URL y la canonicalización de página son pasos distintos:
`src/lib/ingestion/normalize-url.ts` exporta `normalizeUrl()` para la forma
determinística usada al guardar y deduplicar; `src/lib/ingestion/canonicalize-url.ts`
exporta `canonicalizeUrl(url, metadataCanonicalUrl)`, que valida y normaliza la
canonical declarada o devuelve la URL normalizada como fallback. Cuando se
conecte el worker, puede actualizar `canonical_url` con ese resultado sin
modificar `url` ni `normalized_url`. La restricción única por usuario protege
ambas identidades: si el canonical anunciado ya pertenece a otro bookmark,
la actualización debe conservar ambos y resolver el conflicto, nunca
sobrescribir otro registro. `normalized_url` conserva la identidad de
deduplicación determinística, independiente de canonicales externos.

La deduplicación se implementa por capas: URL canónica exacta y URL normalizada
se comprueban sin IA, con índices únicos por usuario. Tras extraer texto
legible, `hashNormalizedContent()` en `src/lib/ingestion/hash-content.ts`
normaliza Unicode, espacios y mayúsculas antes de calcular SHA-256; el hash se
guarda en `content_documents.content_hash`, no se deriva de la URL ni del HTML
bruto. `findContentDuplicate()` en `src/lib/ingestion/content-duplicates.ts`
busca una coincidencia de hash solamente entre bookmarks del mismo usuario.
Tras el procesamiento asíncrono, permite detectar contenido idéntico entre
URLs distintas. Como el bookmark ya fue guardado, se conserva y no se elimina
silenciosamente. La migración crea un índice no único porque un mismo contenido
puede pertenecer a varios bookmarks. La detección aún no está conectada a un
worker; embeddings se mantienen como posible duplicado para mostrar al usuario,
nunca como motivo de bloqueo automático.

#### Esquema inicial de datos y RLS

Después de aplicar la migración de perfiles, ejecuta
`supabase/migrations/20261003133200_create_core_schema.sql`. Crea `bookmarks`,
`collections`, `bookmark_collections`, `tags`, `bookmark_tags` y `notes`. Los
recursos privados incluyen `user_id`; las claves foráneas compuestas originales
impiden relacionar bookmarks, colecciones o tags de distintos usuarios. RLS
queda habilitado con políticas de propietario desde la misma migración. Las
migraciones revocan privilegios heredados de `PUBLIC`, `anon` y
`authenticated` antes de conceder solo las operaciones necesarias a cada rol.

#### Bookmarks V1

Después del esquema inicial, aplica
`supabase/migrations/20261005230200_extend_bookmarks_v1.sql`. Convierte
`content_type` a un enum de PostgreSQL, agrega el estado de enriquecimiento
(`pending`, `processing`, `ready`, `failed`), `purpose`,
`reading_time_minutes`, `word_count` y `last_opened_at`. Los campos de métricas
y última apertura son opcionales; las métricas aceptan solo valores no
negativos. La migración preserva los valores actuales de `content_type`.

#### Collections V1

Aplica `supabase/migrations/20261005231300_extend_collections_v1.sql` después
del esquema inicial. Convierte `collections.visibility` a un enum
(`private`, `shared`, `public`) preservando sus datos, y agrega `icon` y
`color` como texto para guardar nombres de icono/colores semánticos, no SVG ni
CSS. No se persiste `bookmark_count`: la cantidad se obtiene desde
`bookmark_collections`. Las colecciones `shared` y `public` siguen protegidas
por RLS para su propietario hasta que se implementen miembros y políticas de
compartición explícitas.

#### Relaciones, notas y highlights V1

Aplica `supabase/migrations/20261005231600_align_relationships_and_add_highlights.sql`
después de las migraciones previas. Quita `user_id` de
`bookmark_collections` y `bookmark_tags`, establece claves primarias compuestas
por los dos UUID y valida RLS comprobando que ambos registros relacionados
pertenecen a la sesión. Crea `highlights` con texto seleccionado, nota
opcional, índices, clave foránea compuesta al bookmark propietario y RLS.
`notes` ya existe con propietario, relación al bookmark y políticas RLS en el
esquema inicial. Los conteos de tags y colecciones se derivan de sus tablas de
relación; no se persisten como columnas.

La migración inicial ya creó `bookmark_activity` y
`collections.cover_image_url`. Para evitar eliminar datos potenciales, esta
migración no los borra; no forman parte del modelo activo V1. No añadas nuevas
funcionalidades de actividad hasta decidir cómo retirar esa estructura
heredada.

#### Documentos y chunks de contenido

Aplica `supabase/migrations/20261005232100_create_content_documents_and_chunks.sql`
después de las migraciones anteriores. `content_documents` permite como máximo
un documento por bookmark; almacena el texto extraído, `mime_type`, idioma y
`content_hash` SHA-256 opcional del texto legible normalizado, además de métricas
opcionales. `content_chunks` guarda trozos ordenados por
`chunk_index`, con unicidad por documento y métricas opcionales de tokens.

Ambas tablas tienen RLS: el acceso se verifica recorriendo la relación hasta el
bookmark y su propietario. No se añadió `user_id` redundante, columna `vector`
ni índice vectorial; la dimensión del embedding debe elegirse con el modelo de
embeddings. Los tipos de dominio están en `src/types/content-document.ts`.

#### Research V1

Aplica `supabase/migrations/20261005232700_create_research_layer.sql` después
de las migraciones anteriores. Crea proyectos con estado `active`, `completed`
o `archived`, fuentes que referencian bookmarks existentes (únicas por
proyecto/bookmark) y notas de investigación independientes. RLS comprueba que
el usuario sea propietario del proyecto y del bookmark fuente; highlights del
bookmark siguen siendo una entidad separada. Las fechas `updated_at` se
actualizan con el trigger compartido. Los tipos están en
`src/types/research.ts`; claims y entities quedan para una fase posterior.

#### Reminders V1

Aplica `supabase/migrations/20261005233200_create_reminders.sql` después de
las migraciones anteriores. Permite múltiples recordatorios por bookmark con
tipos `manual`, `smart`, `research`, `learning` y `shopping`. `completed_at`
nulo significa pendiente; cuando se completa, guarda la fecha correspondiente.
RLS restringe CRUD al propietario y una clave foránea compuesta exige que el
bookmark también pertenezca a ese usuario. Los índices cubren consultas por
usuario/fecha, pendientes y bookmark. `updated_at` se mantiene con el trigger
compartido. `smart` es solo una categoría por ahora: esta migración no agrega
planificación inteligente ni envío de notificaciones. El tipo está en
`src/types/reminder.ts`.

#### Link Health

Aplica `supabase/migrations/20261005233400_create_link_checks.sql` después de
las migraciones anteriores. `link_checks` mantiene múltiples resultados por
bookmark como historial, guarda `response_time` en milisegundos y restringe
RLS a lectura de checks cuyos bookmarks pertenecen al usuario. Las sesiones
`authenticated` no pueden insertar o alterar resultados; el checker futuro
deberá escribirlos desde un proceso confiable. `link_checks.status` es
independiente de `bookmarks.content_status`; esta migración no actualiza ese
estado ni implementa comprobaciones automáticas. El tipo está en
`src/types/link-check.ts`.

#### Web snapshots

Aplica `supabase/migrations/20261005233800_create_web_snapshots.sql` después
de las migraciones anteriores. Crea `web_snapshots` como historial 1:N por
bookmark, con ruta de archivo, texto extraído opcional, hash y fecha de
captura; también crea el bucket privado `snapshots`. Las rutas de objeto usan
`<user-id>/<bookmark-id>/...`, y la política de Storage limita la lectura a
bookmarks del usuario. La tabla concede lectura al propietario; una tarea
confiable debe guardar archivos y registros de snapshots. `content_documents`
y `content_chunks` siguen siendo las fuentes para búsqueda y RAG; snapshots
preserva versiones. El tipo está en `src/types/web-snapshot.ts`.

#### AI usage

Aplica `supabase/migrations/20261005234200_create_ai_usage.sql` después de
las migraciones anteriores. La tabla registra proveedor, modelo, acción,
tokens, créditos internos, request ID y fecha. `action_type` es un enum
controlado; tokens y créditos no pueden ser negativos. Los índices cubren el
historial por usuario/fecha, análisis por acción y búsquedas por request ID.

RLS permite a cada usuario leer solo sus registros; `authenticated` no recibe
permisos de escritura. Solo `service_role` puede insertar consumos, desde un
servicio confiable del servidor. No implementa todavía proveedor de IA,
facturación ni límites de créditos. El tipo de dominio está en
`src/types/ai-usage.ts`.

#### Suscripciones y Stripe

Aplica `supabase/migrations/20261005234700_create_subscriptions.sql`. La
tabla contiene un estado actual por usuario, planes `free`, `pro`, `power` y
`team`, estados controlados de Stripe y fechas del período. Sin fila, el
usuario permanece en el plan Free; el cliente no puede insertar ni modificar
suscripciones y RLS solo deja leer la propia. El RPC de sincronización es
invocable únicamente con `service_role` y descarta eventos anteriores para
evitar que un webhook fuera de orden sobrescriba el estado nuevo.

El endpoint `src/app/api/stripe/webhook/route.ts` verifica la firma sobre el
cuerpo HTTP original y procesa `customer.subscription.created`, `.updated` y
`.deleted`. Para asociar una suscripción nueva con una cuenta, configura
`subscription_data.metadata.user_id` desde el futuro endpoint server-side de
Checkout. Como alternativa, los eventos posteriores resuelven el usuario por
un `stripe_customer_id` ya guardado. No aceptes un plan ni un estado enviados
por el navegador.

Configura en el entorno server-side `STRIPE_SECRET_KEY`,
`STRIPE_WEBHOOK_SECRET`, `SUPABASE_SECRET_KEY` y `STRIPE_PRO_PRICE_ID`; las
variables `STRIPE_POWER_PRICE_ID` y `STRIPE_TEAM_PRICE_ID` son opcionales hasta
que esos planes se ofrezcan. Usa los valores del entorno correspondiente y no
expongas estas claves con prefijo `NEXT_PUBLIC_`. `.env.example` muestra los
nombres sin credenciales. El Customer Portal, Checkout y la capa de
entitlements aún no están implementados. El tipo de dominio está en
`src/types/subscription.ts`.

#### Seguridad y exposición pública

RLS y los grants se configuran junto con la creación de cada tabla, no como una
fase posterior. Las tablas con `user_id` se filtran por `auth.uid()`; las
tablas relacionales verifican la propiedad de sus bookmarks o proyectos. Las
tablas de `ai_usage` y `subscriptions` son de solo lectura para el usuario;
los procesos confiables del servidor escriben mediante `service_role`.
`link_checks` y `web_snapshots` permiten al usuario leer solo registros de sus
bookmarks, mientras que `service_role` tiene permisos explícitos de lectura e
inserción.

`collections.visibility = 'shared'` o `'public'` no concede acceso público:
por ahora `anon` no puede consultar las tablas. Si se habilita publicación,
debe hacerse mediante una vista o función controlada que exponga únicamente
las columnas públicas necesarias. No se concede acceso público a bookmarks,
notas, datos de IA ni snapshots.

Después de aplicar todas las migraciones del esquema, aplica
`supabase/migrations/20261005235500_harden_public_table_grants.sql`. Esta
migración elimina grants directos al rol PostgreSQL `PUBLIC` de las tablas de
la aplicación y explicita los permisos de escritura del servidor para Link
Health y snapshots. Las migraciones de creación ya aplican estas restricciones
para instalaciones nuevas; el refuerzo final también cubre bases donde esas
migraciones ya se ejecutaron.

Para bases donde el esquema ya fue creado, aplica también
`supabase/migrations/20261006000500_add_normalized_bookmark_urls_and_content_hash.sql`
después de las migraciones de bookmarks y documentos. Añade
`bookmarks.normalized_url` con backfill desde `canonical_url` o `url`, y el
hash/index de contenido. Las migraciones de creación incluyen esos campos en
instalaciones nuevas.

## Comandos

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
