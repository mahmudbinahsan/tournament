import { useSyncExternalStore } from 'react';
import { getDataVersion, subscribeToDataChanges } from '../core/storage/storage';

export function useDataVersion(): number {
  return useSyncExternalStore(subscribeToDataChanges, getDataVersion, getDataVersion);
}
