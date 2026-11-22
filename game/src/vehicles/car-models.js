// Catalog of the invented car models of Auralis Bay. Dimensions in metres, forward is +z.
export const CAR_MODELS = {
  kestrel: { name: 'Kestrel GT', length: 4.4, width: 1.9, bodyH: 0.62, cabinH: 0.55, cabinLen: 0.42, cabinShift: -0.05, wheelR: 0.36, topSpeed: 52, accel: 24, grip: 7.5, steer: 2.5, health: 100, colors: [0xff3d8b, 0x27e1c8, 0xffb347, 0x6f5bff] },
  brisa: { name: 'Brisa Sedan', length: 4.6, width: 1.8, bodyH: 0.7, cabinH: 0.62, cabinLen: 0.55, cabinShift: -0.05, wheelR: 0.34, topSpeed: 38, accel: 14, grip: 6.5, steer: 2.3, health: 100, colors: [0xe8e0d0, 0x4aa3a0, 0xc4476f, 0x8da0c8, 0xd9b36a] },
  tamarin: { name: 'Tamarin Van', length: 5.0, width: 2.0, bodyH: 1.0, cabinH: 0.75, cabinLen: 0.8, cabinShift: -0.1, wheelR: 0.38, topSpeed: 30, accel: 10, grip: 5.5, steer: 1.9, health: 130, colors: [0xf2f2f2, 0x7aa7d6, 0xe8a05a] },
  okapi: { name: 'Okapi Pickup', length: 5.1, width: 2.0, bodyH: 0.85, cabinH: 0.7, cabinLen: 0.38, cabinShift: 0.22, wheelR: 0.42, topSpeed: 34, accel: 13, grip: 6, steer: 2.0, health: 140, colors: [0xb5532e, 0x2f6f5f, 0xd6c89a] },
  bulwark: { name: 'Bulwark SUV', length: 4.8, width: 2.0, bodyH: 0.95, cabinH: 0.7, cabinLen: 0.62, cabinShift: -0.08, wheelR: 0.44, topSpeed: 40, accel: 15, grip: 6.2, steer: 2.1, health: 150, colors: [0x2b2b3a, 0x8a1f3f, 0xdcdcdc] },
  halcyon: { name: 'Halcyon Cab', length: 4.6, width: 1.8, bodyH: 0.7, cabinH: 0.62, cabinLen: 0.55, cabinShift: -0.05, wheelR: 0.34, topSpeed: 38, accel: 15, grip: 6.5, steer: 2.3, health: 100, colors: [0xffc933] },
  marlin: { name: 'Marlin Interceptor', length: 4.7, width: 1.9, bodyH: 0.68, cabinH: 0.6, cabinLen: 0.55, cabinShift: -0.05, wheelR: 0.36, topSpeed: 50, accel: 22, grip: 7.8, steer: 2.5, health: 120, colors: [0xf4f4ff] },
  stingray: { name: 'Stingray Roadster', length: 4.3, width: 1.95, bodyH: 0.52, cabinH: 0.42, cabinLen: 0.34, cabinShift: 0.0, wheelR: 0.36, topSpeed: 58, accel: 28, grip: 8.2, steer: 2.7, health: 90, colors: [0xff5a2e, 0xffe15a, 0x4ff0d0] },
};

export const TRAFFIC_MIX = ['brisa', 'brisa', 'brisa', 'halcyon', 'tamarin', 'okapi', 'bulwark', 'kestrel', 'stingray'];
export const GANG_RIDE = 'kestrel';
