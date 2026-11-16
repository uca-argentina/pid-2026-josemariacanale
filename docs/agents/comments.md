# Comments

Applies to every `.ts` / `.tsx` file in `agendic-front/` and `agendic-back/`.

## General principle

Keep comments limited and avoid obvious ones. Comments explain *why*, not *what*: the code itself should be clear enough to say what it does.

No TSDoc (`/** … */`), not even on exported symbols. Existing TSDoc stays until you change what its symbol does. Then delete it, and keep any line that still explains a non-obvious *why* as a `//` comment. Don't touch TSDoc on symbols whose behavior you aren't changing.

## When to comment

- Business decisions or domain logic that isn't obvious from the code
- Workarounds or hacks, with why they're needed
- Non-obvious performance optimizations
- Important security considerations
- Troubleshooting context (e.g. why an approach was chosen after hitting issues)

If none of these apply, skip the comment entirely. The function name, parameters, and return type should speak for themselves.

## When not to comment

```ts
// ❌ Obvious comment
// Get the user
const user = await getUser(userId);

// ❌ Restating the code
// Loop through bookings
for (const booking of bookings) {
  // Process booking
  processBooking(booking);
}
```

## Good examples

```ts
// ✅ Explains why, not what
// We need to fetch availability before slots because the timezone
// conversion depends on the user's configured availability rules
const availability = await getAvailability(userId);
const slots = convertToSlots(availability, timezone);

// ✅ Documents a non-obvious constraint
// Google Calendar API has a 2500 event limit per sync request
const BATCH_SIZE = 2500;
```
