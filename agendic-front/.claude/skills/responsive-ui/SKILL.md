---
name: responsive-ui
description: Responsive rules for Agendic components, with container queries instead of viewport breakpoints. Use when creating or editing a component under app/.
---

# Responsive UI

In the panel, a component's real width depends on whether the sidebar is open, not on the viewport: a 1440px screen with the sidebar open gives the content less room than with it closed. So components respond to their **container**, the way shadcn's `dashboard-01` block does. Apply every rule below to the component you are writing.

## The panel content is `@container/main`

The panel layout (`app/(app)/layout.tsx`) marks the content area `@container/main`. Inside the panel, every size step goes on `@<size>/main:`:

```tsx
<div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
```

## A component that changes with its own width declares its own container

Name it after the component and step on it, with arbitrary sizes when the step must match a design width:

```tsx
<Card className="@container/card">
  <CardTitle className="text-2xl @[250px]/card:text-3xl">
```

## Viewport breakpoints are for the shell

Only two things step on the viewport:

- the sidebar, which turns into a sheet under 768px. In JS, read that same cut with `useIsMobile` (`app/_components/hooks/use-mobile.ts`), e.g. a drawer that opens from the bottom on a phone.
- the page padding, `px-4 lg:px-6`.

## Style children from the parent

The primitives carry `data-slot`, so a parent styles every child of one kind without a `className` on each:

```tsx
<div className="*:data-[slot=card]:shadow-xs *:data-[slot=card]:from-primary/5">
```

## Swap one control for another by container width

Render both, bound to the same state, and let CSS show one. The choice survives the swap because both read one `value`:

```tsx
<ToggleGroup value={range} onValueChange={setRange} className="hidden @[767px]/card:flex">…</ToggleGroup>
<Select value={range} onValueChange={setRange}>
  <SelectTrigger className="flex @[767px]/card:hidden">…</SelectTrigger>
</Select>
```

`Tabs` ↔ `Select` is the same pair, on `@4xl/main`.

## Public pages

The same approach applies (a component that changes with its width declares its container), and `ui-review`'s mobile rules still govern: no horizontal scroll at 360px, tap targets of 44px.

## Examples

- `app/(app)/layout.tsx`: the shell, `@container/main`
- `app/(app)/analytics/_components/SectionCards.tsx`: grid on `@container/main`, cards on `@container/card`, children styled from the parent
- `app/(app)/analytics/_components/ChartAreaInteractive.tsx`: `ToggleGroup` ↔ `Select`, `useIsMobile` for the phone's default
- `app/(app)/analytics/_components/DataTable.tsx`: `Tabs` ↔ `Select`, footer controls on `@3xl/main`
