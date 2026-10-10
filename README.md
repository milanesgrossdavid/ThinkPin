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

## Testing

```bash
pnpm test                 # suite unitaria y de integración con dependencias simuladas
pnpm test:unit            # lógica pura, créditos y permisos
pnpm test:integration     # servicios de bookmarks, colecciones, búsqueda, IA y Stripe
pnpm test:watch           # ejecución interactiva durante el desarrollo
```

Las pruebas de integración no contactan Supabase, Ollama ni Stripe reales. La
suite cubre normalización/dominio de URL, lectura, créditos y permisos;
deduplicación y guardado de bookmarks, asignación de tags, persistencia de
colecciones, búsqueda, normalización del enriquecimiento de IA y verificación/
sincronización del webhook de Stripe.

Los flujos E2E de signup, login, bookmark, búsqueda, colección, favorito,
eliminación, importación y upgrade todavía requieren un entorno de navegador
con un tenant de prueba aislado y autenticación/pagos de prueba. No se ejecutan
contra cuentas locales o datos compartidos ni se consideran cubiertos por los
mocks de integración.

### Supabase

Configura `NEXT_PUBLIC_SUPABASE_URL` y
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` en `.env.local` con los valores de tu
proyecto Supabase. Los clientes SSR están en `src/lib/supabase/client.ts` y
`src/lib/supabase/server.ts`; ambos usan exclusivamente la clave publishable.
El Proxy en `src/proxy.ts` renueva la sesión y filtra las rutas privadas; esas
páginas también validan sus claims en el servidor con `auth.getClaims()`. No
pongas claves secretas ni `service_role` en variables
`NEXT_PUBLIC_*`.

Si `auth.getUser()` devuelve `AuthRetryableFetchError` o `fetch failed`,
comprueba que el proyecto esté activo en Supabase y que el host de
`NEXT_PUBLIC_SUPABASE_URL` coincida con el Project URL de Settings → API.
Verifica también que la red, VPN o firewall permita conexiones HTTPS al
proyecto. Los endpoints protegidos devuelven `503` durante una indisponibilidad
de Supabase Auth, en lugar de tratarla como una sesión ausente o un error
interno.

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

## Regla arquitectónica del backend

Esta separación y la elección del adaptador de entrada son reglas del proyecto
para toda funcionalidad que acceda a datos o implemente reglas de negocio:

```text
Web UI → Server Action ─────┐
                             ├→ Service → Repository → Supabase/Postgres
