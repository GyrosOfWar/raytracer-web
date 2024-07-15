<script lang="ts">
  import { setupContext } from "$lib";
  import PathTracer from "$lib/pathtracer";
  import { onMount } from "svelte";

  const width = 1280,
    height = 800;

  let canvasElement: HTMLCanvasElement;
  let error: GPUUncapturedErrorEvent | undefined;
  let frameCount = 0;
  let zPosition = 1.0;

  onMount(async () => {
    const context = await setupContext(canvasElement);
    context.device.onuncapturederror = (e) => {
      console.error(e);
      error = e;
    };

    const renderer = new PathTracer(context, width, height);
    function frame() {
      const texture = context.context.getCurrentTexture();
      const target = texture.createView();
      renderer.zPosition = zPosition;
      renderer.renderFrame(target);

      frameCount += 1;
      if (!error) {
        requestAnimationFrame(frame);
      }
    }

    requestAnimationFrame(frame);
  });

  function handleKeys(event: KeyboardEvent) {
    if (event.key === "w") {
      zPosition += 0.5;
    } else if (event.key === "s") {
      zPosition -= 0.5;
    }
  }
</script>

<svelte:head>
  <title>WebGPU Ray Tracing</title>
</svelte:head>

<svelte:window on:keydown={handleKeys} />

<h1>Raytracer</h1>
{#if error}
  <pre>{error.error.message}</pre>
{:else}
  <canvas {width} {height} bind:this={canvasElement}></canvas>
  <p>Frames rendered: {frameCount}</p>
  <p>z position: {zPosition}</p>
{/if}
