/**
 * Safely patch Leaflet's internal DomUtil.getPosition, DomUtil.setPosition,
 * Map.prototype.fitBounds, and Map.prototype.getBoundsZoom to prevent:
 * - "Uncaught TypeError: Cannot read properties of undefined (reading '_leaflet_pos')"
 * - "TypeError: Cannot set properties of undefined (setting '_leaflet_pos')"
 * which occur when Leaflet animations, fitBounds, invalidateSize, or event handlers run
 * while a map container is hidden, sizing, unmounting, or before elements are attached.
 */
export function patchLeafletPos(L: any) {
  if (!L || (L as any)._posPatched) return;
  (L as any)._posPatched = true;

  // 1. Patch getPosition (reading '_leaflet_pos')
  if (L.DomUtil) {
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

  // 3. Patch Map.prototype.getBoundsZoom to prevent NaN/Infinity when container size is 0
  if (L.Map && L.Map.prototype) {
    const origGetBoundsZoom = L.Map.prototype.getBoundsZoom;
    L.Map.prototype.getBoundsZoom = function (bounds: any, inside: any, padding: any) {
      try {
        const size = this.getSize();
        if (!size || size.x <= 0 || size.y <= 0) {
          return this.getZoom() || 15;
        }
        const zoom = origGetBoundsZoom.call(this, bounds, inside, padding);
        if (zoom === undefined || isNaN(zoom) || !isFinite(zoom)) {
          return 15;
        }
        return zoom;
      } catch (_) {
        return 15;
      }
    };

    // 4. Patch Map.prototype.fitBounds to safely handle zero-sized container or identical bounds
    const origFitBounds = L.Map.prototype.fitBounds;
    L.Map.prototype.fitBounds = function (bounds: any, options: any) {
      if (!this._container || !this._mapPane) return this;
      try {
        const size = this.getSize();
        if (!size || size.x <= 0 || size.y <= 0) {
          try {
            this.invalidateSize({ animate: false });
          } catch (_) {}
        }
        if (bounds && typeof bounds.isValid === "function" && bounds.isValid()) {
          const ne = bounds.getNorthEast();
          const sw = bounds.getSouthWest();
          if (ne.lat === sw.lat && ne.lng === sw.lng) {
            return this.setView(bounds.getCenter(), 15, options);
          }
          return origFitBounds.call(this, bounds, { animate: false, ...options });
        }
      } catch (err) {
        console.warn("Safe fitBounds caught error:", err);
      }
      return this;
    };

    // 5. Patch Map.prototype.setView to guard against NaN/Infinite zoom
    const origSetView = L.Map.prototype.setView;
    L.Map.prototype.setView = function (center: any, zoom: any, options: any) {
      if (!this._container || !this._mapPane) return this;
      if (zoom === undefined || isNaN(zoom) || !isFinite(zoom)) {
        zoom = 15;
      }
      try {
        return origSetView.call(this, center, zoom, options);
      } catch (err) {
        console.warn("Safe setView caught error:", err);
        return this;
      }
    };
  }
}
