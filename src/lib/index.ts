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

export function clearScreen(context: Context, color: Color) {
	const pass = context.encoder.beginRenderPass({
		colorAttachments: [
			{
				view: context.context.getCurrentTexture().createView(),
				loadOp: 'clear',
				clearValue: color,
				storeOp: 'store'
			}
		]
	});

	pass.end();
	context.device.queue.submit([context.encoder.finish()]);
}

function compileShaderModule(device: GPUDevice, code: string): GPUShaderModule {
	return device.createShaderModule({
		code
	});
}
