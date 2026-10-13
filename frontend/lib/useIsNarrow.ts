'use client';

import { useEffect, useState } from 'react';

/** True below Tailwind's `sm` breakpoint (640px). Used by the charts to
 * switch to phone-friendly axis/legend settings; always false during SSR. */
export function useIsNarrow(maxWidthPx = 639) {
  const [isNarrow, setIsNarrow] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(`(max-width: ${maxWidthPx}px)`);
    const update = () => setIsNarrow(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, [maxWidthPx]);

  return isNarrow;
}
