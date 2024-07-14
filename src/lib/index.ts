export interface Context {
  device: GPUDevice;
  encoder: GPUCommandEncoder;
  context: GPUCanvasContext;
}

export async function setupContext(canvasElement: HTMLCanvasElement) {
  if (!navigator.gpu) {
    throw new Error("unsuppoted browser, sorry");
  }

  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) {
    throw new Error("No appropriate GPUAdapter found.");
  }

  const device = await adapter.requestDevice();

  const context = canvasElement.getContext("webgpu")!;
  const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
  context.configure({
    device: device,
    format: canvasFormat,
  });
  const encoder = device.createCommandEncoder();

  return {
    device,
    encoder,
    context,
  };
}
