import type { Context } from "$lib";

import shaderCode from "./shaders/shaders.wgsl?raw";

function compileShaderModule(device: GPUDevice, code: string): GPUShaderModule {
  return device.createShaderModule({
    code,
  });
}

function createDisplayPipeline(device: GPUDevice, shaderModule: GPUShaderModule) {
  const bindGroupLayout = device.createBindGroupLayout({
    label: "bind group layout",
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.FRAGMENT,
        buffer: {
          type: "uniform",
          hasDynamicOffset: false,
        },
      },
      {
        binding: 1,
        visibility: GPUShaderStage.FRAGMENT,
        texture: {
          sampleType: "unfilterable-float",
          multisampled: false,
          viewDimension: "2d",
        },
      },
      {
        binding: 2,
        visibility: GPUShaderStage.FRAGMENT,
        storageTexture: {
          access: "write-only",
          format: "rgba32float",
          viewDimension: "2d",
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

function createSampleTextures(
  device: GPUDevice,
  width: number,
  height: number,
): [GPUTexture, GPUTexture] {
  const description = {
    label: "radiance samples",
    size: {
      width,
      height,
      depthOrArrayLayers: 1,
    },
    mipLevelCount: 1,
    sampleCount: 1,
    dimension: "2d",
    format: "rgba32float",
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.STORAGE_BINDING,
  } satisfies GPUTextureDescriptor;

  return [device.createTexture(description), device.createTexture(description)];
}

function createDisplayBindGroups(
  device: GPUDevice,
  layout: GPUBindGroupLayout,
  textures: GPUTexture[],
  uniformsBuffer: GPUBuffer,
) {
  const views = [textures[0].createView(), textures[1].createView()];

  return [
    device.createBindGroup({
      label: "bind group 1",
      layout,
      entries: [
        {
          binding: 0,
          resource: {
            buffer: uniformsBuffer,
            offset: 0,
          },
        },
        { binding: 1, resource: views[0] },
        { binding: 2, resource: views[1] },
      ],
    }),

    device.createBindGroup({
      label: "bind group 2",
      layout,
      entries: [
        {
          binding: 0,
          resource: {
            buffer: uniformsBuffer,
            offset: 0,
          },
        },
        { binding: 1, resource: views[1] },
        { binding: 2, resource: views[0] },
      ],
    }),
  ];
}

export default class PathTracer {
  #context: Context;
  #displayPipeline: GPURenderPipeline;
  #uniforms: Uint32Array;
  #uniformsBuffer: GPUBuffer;
  #displayBindGroups: GPUBindGroup[];
  #radianceSamples: GPUTexture[];

  constructor(context: Context, width: number, height: number) {
    const shaderModule = compileShaderModule(context.device, shaderCode);
    const { displayPipeline, bindGroupLayout } = createDisplayPipeline(
      context.device,
      shaderModule,
    );

    this.#context = context;
    this.#displayPipeline = displayPipeline;
    this.#uniforms = new Uint32Array([width, height, 0]);
    this.#radianceSamples = createSampleTextures(context.device, width, height);
    this.#uniformsBuffer = context.device.createBuffer({
      label: "uniforms",
      // 3 * u32 (4 bytes)
      size: 3 * 4,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      mappedAtCreation: false,
    });

    this.#displayBindGroups = createDisplayBindGroups(
      context.device,
      bindGroupLayout,
      this.#radianceSamples,
      this.#uniformsBuffer,
    );
  }

  renderFrame(target: GPUTextureView) {
    this.#uniforms[2] += 1;

    this.#context.device.queue.writeBuffer(this.#uniformsBuffer, 0, this.#uniforms);

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
    renderPass.setBindGroup(0, this.#displayBindGroups[this.#uniforms[2] % 2]);
    renderPass.draw(6, 1);
    renderPass.end();

    const commandBuffer = encoder.finish();
    this.#context.device.queue.submit([commandBuffer]);
  }
}