Cliente externo → Route Handler/API ┘
Inngest/job → Service
```

- **Server Actions** son la entrada preferida para mutaciones iniciadas por la
  UI de Next.js. Autentican y autorizan cada llamada, validan sus argumentos,
  llaman al service y revalidan la ruta o tag necesario. No acceden a
  repositories directamente. Toda llamada debe tratarse como entrada no
  confiable, aunque el formulario o control esté en una ruta protegida.
- **Route Handlers/API** son la entrada para clientes externos, integraciones y
  webhooks: reciben HTTP, autentican o verifican la petición, validan su forma,
  llaman al mismo service y convierten el resultado a HTTP. No contienen
  consultas ni deciden reglas de negocio. Las lecturas de la UI deben preferir
  Server Components; Route Handlers de lectura se mantienen cuando hacen falta
  para polling, sincronización desde cliente o para ofrecer el contrato externo.
- **Service** implementa los casos de uso y decide qué debe suceder. No importa
  Next.js, no construye `Response`/`NextResponse` y no ejecuta consultas SQL.
- **Repository** es la única capa de la funcionalidad que consulta o modifica
  tablas de Supabase y traduce filas a los datos que consume el service.
- **Ingestion/jobs** coordinan pasos durables o trabajo asíncrono y llaman a
  services; no duplican reglas ni consultan tablas directamente.

Para bookmarks, `src/app/actions/bookmarks.ts` ofrece la Server Action de
guardado a la UI web; `src/app/api/bookmarks/route.ts` conserva el contrato HTTP
para extensiones y otros clientes. Ambas llaman a
`src/lib/bookmarks/service.ts`, que contiene los casos de uso, y
`src/lib/bookmarks/repository.ts`, que centraliza el acceso a la tabla
`bookmarks`. `src/lib/inngest/functions/` coordina el procesamiento asíncrono a
través de esos mismos services. Web, extensiones, aplicaciones móviles y jobs
reutilizan las reglas de negocio sin copiarlas. Añade capas o módulos cuando
haya una responsabilidad real; no crees carpetas vacías.

### Regla arquitectónica de IA

Las funcionalidades trabajan con interfaces de proveedor y seleccionan la
implementación mediante el AI Router; no importan SDKs de proveedores ni
codifican nombres de proveedor fuera de `src/lib/ai/providers/` y su
configuración:

```text
Service / Inngest → AI Router → AIProvider → provider adapter
```

El router resuelve proveedor por tarea desde configuración, valida que la
capacidad esté disponible y devuelve errores explícitos si no hay una
implementación configurada. No hay fallback automático ni balanceo hasta que
haya otro proveedor real y una política definida. Los resultados conservan
provider/model/usage como metadata operativa, sin acoplar las reglas de negocio
a esos valores. Se agregan capacidades como clasificación, resumen, tags o
respuestas solo cuando se implementen, con contratos tipados dentro de esta
frontera.

La capacidad actual es `embedding`: `AIProvider` define su contrato en
`src/lib/ai/types.ts`, `src/lib/ai/router.ts` elige la implementación configurada
por `AI_EMBEDDING_PROVIDER`. `src/lib/ai/providers/openai.ts` es el adaptador
de pago y `src/lib/ai/providers/ollama.ts` ofrece embeddings locales gratuitos
con `nomic-embed-text`. `bookmark-ingestion` y `searchService` llaman al router,
no al SDK ni al endpoint directo del proveedor.

El proveedor por defecto es `disabled`: Keyword/Full-text siguen disponibles y
no se llama a proveedores de IA ni se generan cargos. No hay fallback
automático. Habilita explícitamente `ollama` o `openai` cuando quieras usar
embeddings.

La columna pgvector actual tiene 1536 dimensiones. Todo proveedor seleccionado
para embeddings debe producir vectores de esa dimensión; cambiar a un modelo
con dimensiones distintas requiere una migración/versionado de embeddings y
reindexación, no solo cambiar una variable de entorno. El adaptador local
valida los 768 componentes de Ollama y completa con ceros hasta 1536; esto
conserva las similitudes coseno y permite mantener el esquema actual.

#### Smart Save con IA local

Smart Save obtiene el título, la descripción disponible, la imagen Open Graph,
el favicon y la URL canonical directamente de la página. Cuando se activa
`AI_BOOKMARK_ENRICHMENT_PROVIDER=ollama`, Inngest también usa un modelo local
de chat para mejorar el título, escribir una descripción resumida, sugerir tags
y tipo/intención, generar una explicación del valor de guardar el enlace y
elegir la colección con mejor encaje entre las colecciones predeterminadas y
las del usuario. La explicación es una sugerencia basada en el contenido, no
una afirmación sobre la motivación personal del usuario. La imagen nunca se
inventa ni se genera con IA: se conserva la URL de imagen extraída del sitio.
La generación de IA y la escritura de chunks se ejecutan en paralelo después
de extraer la página para reducir el tiempo de procesamiento.

El modelo de embeddings `nomic-embed-text` no genera texto. Instala un modelo
de chat aparte y configura su nombre en `OLLAMA_TEXT_MODEL`, por ejemplo:

```bash
ollama pull llama3.2:3b
```

En `.env.local`:

```dotenv
AI_BOOKMARK_ENRICHMENT_PROVIDER=ollama
AI_ANSWER_PROVIDER=ollama
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_TEXT_MODEL=llama3.2:3b
```

Reinicia Next.js después de cambiar las variables. El contenido de página se
envía únicamente al Ollama local; si Ollama o el modelo no están disponibles,
se conserva el bookmark y continúa la extracción/indexación determinística.
El error del paso opcional de IA se registra en el servidor.

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

`POST /api/bookmarks` acepta una sesión web de Supabase mediante cookies o un
access token de Supabase en `Authorization: Bearer <access-token>` para clientes
externos. Si se envía un header `Authorization` inválido, no se utiliza como
alternativa una sesión cookie. El servidor valida HTTP/HTTPS,
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
resuelve carreras concurrentes de inserción. Tras insertar un bookmark nuevo,
el endpoint emite `bookmark.created` a Inngest con solo `bookmarkId` y
`userId`; un error al encolar no elimina ni revierte el bookmark y se refleja
como `content_status = failed`.

#### CRUD y organización de bookmarks

Las mutaciones de la UI web usan `src/app/actions/bookmarks.ts`. Cada acción
obtiene la identidad desde la sesión de Supabase y delega en
`src/lib/bookmarks/service.ts`; el repository aplica el filtro por `user_id`
en todas las lecturas, actualizaciones y eliminaciones. Favoritos, estado leído,
archivo, título, descripción e intención se guardan en `bookmarks`. Tags usan
`tags` y `bookmark_tags`; la nota del bookmark se guarda en `notes`; moverlo a
una colección actualiza `bookmark_collections`. El borrado elimina el bookmark
de Supabase y los registros relacionados mediante las claves foráneas en
cascada; no es un borrado reversible.

`GET /api/bookmarks` sincroniza el cache de interfaz con bookmarks, tags,
colección y nota guardados. `POST /api/bookmarks` continúa disponible para
clientes externos y comparte el mismo service de creación que Smart Save; su
contrato de creación recibe `{ "url": "https://example.com/article" }`. Un
cliente externo obtiene el bearer token mediante un flujo de autenticación
explícito de Supabase; nunca debe incluir una clave `service_role` ni guardar
el token en almacenamiento accesible a páginas web o scripts de contenido.
`PATCH /api/bookmarks/:bookmarkId` actualiza los mismos campos mediante el
service de actualización; `DELETE /api/bookmarks/:bookmarkId` elimina el
registro autenticado. Las cuatro operaciones externas aplican identidad del
servidor y aislamiento RLS, tanto con cookies como con bearer token.
El CRUD de colecciones privadas usa `GET` y `POST /api/collections`, con
operaciones autenticadas para crear, renombrar, reemplazar miembros y mover
bookmarks. La API solo opera sobre filas propias y la migración de base de
datos mantiene privadas las colecciones por defecto. Las asociaciones de
bookmarks se almacenan en `bookmark_collections`.

#### Importar bookmarks HTML

`/app/import` acepta archivos HTML/HTM exportados desde Chrome, Firefox,
Safari o Edge, con un máximo de 5 MB y 10.000 enlaces. El archivo se analiza en
memoria y no se conserva. Antes de confirmar, la aplicación muestra enlaces
nuevos, duplicados dentro del archivo, duplicados de la biblioteca, enlaces
inválidos y carpetas detectadas. Las rutas de carpetas se conservan en el
trabajo y se representan como nombres de colección; si superan 100 caracteres
se mantiene el sufijo más profundo que quepa.

La migración
`supabase/migrations/20261009150000_add_bookmark_import_jobs.sql` crea trabajos
y elementos de importación con RLS por usuario. Después de confirmarse,
`POST /api/imports/bookmarks/:jobId/process` procesa lotes pequeños mediante
el bookmark service existente y encola cada enlace nuevo en Inngest. El
progreso y los errores quedan guardados por enlace, de modo que se puede
reanudar o reintentar elementos fallidos sin volver a cargar el archivo. Los
duplicados e inválidos se omiten y la importación no espera al enriquecimiento
asíncrono para terminar.

#### Extensión Chrome

La extensión Manifest V3 está en `extension/`. Carga ese directorio desde
`chrome://extensions` con el modo desarrollador. En el primer uso se conecta a
la URL desplegada de la aplicación, autoriza explícitamente los hosts de la app
y Supabase, e inicia sesión en Supabase Auth con la cuenta existente mediante
Google OAuth PKCE o email/contraseña. Para Google, registra la URL de
`chrome.identity.getRedirectURL()` en Supabase Auth → URL Configuration y
configura Google OAuth en el proyecto. La extensión pide la contraseña solo al
iniciar sesión; conserva access/refresh tokens en `chrome.storage.local`,
renueva el access token al necesitarlo y borra/revoca la sesión al cerrar
sesión. No tiene content scripts, no accede
directamente a tablas y no incluye secretos de servidor.

