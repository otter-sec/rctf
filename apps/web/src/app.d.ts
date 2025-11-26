/// <reference types="unplugin-icons/types/svelte" />
declare global {
  namespace App {}
}

declare module '~icons/*' {
  import { SvelteComponent } from 'svelte'
  const component: typeof SvelteComponent
  export default component
}

export {}
