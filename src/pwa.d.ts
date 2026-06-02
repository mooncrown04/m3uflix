declare module 'virtual:pwa-register/react' {
  import { Dispatch, SetStateAction } from 'react';
  import { RegisterSWOptions } from 'vite-plugin-pwa/types';

  export interface UseRegisterSWOptions extends RegisterSWOptions {
    immediate?: boolean;
  }

  export function useRegisterSW(options?: UseRegisterSWOptions): {
    needRefresh: [boolean, Dispatch<SetStateAction<boolean>>];
    offlineReady: [boolean, Dispatch<SetStateAction<boolean>>];
    updateServiceWorker: (reloadPage?: boolean) => Promise<void>;
  };
}
