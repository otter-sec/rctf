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
    class="brainrot-window"
    style="
      left: {win.x}px;
      top: {win.y}px;
      z-index: {win.z};
      width: {win.w}px;
      height: {win.h}px;
    "
    onmousedown={() => bringToFront(win.id)}
  >
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="window-titlebar" onmousedown={e => startDrag(e, win.id)}>
      <span class="window-title">{win.title}</span>
      <button
        class="window-close"
        onmousedown={e => e.stopPropagation()}
        onclick={() => closeWindow(win.id)}
      >
        <IconX />
      </button>
    </div>
    <div class="window-content">
      <iframe
        src="{win.url}?autoplay=1&mute=1&loop=1"
        title={win.title}
        frameborder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen
      ></iframe>
    </div>
  </div>
{/each}

<style>
  .brainrot-window {
    position: fixed;
    display: flex;
    flex-direction: column;
    border-radius: 8px;
    overflow: hidden;
    box-shadow:
      0 8px 32px rgba(0, 0, 0, 0.3),
      0 2px 8px rgba(0, 0, 0, 0.2);
    background: #1a1a1a;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .window-titlebar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 8px 6px 12px;
    background: #252525;
    cursor: grab;
    user-select: none;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }

  .window-titlebar:active {
    cursor: grabbing;
  }

  .window-title {
    font-size: 0.75rem;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.7);
    letter-spacing: 0.3px;
  }

  .window-close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border: none;
    background: transparent;
    border-radius: 4px;
    color: rgba(255, 255, 255, 0.5);
    cursor: pointer;
    transition: all 0.1s ease;
  }

  .window-close:hover {
    background: rgba(255, 80, 80, 0.8);
    color: white;
  }

  .window-content {
    flex: 1;
    min-height: 0;
  }

  .window-content iframe {
    width: 100%;
    height: 100%;
    display: block;
  }
</style>