El popup permite revisar la pestaña, guardar y añadir colección, tags y motivo.
También hay un menú contextual y el atajo `Alt+Shift+S` para guardado rápido.
La extensión usa `GET /api/extension/config` para obtener la URL de Supabase y
la publishable key (pública), y crea/muta datos mediante `/api/bookmarks` con
bearer token. Dedupe, validación, procesamiento de metadata y cola Inngest
siguen siendo responsabilidad del backend. Pasos de instalación y limitaciones
de autenticación están en `extension/README.md`.

#### Ingestión asíncrona con Inngest

`src/app/api/inngest/route.ts` registra el endpoint de Inngest y
`src/lib/inngest/functions/bookmark-ingestion.ts` procesa `bookmark.created`.
El workflow vuelve a leer el bookmark con el cliente administrativo de
Supabase y mantiene pasos durables independientes para leer, marcar
`processing`, extraer metadata y persistirla. Inngest puede reanudar los pasos
que ya terminaron y reintenta hasta tres veces; al agotar los reintentos,
`onFailure` marca el bookmark como `failed`. El bookmark original permanece
guardado en todos los casos. Volver a guardar una URL cuyo procesamiento falló
vuelve a encolar su ingestión. Con el enriquecimiento local activado, volver a
guardar un bookmark listo que todavía no tenga tags también encola la ingestión
para generar sus sugerencias.

