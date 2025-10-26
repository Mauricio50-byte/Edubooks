/**
 * This file includes polyfills needed by Angular and is loaded before the app.
 * You can add your own extra polyfills to this file.
 *
 * This file is divided into 2 sections:
 *   1. Browser polyfills. These are applied before loading ZoneJS and are sorted by browsers.
 *   2. Application imports. Files imported after ZoneJS that should be loaded before your main
 *      file.
 *
 * The current setup is for so-called "evergreen" browsers; the last versions of browsers that
 * automatically update themselves. This includes recent versions of Safari, Chrome (including
 * Opera), Edge on the desktop, and iOS and Chrome on mobile.
 *
 * Learn more in https://angular.io/guide/browser-support
 */

/***************************************************************************************************
 * BROWSER POLYFILLS
 */

/**
 * By default, zone.js will patch all possible macroTask and DomEvents
 * user can disable parts of macroTask/DomEvents patch by setting following flags
 * because those flags need to be set before `zone.js` being loaded, and webpack
 * will put import in the top of bundle, so user need to create a separate file
 * in this directory (for example: zone-flags.ts), and put the following flags
 * into that file, and then add the following code before importing zone.js.
 * import './zone-flags';
 *
 * The flags allowed in zone-flags.ts are listed here.
 *
 * The following flags will work for all browsers.
 *
 * (window as any).__Zone_disable_requestAnimationFrame = true; // disable patch requestAnimationFrame
 * (window as any).__Zone_disable_on_property = true; // disable patch onProperty such as onclick
 * (window as any).__zone_symbol__UNPATCHED_EVENTS = ['scroll', 'mousemove']; // disable patch specified eventNames
 *
 *  in IE/Edge developer tools, the addEventListener will also be wrapped by zone.js
 *  with the following flag, it will bypass `zone.js` patch for IE/Edge
 *
 *  (window as any).__Zone_enable_cross_context_check = true;
 *
 */
 
import './zone-flags';

/***************************************************************************************************
 * Zone JS is required by default for Angular itself.
 */
import 'zone.js';  // Included with Angular CLI.


/***************************************************************************************************
 * APPLICATION IMPORTS
 */
// Polyfill/patch para Web Locks: versión segura sin escribir en navigator.locks ni mostrar logs
(function() {
  try {
    const w: any = window as any;
    const nav: any = (w && w.navigator) ? w.navigator : undefined;
    if (!nav || nav.__edubooksLockPatched) {
      return;
    }
    const locks: any = nav.locks;
    // Si no existe Web Locks o no hay request, no hacer nada
    if (!locks || typeof locks.request !== 'function') {
      return;
    }

    const originalRequest = locks.request.bind(locks);
    const lockQueues = new Map<string, Promise<any>>();

    // Envoltura que serializa peticiones por nombre sin romper el comportamiento nativo
    locks.request = function(name: string, optionsOrCb: any, maybeCb?: any) {
      try {
        const cb = typeof optionsOrCb === 'function' ? optionsOrCb : maybeCb;
        if (typeof cb !== 'function') {
          // Si no hay callback válido, usar la implementación nativa
          return originalRequest(name, optionsOrCb, maybeCb);
        }
        // Serializa por nombre para evitar fallos inmediatos al competir por el mismo lock
        const prev = lockQueues.get(name) || Promise.resolve();
        const next = prev.then(() => originalRequest(name, optionsOrCb, cb));
        lockQueues.set(name, next.catch(() => Promise.resolve()));
        return next;
      } catch {
        // Ante cualquier problema, delegar en la implementación nativa
        return originalRequest(name, optionsOrCb, maybeCb);
      }
    };

    nav.__edubooksLockPatched = true;
  } catch {
    // Silencioso: no registrar advertencias en consola
  }
})();
