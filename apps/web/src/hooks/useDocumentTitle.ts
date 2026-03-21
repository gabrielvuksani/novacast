import { useEffect, useRef } from 'react';

export function useDocumentTitle(title: string) {
  const prevTitle = useRef(document.title);

  useEffect(() => {
    const prev = prevTitle.current;
    document.title = title ? `${title} — NovaCast` : 'NovaCast';
    return () => {
      document.title = prev;
    };
  }, [title]);
}
