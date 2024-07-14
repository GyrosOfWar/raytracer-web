<script lang="ts">
  import { setupContext } from "$lib";
  import PathTracer from "$lib/pathtracer";
  import { onMount } from "svelte";

  const width = 1280,
    height = 800;

  let canvasElement: HTMLCanvasElement;
  let error: GPUUncapturedErrorEvent | undefined;
  let frameCount = 0;
  let zPosition = 0.0;

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
    console.log(event.key);
    if (event.key === "W") {
      zPosition += 0.5;
    } else if (event.key === "S") {
      zPosition -= 0.5;
    }
  }
</script>

<svelte:head>
  <title>WebGPU Ray Tracing</title>
</svelte:head>

<h1>Raytracer</h1>
{#if error}
  <pre>{error.error.message}</pre>
{:else}
  <canvas on:keydown={handleKeys} {width} {height} bind:this={canvasElement}></canvas>
  <p>Frames rendered: {frameCount}</p>
{/if}
