/**
 * Safely patch Leaflet's internal DomUtil.getPosition to prevent
 * "Uncaught TypeError: Cannot read properties of undefined (reading '_leaflet_pos')"
 * which occurs when Leaflet animations, invalidateSize, or event handlers run
 * while a map component is unmounting or after elements are detached.
 */
export function patchLeafletPos(L: any) {
  if (!L || !L.DomUtil || (L.DomUtil as any)._posPatched) return;
  (L.DomUtil as any)._posPatched = true;

  const originalGetPosition = L.DomUtil.getPosition;
  L.DomUtil.getPosition = function (el: any) {
    if (!el) {
      return new L.Point(0, 0);
    }
    try {
      if (el._leaflet_pos) {
        return el._leaflet_pos;
      }
      return (originalGetPosition ? originalGetPosition.call(L.DomUtil, el) : null) || new L.Point(0, 0);
    } catch (_) {
      return new L.Point(0, 0);
    }
  };
}
