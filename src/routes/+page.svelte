<script lang="ts">
  import { clamp, clearScreen, overflow, setupContext, type Color } from "$lib";
  import PathTracer from "$lib/pathtracer";
  import { onMount } from "svelte";

  let canvasElement: HTMLCanvasElement;

  onMount(async () => {
    const context = await setupContext(canvasElement);
    const renderer = new PathTracer(context, 1280, 800);
    function frame() {
      let texture = context.context.getCurrentTexture();
      let target = texture.createView();
      renderer.renderFrame(target);
      requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
  });
</script>

<h1>Raytracer</h1>
<canvas width="1280" height="800" bind:this={canvasElement}></canvas>
