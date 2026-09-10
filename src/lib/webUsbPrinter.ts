export async function connectWebUsbPrinter(vendorId?: number, productId?: number) {
  try {
    const filters = vendorId ? [{ vendorId, productId }] : [];
    const device = await navigator.usb.requestDevice({ filters });
    await device.open();
    await device.selectConfiguration(1);
    await device.claimInterface(0);
    return device;
  } catch (err) {
    console.error('Failed to connect to USB printer', err);
    throw err;
  }
}

export async function printViaWebUsb(device: USBDevice, data: Uint8Array) {
  try {
    await device.transferOut(1, data);
  } catch (err) {
    console.error('Failed to print via USB', err);
    throw err;
  }
}
