<script lang="ts">
  import { setupContext } from "$lib";
  import PathTracer from "$lib/pathtracer";
  import { onMount } from "svelte";

  let canvasElement: HTMLCanvasElement;
  let error: GPUUncapturedErrorEvent | undefined;
  let frameCount = 0;

  onMount(async () => {
    const context = await setupContext(canvasElement);
    context.device.onuncapturederror = (e) => {
      error = e;
    };

    const renderer = new PathTracer(context, 1280, 800);
    function frame() {
      let texture = context.context.getCurrentTexture();
      let target = texture.createView();
      renderer.renderFrame(target);
      frameCount += 1;
      if (!error) {
        requestAnimationFrame(frame);
      }
    }

    requestAnimationFrame(frame);
  });
</script>

<h1>Raytracer</h1>
{#if error}
  <p>
    {error.error.message}
  </p>
{:else}
  <canvas width="1280" height="800" bind:this={canvasElement}></canvas>
  <p>Frames rendered: {frameCount}</p>
{/if}
