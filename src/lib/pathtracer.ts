import type { Context } from "$lib";

import shaderCode from "./shaders/shaders.wgsl?raw";

function compileShaderModule(device: GPUDevice, code: string): GPUShaderModule {
  return device.createShaderModule({
    code,
  });
}

function createDisplayPipeline(device: GPUDevice, shaderModule: GPUShaderModule) {
  const bindGroupLayout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.FRAGMENT,
        buffer: {
          type: "uniform",
          hasDynamicOffset: false,
        },
      },
    ],
  });

  const displayPipeline = device.createRenderPipeline({
    label: "display",
    primitive: {
      topology: "triangle-list",
      frontFace: "ccw",
    },
    vertex: {
      module: shaderModule,
      entryPoint: "display_vs",
    },
    layout: device.createPipelineLayout({
      bindGroupLayouts: [bindGroupLayout],
    }),
    fragment: {
      module: shaderModule,
      entryPoint: "display_fs",
      targets: [
        {
          format: "bgra8unorm",
          writeMask: GPUColorWrite.ALL,
        },
      ],
    },
  });

  return { displayPipeline, bindGroupLayout };
}

export default class PathTracer {
  #context: Context;
  #displayPipeline: GPURenderPipeline;
  #uniforms: Uint32Array;
  #uniformsBuffer: GPUBuffer;
  #displayBindGroup: GPUBindGroup;

  constructor(context: Context, width: number, height: number) {
    context.device.onuncapturederror = (error) => {
      console.error(error);
    };

    const shaderModule = compileShaderModule(context.device, shaderCode);
    const { displayPipeline, bindGroupLayout } = createDisplayPipeline(
      context.device,
      shaderModule,
    );

    this.#context = context;
    this.#displayPipeline = displayPipeline;
    this.#uniforms = new Uint32Array([width, height]);
    const buffer = context.device.createBuffer({
      label: "uniforms",
      // 2 * u32 (4 bytes)
      size: 2 * 4,
      usage: GPUBufferUsage.UNIFORM,
      mappedAtCreation: true,
    });

    buffer.unmap();
    this.#uniformsBuffer = buffer;
    this.#displayBindGroup = context.device.createBindGroup({
      layout: bindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: {
            buffer: buffer,
            offset: 0,
          },
        },
      ],
    });
  }

  renderFrame(target: GPUTextureView) {
    const encoder = this.#context.device.createCommandEncoder({
      label: "render frame",
    });

    const renderPass = encoder.beginRenderPass({
      label: "display pass",
      colorAttachments: [
        {
          view: target,
          loadOp: "clear",
          storeOp: "store",
          clearValue: { r: 0, g: 0, b: 0, a: 1 },
        },
      ],
    });

    renderPass.setPipeline(this.#displayPipeline);
    renderPass.setBindGroup(0, this.#displayBindGroup, []);
    renderPass.draw(6, 1);
    renderPass.end();

    const commandBuffer = encoder.finish();
    this.#context.device.queue.submit([commandBuffer]);
  }
}
