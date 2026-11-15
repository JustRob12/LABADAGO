/**
 * Safely patch Leaflet's internal DomUtil.getPosition and DomUtil.setPosition to prevent
 * "Uncaught TypeError: Cannot read properties of undefined (reading '_leaflet_pos')"
 * and "TypeError: Cannot set properties of undefined (setting '_leaflet_pos')"
 * which occur when Leaflet animations, fitBounds, invalidateSize, or event handlers run
 * while a map component is unmounting, re-rendering, or before elements are attached.
 */
export function patchLeafletPos(L: any) {
  if (!L || !L.DomUtil || (L.DomUtil as any)._posPatched) return;
  (L.DomUtil as any)._posPatched = true;

  // 1. Patch getPosition (reading '_leaflet_pos')
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

  // 2. Patch setPosition (setting '_leaflet_pos')
  const originalSetPosition = L.DomUtil.setPosition;
  L.DomUtil.setPosition = function (el: any, point: any) {
    if (!el) {
      return;
    }
    try {
      if (originalSetPosition) {
        originalSetPosition.call(L.DomUtil, el, point);
      } else {
        el._leaflet_pos = point;
      }
    } catch (_) {
      try {
        if (el) el._leaflet_pos = point;
      } catch (_) {}
    }
  };
}
