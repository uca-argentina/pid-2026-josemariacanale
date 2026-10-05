// CLDR's canonical list omits a few aliases (notably UTC) that resolvedOptions() still normalizes to
// themselves; special-cased rather than excluded, since it's a real, common IANA name.
const IANA_TIME_ZONES = new Set(Intl.supportedValuesOf('timeZone'));

/** Never a UTC offset (e.g. -03:00): Intl accepts those as a time zone too, but they don't know DST. */
export const isIanaTimeZone = (value: unknown): boolean => {
  if (typeof value !== 'string') return false;
  if (value === 'UTC') return true;
  try {
    return IANA_TIME_ZONES.has(
      new Intl.DateTimeFormat('en-US', {
        timeZone: value,
      }).resolvedOptions().timeZone,
    );
  } catch {
    return false;
  }
};
