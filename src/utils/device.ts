const MOBILE_UA_RE =
  /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i;

/** UA-based mobile detection (client-side only). */
export function isMobileUA(): boolean {
  if (typeof navigator === 'undefined') return false;
  return MOBILE_UA_RE.test(navigator.userAgent);
}
