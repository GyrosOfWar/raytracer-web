<script lang="ts">
	import { setupContext, clearScreen } from '$lib';
	import { onMount } from 'svelte';

	let canvasElement: HTMLCanvasElement;

	onMount(async () => {
		let context = await setupContext(canvasElement);
		clearScreen(context, { r: 0.6, g: 0.6, b: 0.99, a: 1.0 });
	});
</script>

<h1>Raytracer</h1>
<canvas width="1280" height="800" bind:this={canvasElement}></canvas>
