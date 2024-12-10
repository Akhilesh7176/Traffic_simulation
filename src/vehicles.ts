import * as THREE from "three";
import { latLonToWebMercator } from "./utils.ts";
import { createBike } from "./vehicles/bike.ts";
import { createCar } from "./vehicles/car.ts";
import { createTruck } from "./vehicles/truck.ts";
import { createSuv } from "./vehicles/suv.ts";

export interface VehicleData {
  vehicle_num: any;
  vehicle: THREE.Object3D;
  vehicleMovementData: any[];
  tooltip: string;
  currentPosition?: THREE.Vector3;
  currentTime?: number;
  speed?: number;
  tooltipAlwaysOn?: boolean;
  labelElement?: HTMLDivElement;
  labelObject?: any;
  legendItem?: HTMLDivElement;
  toggleButton?: HTMLButtonElement;
  infoText?: HTMLSpanElement;
  setTargetButton?: HTMLButtonElement;
  currentLat?: number;
  currentLon?: number;
}

export function createVehicle(
  scene: THREE.Scene,
  type: string,
  id: any,
  vehicleMovementData: any[]
): VehicleData {
  let vehicle: THREE.Object3D;
  let tooltipText: string;

  switch (type) {
    case "Car":
      vehicle = createCar(scene, 0.055);
      tooltipText = `Car ${id}`;
      break;
    case "Motorcycle":
      vehicle = createBike(scene, 0.06);
      tooltipText = `Bike ${id}`;
      break;
    case "Heavy Vehicle":
      vehicle = createTruck(scene, 0.065);
      tooltipText = `Truck ${id}`;
      break;
    case "Medium Vehicle":
      vehicle = createSuv(scene, 0.055);
      tooltipText = `Suv ${id}`;
      break;
    default:
      console.warn(`Unknown vehicle type: ${type}, defaulting to Car.`);
      vehicle = createCar(scene, 0.055);
      tooltipText = `Car ${id}`;
      break;
  }

  const vehicleData: VehicleData = {
    vehicle_num: id,
    vehicle: vehicle,
    vehicleMovementData: vehicleMovementData,
    tooltip: tooltipText,
    tooltipAlwaysOn: false,
  };

  return vehicleData;
}

export function animateVehicle(
  vehicleData: VehicleData,
  elapsedTime: number,
  refPoint: { x: number; y: number }
) {
  const vehicle = vehicleData.vehicle;
  const vehicleMovementData = vehicleData.vehicleMovementData;

  if (elapsedTime < vehicleMovementData[0][4]) {
    return;
  } else if (
    elapsedTime > vehicleMovementData[vehicleMovementData.length - 1][4]
  ) {
    return;
  }

  let currentIndex = 0;
  for (let i = 0; i < vehicleMovementData.length - 1; i++) {
    if (
      vehicleMovementData[i][4] <= elapsedTime &&
      elapsedTime < vehicleMovementData[i + 1][4]
    ) {
      currentIndex = i;
      break;
    }
  }

  const nextIndex = currentIndex + 1;
  const [lat1, lon1, elevation1] = vehicleMovementData[currentIndex];
  const [lat2, lon2, elevation2] = vehicleMovementData[nextIndex];
  const time1 = vehicleMovementData[currentIndex][4];
  const time2 = vehicleMovementData[nextIndex][4];

  const currentProgress = (elapsedTime - time1) / (time2 - time1);

  // Interpolate position
  const pos1 = latLonToWebMercator(lat1, lon1);
  const pos2 = latLonToWebMercator(lat2, lon2);
  const x = THREE.MathUtils.lerp(pos1.x, pos2.x, currentProgress);
  const z = THREE.MathUtils.lerp(pos1.y, pos2.y, currentProgress);

  const scale = 0.05;
  const elevationScale = 0.05;
  const y =
    THREE.MathUtils.lerp(elevation1, elevation2, currentProgress) *
    elevationScale;

  vehicle.position.set(
    (x - refPoint.x) * scale,
    y + 0.1,
    (z - refPoint.y) * scale
  );

  // Set vehicle orientation
  const target = new THREE.Vector3(
    (pos2.x - refPoint.x) * scale,
    elevation2 * elevationScale + 0.1,
    (pos2.y - refPoint.y) * scale
  );
  vehicle.lookAt(target);
  vehicle.up.set(0, 1, 0);
  vehicle.rotateY(1.5 * Math.PI);

  vehicleData.currentPosition = vehicle.position.clone();
  vehicleData.currentTime = elapsedTime;

  vehicleData.speed = vehicleMovementData[currentIndex][6];

  vehicleData.currentLat = THREE.MathUtils.lerp(lat1, lat2, currentProgress);
  vehicleData.currentLon = THREE.MathUtils.lerp(lon1, lon2, currentProgress);
}