El workflow extrae metadata y texto legible en pasos reintentables y persiste
documentos y chunks idempotentes. Con
`AI_EMBEDDING_PROVIDER=disabled`, omite embeddings sin fallar la ingestión;
documentos y chunks siguen disponibles para FTS. Con
`ollama`, genera vectores localmente; con `openai`, configura
`OPENAI_API_KEY` para usar el proveedor de pago. Nunca expongas esa clave con
una variable `NEXT_PUBLIC_*`. El bookmark se marca como listo cuando termina el
procesamiento seleccionado. En
desarrollo, establece `INNGEST_DEV=1` en `.env.local` y reinicia Next.js.
Ejecuta `pnpm dev` y, en otra terminal, el Inngest Dev Server:
`pnpm dlx inngest-cli@latest dev -u http://localhost:3000/api/inngest`.
El Dev Server local recibe los eventos del endpoint `/api/inngest` y no
requiere claves cloud. En producción no establezcas `INNGEST_DEV`; configura
`INNGEST_EVENT_KEY` y `INNGEST_SIGNING_KEY`.

#### Búsqueda PostgreSQL y pgvector

La búsqueda de `/app/search` consulta el servidor autenticado; el navegador ya
no busca en el cache local. `GET /api/search?q=...&mode=...` llama al search
service y repository. `keyword` usa PostgreSQL Full Text Search en título y
dominio; `full-text` combina vectores ponderados en título (A), tags (A),
descripción/dominio (B), notas (B) y contenido (C). `semantic` genera el
embedding de la consulta mediante el proveedor configurado y recupera los
chunks más cercanos mediante pgvector. La función SQL limita cada consulta al usuario
autenticado y aplica filtros opcionales de tipo, favorito, lectura, colección,
tag y fecha antes de ordenar resultados.

Aplica `supabase/migrations/20261006180000_add_bookmark_search.sql` después de
las migraciones previas. Crea índices GIN para FTS, una columna vectorial de
1536 dimensiones y su índice HNSW. Los bookmarks existentes necesitan volver a
pasar por el workflow de Inngest para generar contenido y embeddings; los
bookmarks nuevos lo hacen al guardarse. Ask Your Library está disponible en
`/app/ask` y mantiene la generación de respuestas separada de la búsqueda; ver
su configuración y límites en la sección siguiente.

Para habilitar embeddings locales en macOS:

