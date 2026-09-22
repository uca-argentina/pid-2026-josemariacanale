# UI Components

Rules for designing React components under `app/`. They sit on top of `clean-architecture.md`, which wins on any conflict: components live in the framework layer and reach the core only through `getInjection` from `di/`.

## Where a component goes

| Tier | Location | Purpose |
|---|---|---|
| Design system | `app/_components/ui/` | Generic, logic-free primitives (shadcn target, see `components.json`). `button.tsx`, `card.tsx` |
| Shared | `app/_components/` | Composed components used by more than one route. `Header.tsx` |
| Route-specific | `app/<route>/_components/` | One-off components for one page. The `_` prefix keeps the folder out of the router |

Start a component at the narrowest tier. Promote it one tier up only when a second route needs it.

There is no `src/features/` or `src/components/`: `src/` holds only the clean architecture layers. A component never fetches data or calls a backend itself. A server component (or server action) calls `getInjection('I…Controller')` and passes the presenter's output down as props.

## Server vs. client

Components are Server Components by default. Add `'use client'` only when the component needs at least one of these:

- interactivity (`onClick`, `onChange`, …)
- React state or effect hooks (`useState`, `useEffect`, …)
- browser APIs (`window`, `localStorage`, …)

Anything that fetches data, touches secrets, or calls a controller stays on the server.

## Composition rules

1. **Push `'use client'` to the leaves.** Extract the interactive part into a small client component and render it from a server wrapper. Don't mark a whole section client for one button.
2. **Pass server content as `children`.** A client component cannot import a server component. Take it as `children` (or another `ReactNode` prop) instead:

   ```tsx
   'use client'
   import { useState } from 'react'

   export function Collapsible({ children }: { children: React.ReactNode }) {
     const [isOpen, setIsOpen] = useState(false)
     return (
       <div>
         <button onClick={() => setIsOpen(true)}>Expand</button>
         {isOpen && children}
       </div>
     )
   }
   ```

3. **Props that cross into a client component must be serializable.** The allowed types are listed at https://react.dev/reference/rsc/use-client#serializable-types: primitives, plain objects and arrays, `Date`, `Map`, `Set`, JSX, Promises, and Server Functions. Ordinary functions such as event handlers and class instances are not. Presenters already return plain objects, so pass those rather than entities.
