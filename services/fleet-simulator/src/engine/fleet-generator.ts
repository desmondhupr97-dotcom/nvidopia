import type { ISimVehicle } from '@nvidopia/data-models';
import crypto from 'node:crypto';

const PLATFORMS = ['ORIN-X', 'ORIN-N', 'THOR', 'Atlan'];
const SOC_ARCHS = ['Orin-SoC-A', 'Orin-SoC-B', 'Thor-SoC', 'Atlan-SoC'];
const SENSOR_VERSIONS = ['LiDAR-v3', 'LiDAR-v4', 'Camera-8x-v2', 'Fusion-v5'];
const MODEL_CODES = ['AD-SUV-01', 'AD-Sedan-02', 'AD-MPV-03', 'AD-Truck-04', 'AD-Bus-05'];
const PLATE_TYPES = ['permanent', 'temporary'] as const;

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function generateVin(): string {
  const chars = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789';
  let vin = 'SIM';
  for (let i = 0; i < 14; i++) vin += chars[Math.floor(Math.random() * chars.length)];
  return vin;
}

export function generateFleet(count: number, template?: Partial<ISimVehicle>): ISimVehicle[] {
  const vehicles: ISimVehicle[] = [];
  for (let i = 0; i < count; i++) {
    vehicles.push({
      vin: template?.vin ? `${template.vin}-${String(i + 1).padStart(3, '0')}` : generateVin(),
      plate_type: template?.plate_type ?? pick(PLATE_TYPES),
      model_code: template?.model_code ?? pick(MODEL_CODES),
      vehicle_platform: template?.vehicle_platform ?? pick(PLATFORMS),
      sensor_suite_version: template?.sensor_suite_version ?? pick(SENSOR_VERSIONS),
      soc_architecture: template?.soc_architecture ?? pick(SOC_ARCHS),
    });
  }
  return vehicles;
}