1. Instala Ollama desde [ollama.com/download](https://ollama.com/download) y
   abre la aplicación para iniciar su servicio local.
2. Descarga el modelo con `ollama pull nomic-embed-text`.
3. En `.env.local`, define `AI_EMBEDDING_PROVIDER=ollama` y, si hace falta,
   `OLLAMA_BASE_URL=http://127.0.0.1:11434`.
4. Reinicia Next.js y el Inngest Dev Server; comprueba el modelo con
   `ollama list`.
5. En `/app/search`, selecciona `Semantic` y pulsa **Index saved bookmarks**
   para volver a encolar en lotes de hasta 10 los bookmarks sin embeddings.
   Mantén el Inngest Dev Server en ejecución hasta que termine el procesamiento.
   Los bookmarks nuevos se vectorizan automáticamente durante su ingestión;
   mientras se reindexan los existentes, Keyword y Full-text siguen operativos.

El adaptador local solo permite conexiones loopback para no enviar el contenido
de bookmarks a otra máquina. Este modo sirve para desarrollo con Next.js e
Inngest en el mismo equipo; una app desplegada remotamente no puede conectarse
al Ollama de tu computadora mediante `localhost`.

#### Ask Your Library

`/app/ask` responde preguntas usando exclusivamente fragmentos de los bookmarks
del usuario. `POST /api/ask` genera el embedding de la pregunta, recupera
fragmentos con FTS + pgvector, limita el contexto a un máximo de ocho fragmentos
y cinco bookmarks (dos fragmentos por bookmark), y llama al proveedor `answer`
del AI Router. Las fuentes se construyen desde los resultados autenticados de
PostgreSQL; nunca las genera el modelo. Si no hay coincidencias, devuelve una
respuesta de insuficiencia sin invocar el modelo.

Para usarlo localmente, habilita `AI_EMBEDDING_PROVIDER=ollama`,
`AI_ANSWER_PROVIDER=ollama` (si no se define, usa
`AI_BOOKMARK_ENRICHMENT_PROVIDER`) y `OLLAMA_TEXT_MODEL=llama3.2:3b`. Los
bookmarks necesitan contenido extraído para FTS; embeddings activan la parte
semántica del híbrido. Vuelve a indexar los existentes desde `/app/search` y
mantén Inngest en ejecución. Aplica
`supabase/migrations/20261007195000_add_ask_library.sql` después de las
migraciones previas. La recuperación combina búsqueda de texto completo,
similitud vectorial y Reciprocal Rank Fusion, restringe el resultado al usuario
autenticado y excluye bookmarks archivados. Aplica también
`supabase/migrations/20261007210000_fix_ask_chunk_retrieval.sql`: permite buscar
chunks incluso cuando la indexación de embeddings falló, y divide preguntas en
tokens relevantes para ampliar la búsqueda FTS sin forzar coincidencias con
cada palabra de una pregunta en lenguaje natural. Aplica también
`supabase/migrations/20261008103000_include_bookmark_metadata_in_ask.sql`: añade
recuperación desde título, URL, dominio, descripción y tipo del bookmark, para
preguntas sobre categorías de recursos como repositorios de GitHub incluso si
el sitio no se pudo indexar.
Aplica también
`supabase/migrations/20261008100000_normalize_ai_usage_token_counts.sql`
para convertir contadores nulos de clientes o procesos antiguos a cero antes
de las restricciones `NOT NULL`.

En `/app/ask` también puedes elegir **Global web search** para encontrar
recomendaciones en Internet. Los resultados incluyen título, descripción y
enlace, y cada uno se puede guardar en tu biblioteca. Este modo usa Tavily:
configura una API key en `TAVILY_API_KEY` en el entorno del servidor (por
ejemplo, `.env.local` en desarrollo). La clave no debe llevar el prefijo
`NEXT_PUBLIC_`. La búsqueda requiere conexión a Internet y está sujeta a las
cuotas vigentes del nivel gratuito de Tavily. Si falta la clave, la interfaz
mostrará un error de configuración.

#### Extracción de metadata

`src/lib/ingestion/metadata.ts` exporta `extractMetadata(url)`, un extractor
independiente de Supabase que devuelve título, descripción, imagen, nombre del
sitio, favicon y canonical URL. Prefiere Open Graph, resuelve URLs relativas
contra la URL final tras redirecciones y usa el hostname como título de
fallback. También consulta YouTube oEmbed para obtener el título y creador
reales de videos y usa su thumbnail de alta calidad como fallback; para otras
páginas busca imágenes en Open Graph, Twitter Cards y metadatos `itemprop`.
La petición tiene timeout, límite de tamaño y cantidad de
redirecciones; el User-Agent identifica al extractor. Errores de red, páginas
bloqueadas, contenido no HTML o HTML incompleto producen metadata mínima, no
un error que invalide el bookmark.

Como el worker hace fetch a URLs de usuario, valida y fija la resolución DNS
para permitir únicamente direcciones IP públicas en cada salto, evitando
accesos a servicios locales/privados y redirecciones hacia ellos. El extractor
corre solamente en el workflow de Inngest, nunca dentro de
`POST /api/bookmarks`.

La limpieza de URL y la canonicalización de página son pasos distintos:
`src/lib/ingestion/normalize-url.ts` exporta `normalizeUrl()` para la forma
determinística usada al guardar y deduplicar; `src/lib/ingestion/canonicalize-url.ts`
exporta `canonicalizeUrl(url, metadataCanonicalUrl)`, que valida y normaliza la
canonical declarada o devuelve la URL normalizada como fallback. El worker
actualiza `canonical_url` con ese resultado sin modificar `url` ni
`normalized_url`. La restricción única por usuario protege
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
Tras conectar la extracción de contenido al workflow, permitirá detectar
contenido idéntico entre URLs distintas. Como el bookmark ya fue guardado, se
conservará y no se eliminará silenciosamente. La migración crea un índice no
único porque un mismo contenido puede pertenecer a varios bookmarks. Embeddings
se mantienen como posibles duplicados para mostrar al usuario,
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

Aplica también
`supabase/migrations/20261009170000_private_collection_persistence.sql` para
activar la persistencia privada: impone nombres únicos por usuario, y añade
operaciones transaccionales para
reemplazar asociaciones o mover un bookmark entre colecciones propias. La API
usa la sesión autenticada y RLS; las colecciones se crean como `private`.
Al cargar, la aplicación migra las colecciones locales antiguas que todavía
no existan en Supabase. Esta migración no habilita lectura anónima ni publica
colecciones `shared` o `public`.

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
bookmark y su propietario. La migración original no añade `user_id` redundante
ni vectores; la migración posterior de búsqueda agrega embeddings de 1536
dimensiones y el índice vectorial. Los tipos de dominio están en
`src/types/content-document.ts`.

#### Research V1

Aplica `supabase/migrations/20261005232700_create_research_layer.sql` después
de las migraciones anteriores. Crea proyectos con estado `active`, `completed`
o `archived`, fuentes que referencian bookmarks existentes (únicas por
proyecto/bookmark) y notas de investigación independientes. RLS comprueba que
el usuario sea propietario del proyecto y del bookmark fuente; highlights del
bookmark siguen siendo una entidad separada. Las fechas `updated_at` se
actualizan con el trigger compartido. Los tipos están en
`src/types/research.ts`. La interfaz está disponible en `/app/research` y
permite crear proyectos, seleccionar bookmarks como fuentes, guardar notas y
generar un informe bajo demanda con fragmentos de las fuentes seleccionadas y
enlaces citados. El informe generado se muestra en la sesión actual y todavía
no se persiste. Insights, claims y entities quedan para una fase posterior;
no se inventan automáticamente en esta versión.

#### Decision Boards V1

Aplica `supabase/migrations/20261008123000_create_decision_boards.sql`.
`/app/decisions` permite crear comparaciones con 2–8 opciones y 2–10 criterios.
En cada tablero se organiza evidencia por opción y criterio; la evidencia
puede enlazar un bookmark propio, incluir una nota o ambas cosas. También se
pueden buscar fuentes en la web; al agregarlas se guardan como bookmarks y se
asocian al criterio/opción seleccionados. Los extractos de búsqueda se marcan
como provisionales para que el usuario verifique la fuente original. La
plataforma no calcula puntuaciones ni selecciona un ganador. RLS limita
tableros y datos asociados a su propietario y verifica la propiedad de los
bookmarks citados.

#### Learning Mode V1

Aplica `supabase/migrations/20261008140000_create_learning_mode.sql` y
`supabase/migrations/20261008154500_add_learning_external_sources.sql`.
`/app/learn` permite crear un Learning Path desde un tema, recuperando
bookmarks propios mediante búsqueda semántica y full-text. El proveedor de IA
propone etapas y la aplicación valida que cada recurso corresponda a un
bookmark existente y del usuario; las etapas reutilizan bookmarks, no duplican
su contenido. En el workspace se puede abrir cada recurso, marcarlo como
estudiado o deshacer esa marca, y pedir una explicación basada en fragmentos
indexados con enlaces a las fuentes. También se puede pegar una URL pública
para extraer su texto y usarlo directamente como fuente de un path, sin crear
un bookmark; la URL y el texto se guardan únicamente en el path. Al elegir una
fuente web, también se puede activar la opción para guardar la URL como
bookmark. Las fuentes externas deben ser páginas HTTP(S) públicas con texto
legible. Los paths se pueden eliminar sin borrar los bookmarks de la
biblioteca. Abrir páginas no altera el progreso.
Quizzes, revisión adaptativa y estadísticas de dominio quedan para fases
posteriores.

#### Smart Resurfacing V1

Aplica `supabase/migrations/20261008170000_create_resurfacing_feedback.sql`.
El dashboard puede sugerir hasta tres bookmarks guardados hace al menos 30
días cuando conectan con bookmarks guardados durante los últimos 7 días. La
selección combina similitud semántica cuando hay proveedor e índices
disponibles con coincidencias de texto, tags, intent, colección y calidad del
contenido. Solo considera bookmarks propios no archivados y evita los
descartados o ya redescubiertos; abrir o redescubrir lleva al bookmark y guarda
feedback. La explicación se basa en las señales disponibles y no afirma usar
búsquedas ni aperturas recientes. No crea notificaciones ni ejecuta tareas
programadas.

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
`authenticated` no pueden insertar o alterar resultados; los procesos
confiables escriben el historial. `link_checks.status` es
independiente de `bookmarks.content_status`; esta migración no actualiza ese
estado. El tipo está en
`src/types/link-check.ts`.

#### Library Health V1

Aplica `supabase/migrations/20261008180000_add_link_health_v1.sql` después
de crear `link_checks`. `/app/library-health` muestra el último estado por
bookmark activo y permite filtrar por saludable, redirección, roto, timeout,
bloqueado o desconocido. Se pueden solicitar comprobaciones manuales, editar
la URL guardada o archivar el bookmark; actualizar la URL conserva los checks
históricos y encola una comprobación nueva, sin reemplazar automáticamente
redirecciones.

Inngest revisa hasta 100 enlaces pendientes o vencidos cada lunes a las 03:00
UTC; cada enlace vuelve a ser elegible después de siete días. Los destinos y
redirecciones se validan como HTTP(S) público antes de conectarse. Esta versión
comprueba disponibilidad HTTP únicamente: los cambios de contenido y snapshots
comparativos quedan para una fase posterior.

#### Web snapshots

Aplica `supabase/migrations/20261005233800_create_web_snapshots.sql` después
de las migraciones anteriores. Crea `web_snapshots` como historial 1:N por
bookmark, con ruta de archivo, texto extraído opcional, hash y fecha de
captura; también crea el bucket privado `snapshots`. Las rutas de objeto usan
`<user-id>/<bookmark-id>/...`, y la política de Storage limita la lectura a
bookmarks del usuario. La tabla concede lectura al propietario; una tarea
confiable guarda los archivos y registros de snapshots. `content_documents`
y `content_chunks` siguen siendo las fuentes para búsqueda y RAG; snapshots
preserva versiones.

#### Web Archive V1

Aplica `supabase/migrations/20261008190000_extend_web_snapshots_for_archive.sql`
después de crear `web_snapshots`. El detalle del bookmark permite capturar
manualmente una página pública: se guarda HTML sanitizado en Storage privado,
y texto legible, metadata y hash SHA-256 del texto normalizado en PostgreSQL.
La captura usa el fetcher con validación de IP pública, redirecciones limitadas,
timeout y límite de tamaño; el visor devuelve HTML dentro de un sandbox CSP.
Si el hash coincide con el último snapshot, no duplica la copia.

Snapshot History muestra fecha, título y palabras; se puede abrir una versión
archivada o comparar dos capturas seleccionadas con Time Machine. La comparación
calcula bajo demanda diferencias textuales aproximadas (añadido, eliminado y
modificado) usando el contenido legible; no se guardan diffs y no se comparan
estructura ni capturas visuales. Para limitar el coste del cálculo, cada
versión debe contener como máximo 1.200 segmentos de texto.
Esta entrega no captura screenshots, no archiva automáticamente al guardar o
por horario, y todavía no aplica restricciones de plan. La captura requiere
que la página ofrezca texto legible; Chromium/screenshot queda para un worker
aislado futuro.
El modelo TypeScript está en `src/types/web-snapshot.ts`.

#### AI usage

Aplica `supabase/migrations/20261005234200_create_ai_usage.sql` después de
las migraciones anteriores. La tabla registra proveedor, modelo, acción,
tokens, créditos internos, request ID y fecha. `action_type` es un enum
controlado; tokens y créditos no pueden ser negativos. Los índices cubren el
historial por usuario/fecha, análisis por acción y búsquedas por request ID.

RLS permite a cada usuario leer solo sus registros; `authenticated` no recibe
permisos de escritura. Solo `service_role` puede insertar consumos, desde un
servicio confiable del servidor. El workflow registra tokens usados para
embeddings de contenido y las consultas semánticas. Las reservas de créditos y
su ledger se agregan en la migración de Billing descrita abajo. El tipo de
dominio está en `src/types/ai-usage.ts`.

#### Suscripciones y Stripe

Aplica `supabase/migrations/20261005234700_create_subscriptions.sql`. La
tabla contiene un estado actual por usuario, planes `free`, `pro`, `power` y
`team`, estados controlados de Stripe y fechas del período. Sin fila, el
usuario permanece en el plan Free; el cliente no puede insertar ni modificar
suscripciones y RLS solo deja leer la propia. El RPC de sincronización es
invocable únicamente con `service_role` y descarta eventos anteriores para
evitar que un webhook fuera de orden sobrescriba el estado nuevo.

Después de AI usage y subscriptions, aplica
`supabase/migrations/20261009180000_add_billing_entitlements_and_credits.sql`.
Crea el registro idempotente de eventos Stripe, cuentas de créditos,
reservas y ledger; sus RPC transaccionales impiden exceder la cuota y permiten
liquidar o liberar reservas.

El endpoint `src/app/api/stripe/webhook/route.ts` verifica la firma sobre el
cuerpo HTTP original y procesa `customer.subscription.created`, `.updated` y
`.deleted`. La sincronización descarta eventos Stripe duplicados y eventos
fuera de orden. Checkout es server-side: `subscription_data.metadata.user_id`
asocia la suscripción con la cuenta y el navegador nunca elige un precio ni
envía el estado efectivo del plan.

Configura en el entorno server-side `STRIPE_SECRET_KEY`,
`STRIPE_WEBHOOK_SECRET`, `SUPABASE_SECRET_KEY`, `STRIPE_PRO_PRICE_ID` y
`APP_URL` (origen HTTPS de la aplicación; `http://localhost:3000` en local).
Los Price IDs son valores configurados en Stripe, no importes definidos por
ThinkPin. `STRIPE_POWER_PRICE_ID` y `STRIPE_TEAM_PRICE_ID` son opcionales hasta
que esos planes se ofrezcan. No expongas claves con prefijo `NEXT_PUBLIC_`;
`.env.example` muestra los nombres sin credenciales.

`/app/billing` presenta el plan, uso y saldo; Checkout y el Customer Portal se
abren desde endpoints autenticados. Las capacidades se comprueban también en
las operaciones de Ask, búsqueda semántica, Research y Learning. Ask, búsqueda
semántica, informes y Learning reservan créditos con claves de idempotencia y
liberan la reserva cuando falla la operación. Las cuotas mensuales iniciales
(Free 100, Pro 2.000, Power 10.000) y los costes por acción de
`src/lib/billing/plans.ts` son provisionales; los precios monetarios proceden
de los Price IDs del entorno Stripe. El tipo de dominio está en
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

La gestión de colecciones privadas muestra únicamente registros persistidos,
sin categorías de colección precargadas.

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

#### Monitoring, analytics & product observability

La aplicación admite Sentry para errores y trazas de Next.js y PostHog para
analítica de producto. Configura `NEXT_PUBLIC_SENTRY_DSN` y
`NEXT_PUBLIC_POSTHOG_KEY` en el entorno de despliegue; `SENTRY_DSN` es opcional
y solo para el servidor, y `NEXT_PUBLIC_POSTHOG_HOST` permite elegir el host
regional. Sin esas variables, los SDK no se inicializan. PostHog permanece
desactivado hasta que cada usuario acepte analítica desde el aviso de privacidad;
la elección se puede cambiar después desde **Privacy settings**.

PostHog tiene autocaptura, pageviews automáticos y grabación de sesiones
desactivados. Registra pageviews sin query strings y eventos explícitos:
`signup`, `bookmark_saved`, `first_bookmark`, `search_used`, `first_search`,
`ai_used`, `ai_limit_reached`, `import_started`, `import_completed`,
`import_failed`, `collection_created`, `subscription_started` y
`subscription_cancelled`. Las propiedades se limitan a modo y cantidad de
resultados o plan; no se envían consultas, URLs, nombres de archivos, notas,
contenido de bookmarks, email ni contraseñas. La identidad de PostHog usa el
ID interno de Supabase, solo después del consentimiento. Los eventos de primera
acción se deduplican localmente por identidad.

El onboarding actual es una demostración local y no representa activación real;
por eso no emite eventos de onboarding ni se debe usar para medir la conversión
de registro. `first_bookmark` y `first_search` solo son observables si el
consentimiento está activo cuando se produce la acción. La diferencia temporal
entre `signup` y `first_bookmark` permite estimar `time_to_first_bookmark` para
esas cuentas, no para quienes aceptan analítica después. WAU, retención y
bookmarks semanales se calculan como agregados sobre eventos consentidos, no se
emiten como eventos semanales sintéticos. No se fijan objetivos antes de tener
una línea base.

Sentry captura errores de requests no controlados, errores explícitos de Ask,
búsqueda, importación y webhooks de Stripe, y una muestra del 10 % de trazas.
Se eliminan request data, identidad, breadcrumbs y atributos de URL/query,
request bodies, tokens y cookies antes del envío. Las trazas pueden ayudar a
medir latencia de requests; el coste de proveedores externos, reintentos y
consumo agregado debe analizarse por separado con sus registros actuales de
AI usage, billing y jobs.

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
