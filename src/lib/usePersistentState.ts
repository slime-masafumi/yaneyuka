'use client';

import { useEffect, useState } from 'react';
import { load, save } from './persist';

export function usePersistentState<T>(key: string, initial: T, ttlMs?: number) {
  const [state, setState] = useState<T>(() => {
    const v = load<T>(key, initial);
    return (v === undefined ? initial : v) as T;
  });
  useEffect(() => {
    save(key, state, ttlMs);
  }, [key, state, ttlMs]);
  return [state, setState] as const;
}



