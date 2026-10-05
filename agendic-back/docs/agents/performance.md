# Performance

Lists in this domain grow with the Negocio: Turnos, Horarios reservables, Franjas, Anulaciones. Ask how the code behaves with 1,000 Turnos in the range, not with the 5 in the seed.

## Avoid quadratic loops

A `.some`, `.find`, `.filter`, or `.includes` inside a loop over another growing list is O(n·m). Replace it:

- **`Map` / `Set`** for repeated lookups by key: build once, look up in O(1).
- **Sort once + two pointers** for comparing two time-ordered lists, such as candidate slots against booked ranges: advance through both in a single pass.
- **Early exit**: in sorted data, `break` once the remaining items can no longer match.

```ts
const slots = candidates.filter((start) => !booked.some((b) => overlaps(start, b)));
```

```ts
const sorted = booked.toSorted((a, b) => a.from - b.from);
let i = 0;
const slots = candidates.filter((start) => {
  while (i < sorted.length && sorted[i].to <= start) i++;
  return !(i < sorted.length && sorted[i].from < start + duration);
});
```

The second version needs `candidates` sorted too, which the slot generator already produces.

## Scheduling cost compounds

Every constraint in the Horario reservable calculation (Tiempo de preparación, Límite diario, Anulación, Cobertura) multiplies its cost, because each one is checked for every candidate slot of every Empleado on every day of the range. Before adding another:

- Keep the queried range bounded: the endpoint receives `from`/`to`, so the calculation never scans an open-ended future.
- Fetch per request in bulk (all Turnos of the range in one query), never per day or per slot.
- Measure with a large seed before reaching for caching or a smarter algorithm.
