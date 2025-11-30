<script lang="ts">
  import { IconX } from '$lib/icons'

  const KONAMI_CODE = 'BRAINROT'
  let inputBuffer = $state('')

  type VideoWindow = {
    id: number
    url: string
    title: string
    x: number
    y: number
    z: number
    w: number
    h: number
  }

  let windows = $state<VideoWindow[]>([])
  let maxZ = $state(100)
  let dragging = $state<{
    id: number
    offsetX: number
    offsetY: number
  } | null>(null)

  const videoConfigs = [
    // Thanks https://stimming.club/
    {
      url: 'https://www.youtube.com/embed/ChBg4aowzX8',
      title: 'Subway Surfers',
      x: 40,
      y: 80,
      w: 480,
      h: 320,
    },
    {
      url: 'https://www.youtube.com/embed/Q4MOP8s9KyY',
      title: 'Soap Cutting',
      x: 560,
      y: 80,
      w: 480,
      h: 320,
    },
    {
      url: 'https://www.youtube.com/embed/REuKymvrrqk',
      title: 'Minecraft',
      x: 300,
      y: 200,
      w: 640,
      h: 400,
    },
  ]

  function handleKeydown(e: KeyboardEvent) {
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement
    ) {
      return
    }

    const key = e.key.toUpperCase()
    if (key.length === 1 && /[A-Z]/.test(key)) {
      inputBuffer += key

      if (inputBuffer.length > KONAMI_CODE.length) {
        inputBuffer = inputBuffer.slice(-KONAMI_CODE.length)
      }

      if (inputBuffer === KONAMI_CODE) {
        activateBrainrot()
        inputBuffer = ''
      }
    }
  }

  function activateBrainrot() {
    if (windows.length > 0) {
      return
    }

    windows = videoConfigs.map((config, i) => ({
      id: i,
      ...config,
      z: 100 + i,
    }))
    maxZ = 100 + videoConfigs.length
  }

  function closeWindow(id: number) {
    windows = windows.filter(w => w.id !== id)
  }

  function bringToFront(id: number) {
    const win = windows.find(w => w.id === id)
    if (win) {
      maxZ++
      win.z = maxZ
    }
  }

  function startDrag(e: MouseEvent, id: number) {
    const win = windows.find(w => w.id === id)
    if (!win) {
      return
    }

    bringToFront(id)
    dragging = {
      id,
      offsetX: e.clientX - win.x,
      offsetY: e.clientY - win.y,
    }
  }

  function onMouseMove(e: MouseEvent) {
    if (!dragging) {
      return
    }

    const { id, offsetX, offsetY } = dragging
    const win = windows.find(w => w.id === id)
    if (!win) {
      return
    }

    win.x = e.clientX - offsetX
    win.y = e.clientY - offsetY
  }

  function onMouseUp() {
    dragging = null
  }
</script>

<svelte:window
  onkeydown={handleKeydown}
  onmousemove={onMouseMove}
  onmouseup={onMouseUp}
/>

{#each windows as win (win.id)}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed flex flex-col rounded-lg overflow-hidden bg-background-l1 border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3),0_2px_8px_rgba(0,0,0,0.2)]"
    style:left="{win.x}px"
    style:top="{win.y}px"
    style:z-index={win.z}
    style:width="{win.w}px"
    style:height="{win.h}px"
    onmousedown={() => bringToFront(win.id)}
  >
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="flex items-center justify-between py-1.5 pr-2 pl-3 bg-background-l2 cursor-grab active:cursor-grabbing select-none border-b border-white/5"
      onmousedown={e => startDrag(e, win.id)}
    >
      <span class="text-xs font-medium text-white/70 tracking-wide"
        >{win.title}</span
      >
      <button
        class="flex items-center justify-center w-6 h-6 border-0 bg-transparent rounded text-white/50 cursor-pointer transition-all duration-100 hover:bg-red-500/80 hover:text-white"
        onmousedown={e => e.stopPropagation()}
        onclick={() => closeWindow(win.id)}
      >
        <IconX />
      </button>
    </div>
    <div class="flex-1 min-h-0">
      <iframe
        class="w-full h-full block"
        src="{win.url}?autoplay=1&mute=1&loop=1"
        title={win.title}
        frameborder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen
      ></iframe>
    </div>
  </div>
{/each}
