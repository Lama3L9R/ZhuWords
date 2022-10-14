/**
 * Completely replaces the pre-existing arguments.
 */
export function resetUrlArgumentsTo(args: Map<string, string>) {
  window.history.replaceState(
    null,
    document.title,
    window.location.origin + '/' + window.location.hash.split('~')[0]
      + ((args.size === 0)
        ? ''
        : ('~' + Array.from(args).map(([key, value]) => (value === '') ? key : `${key}=${value}`))),
  );
}
