import { useEffect, useState } from 'react';

/**
 * Detects mobile/phone form factors cleanly while preserving full Desktop
 * layout on Windows desktops and laptops.
 */
export function useIsMobile(): boolean {
  const getMatch = () => {
    if (typeof window === 'undefined') return false;
    const narrow = window.matchMedia('(max-width: 1023px)').matches;
    const touchOnly =
      window.matchMedia('(hover: none) and (pointer: coarse)').matches &&
      window.innerWidth <= 1200;
    return narrow || touchOnly;
  };

  const [isMobile, setIsMobile] = useState<boolean>(getMatch);

  useEffect(() => {
    const mqNarrow = window.matchMedia('(max-width: 1023px)');
    const mqTouch = window.matchMedia('(hover: none) and (pointer: coarse)');
    const update = () => setIsMobile(getMatch());

    mqNarrow.addEventListener('change', update);
    mqTouch.addEventListener('change', update);
    window.addEventListener('resize', update);
    return () => {
      mqNarrow.removeEventListener('change', update);
      mqTouch.removeEventListener('change', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return isMobile;
}

