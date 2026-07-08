<script lang="ts">
  import {
    activate,
    ACTIVATED_MAX_Z,
    advanceBuffer,
    bringToFront as bringToFrontOf,
    closeWindow as closeWindowOf,
    dragTo,
    INITIAL_MAX_Z,
    type Drag,
    type VideoWindow,
  } from '$lib/components/brainrot-logic'
  import { IconX } from '$lib/icons'

  let buffer = $state('')
  let windows = $state<VideoWindow[]>([])
  let maxZ = $state(INITIAL_MAX_Z)
  let dragging = $state<Drag | null>(null)

  function onKeydown(event: KeyboardEvent) {
    const targetIsTextField =
      event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement
    const result = advanceBuffer(buffer, event.key, targetIsTextField)
    buffer = result.buffer
    if (result.activated) {
      const spawned = activate(windows)
      if (spawned !== windows) {
        windows = spawned
        maxZ = ACTIVATED_MAX_Z
      }
    }
  }

  function bringToFront(id: number) {
    const result = bringToFrontOf(windows, id, maxZ)
    windows = result.windows
    maxZ = result.maxZ
  }

  function startDrag(event: MouseEvent, id: number) {
    const win = windows.find(w => w.id === id)
    if (!win) return
    bringToFront(id)
    dragging = { id, offsetX: event.clientX - win.x, offsetY: event.clientY - win.y }
  }

  function onMouseMove(event: MouseEvent) {
    windows = dragTo(windows, dragging, event.clientX, event.clientY)
  }

  function onMouseUp() {
    dragging = null
  }
</script>

<svelte:window
  onkeydown={onKeydown}
  onmousemove={dragging ? onMouseMove : undefined}
  onmouseup={dragging ? onMouseUp : undefined}
/>

{#each windows as win (win.id)}
  <brainrot-window
    style:left="{win.x}px"
    style:top="{win.y}px"
    style:width="{win.w}px"
    style:height="{win.h}px"
    style:z-index={win.z}
    onmousedown={() => bringToFront(win.id)}
    role="presentation"
  >
    <brainrot-bar onmousedown={(event: MouseEvent) => startDrag(event, win.id)} role="presentation">
      <span>{win.title}</span>
      <button
        type="button"
        aria-label="Close {win.title}"
        onmousedown={event => event.stopPropagation()}
        onclick={() => (windows = closeWindowOf(windows, win.id))}
      >
        <IconX aria-hidden="true" />
      </button>
    </brainrot-bar>
    <iframe
      src="{win.url}?autoplay=1&mute=1&loop=1"
      title={win.title}
      frameborder="0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      referrerpolicy="strict-origin-when-cross-origin"
      allowfullscreen
    ></iframe>
  </brainrot-window>
{/each}

<style>
  brainrot-window {
    position: fixed;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: var(--background-l1);
    border: 2px solid var(--border);
    border-radius: var(--radius-lg);
    box-shadow: 0 10px 30px var(--gray-a8);
  }

  brainrot-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2xs);
    padding-block: var(--space-3xs);
    padding-inline: var(--space-2xs);
    color: var(--foreground-l0);
    background: var(--background-l3);
    cursor: grab;
    user-select: none;

    &:active {
      cursor: grabbing;
    }

    span {
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
  }

  button {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-3xs);
    color: var(--foreground-l1);
    background: transparent;
    border: none;
    border-radius: var(--radius-sm);
    cursor: pointer;

    &:hover {
      color: var(--foreground-l0);
      background: var(--background-l5);
    }

    &:focus-visible {
      outline: 2px solid var(--ring);
      outline-offset: -1px;
    }
  }

  iframe {
    display: block;
    flex: 1;
    min-block-size: 0;
    inline-size: 100%;
    border: none;
  }
</style>
