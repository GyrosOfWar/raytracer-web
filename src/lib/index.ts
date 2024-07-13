export interface Context {
	device: GPUDevice;
	encoder: GPUCommandEncoder;
	context: GPUCanvasContext;
}

export interface Color {
	r: number;
	g: number;
	b: number;
	a: number;
}

export async function setupContext(canvasElement: HTMLCanvasElement) {
	if (!navigator.gpu) {
		throw new Error('unsuppoted browser, sorry');
	}

	const adapter = await navigator.gpu.requestAdapter();
	if (!adapter) {
		throw new Error('No appropriate GPUAdapter found.');
	}

	const device = await adapter.requestDevice();

	const context = canvasElement.getContext('webgpu')!;
	const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
	context.configure({
		device: device,
		format: canvasFormat
	});
	const encoder = device.createCommandEncoder();

	return {
		device,
		encoder,
		context
	};
}

export function clearScreen({ device, context }: Context, color: Color) {
	const encoder = device.createCommandEncoder();
	const pass = encoder.beginRenderPass({
		colorAttachments: [
			{
				view: context.getCurrentTexture().createView(),
				loadOp: 'clear',
				clearValue: color,
				storeOp: 'store'
			}
		]
	});
	pass.end();
	device.queue.submit([encoder.finish()]);
}

export function clamp(n: number, min: number, max: number): number {
	if (n < min) {
		return min;
	} else if (n > max) {
		return max;
	} else {
		return n;
	}
}

export function overflow(n: number, start: number, end: number): number {
	if (n > start) {
		return start;
	} else if (n < end) {
		return end;
	} else {
		return n;
	}
}
