import type { Context } from '$lib';

import shaderCode from './shaders/shaders.wgsl?raw';

function compileShaderModule(device: GPUDevice, code: string): GPUShaderModule {
	return device.createShaderModule({
		code
	});
}

function createDisplayPipeline(
	device: GPUDevice,
	shaderModule: GPUShaderModule
): GPURenderPipeline {
	return device.createRenderPipeline({
		label: 'display',
		primitive: {
			topology: 'triangle-list',
			frontFace: 'ccw'
		},
		vertex: {
			module: shaderModule,
			entryPoint: 'display_vs'
		},
		layout: 'auto',
		fragment: {
			module: shaderModule,
			entryPoint: 'display_fs',
			targets: [
				{
					format: 'bgra8unorm',
					writeMask: GPUColorWrite.ALL
				}
			]
		}
	});
}

export default class PathTracer {
	#context: Context;
	#displayPipeline: GPURenderPipeline;

	constructor(context: Context) {
		context.device.onuncapturederror = (error) => {
			console.error(error);
		};

		const shaderModule = compileShaderModule(context.device, shaderCode);
		const displayPipeline = createDisplayPipeline(context.device, shaderModule);

		this.#context = context;
		this.#displayPipeline = displayPipeline;
	}

	renderFrame(target: GPUTextureView) {
		const encoder = this.#context.device.createCommandEncoder({
			label: 'render frame'
		});

		const renderPass = encoder.beginRenderPass({
			label: 'display pass',
			colorAttachments: [
				{
					view: target,
					loadOp: 'clear',
					storeOp: 'store',
					clearValue: { r: 0, g: 0, b: 0, a: 1 }
				}
			]
		});

		renderPass.setPipeline(this.#displayPipeline);
		renderPass.draw(3, 1);
		renderPass.end();

		const commandBuffer = encoder.finish();
		this.#context.device.queue.submit([commandBuffer]);
	}
}
