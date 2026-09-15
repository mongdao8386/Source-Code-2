'use client';

import { useEffect } from 'react';

/**
 * The browser-side deterrents. Mounted once in the site layout; renders
 * nothing. Each is a listener on the document, switched by settings.
 *
 * What each can and cannot do:
 *
 *   - context menu / drag: closes the "Save image as…" route. The photo is
 *     still in the page; this stops the reflex, not the expert.
 *   - shortcuts: F12 and Ctrl+Shift+I/J/C do not open the inspector, Ctrl+U
 *     does not view source, Ctrl+S / Ctrl+P do not save or print. All of
 *     them are still reachable from the browser's own menu.
 *   - PrintScreen: the key cannot be cancelled, but on Windows the capture
 *     lands in the clipboard, and the page may overwrite the clipboard from
 *     the key-up. The screenshot is gone before it is pasted anywhere.
 *   - blur: snipping tools (Win+Shift+S and friends) take focus from the
 *     window; photos blur on that event and clear when focus returns. A
 *     phone screenshot fires no event and is not covered — the watermark is
 *     what covers it.
 */
const MEDIA = 'img, video, picture, .wm';

export function SiteProtection({
  blockContextMenu,
  blockShortcuts,
  hideOnBlur,
}: {
  blockContextMenu: boolean;
  blockShortcuts: boolean;
  hideOnBlur: boolean;
}) {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('protect-media', blockContextMenu);
    if (!blockContextMenu) return;

    const onMenu = (e: MouseEvent) => {
      if ((e.target as Element | null)?.closest?.(MEDIA)) e.preventDefault();
    };
    const onDrag = (e: DragEvent) => {
      if ((e.target as Element | null)?.closest?.(MEDIA)) e.preventDefault();
    };
    document.addEventListener('contextmenu', onMenu);
    document.addEventListener('dragstart', onDrag);
    return () => {
      document.removeEventListener('contextmenu', onMenu);
      document.removeEventListener('dragstart', onDrag);
      root.classList.remove('protect-media');
    };
  }, [blockContextMenu]);

  useEffect(() => {
    if (!blockShortcuts) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const mod = e.ctrlKey || e.metaKey;
      const blocked =
        e.key === 'F12' ||
        (mod && e.shiftKey && (k === 'i' || k === 'j' || k === 'c')) ||
        (mod && (k === 'u' || k === 's' || k === 'p'));
      if (blocked) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key !== 'PrintScreen') return;
      // Best effort; refused silently where the browser will not allow it.
      navigator.clipboard?.writeText(' ').catch(() => {});
    };
    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('keyup', onKeyUp, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('keyup', onKeyUp, true);
    };
  }, [blockShortcuts]);

  useEffect(() => {
    if (!hideOnBlur) return;
    const root = document.documentElement;
    const hide = () => root.classList.add('protect-hidden');
    const show = () => root.classList.remove('protect-hidden');
    const onVis = () => (document.hidden ? hide() : show());
    window.addEventListener('blur', hide);
    window.addEventListener('focus', show);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('blur', hide);
      window.removeEventListener('focus', show);
      document.removeEventListener('visibilitychange', onVis);
      show();
    };
  }, [hideOnBlur]);

  return null;
}
