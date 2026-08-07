import { useEffect } from 'react';

/**
 * Prevents mobile browsers from auto-scrolling the page when the virtual keyboard opens.
 * 
 * Instead of using translateY on the input bar (which still allows browser scroll),
 * this hook dynamically sets `--visual-vh` to the visual viewport height.
 * 
 * The container (e.g., the chat page or sidebar) should use `h-[var(--visual-vh,100dvh)]`
 * so it shrinks to fit above the keyboard. The input area stays at the bottom of the
 * now-shorter container — no scrolling, no jumping, perfectly stable.
 */
export function useVisualViewportOffset() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      // Set the visual viewport height as a CSS variable
      const vh = vv.height;
      document.documentElement.style.setProperty('--visual-vh', `${vh}px`);

      // Mobile bottom sheet: 85% of visual viewport height so it shrinks above keyboard
      document.documentElement.style.setProperty('--mobile-sheet-h', `${vh * 0.85}px`);

      // Also compute keyboard offset for backward compat
      const offset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      document.documentElement.style.setProperty('--kb-offset', `${offset}px`);
    };

    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    update();

    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
      document.documentElement.style.removeProperty('--visual-vh');
      document.documentElement.style.removeProperty('--mobile-sheet-h');
      document.documentElement.style.removeProperty('--kb-offset');
    };
  }, []);
}
