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
pnpm dev
```

Abre [http://localhost:3000](http://localhost:3000).

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
