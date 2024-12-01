import * as THREE from "three";
import { createWheels, createChassis, createCabin } from "./vehicle_utils.ts";

export function createTruck(
  scene: THREE.Scene,
  scaleFactor: number
): THREE.Group {
  const truck = new THREE.Group();

  const wheelPositions = [
    new THREE.Vector3(0.5, 0.5, 0),
    new THREE.Vector3(2.5, 0.5, 0),
    new THREE.Vector3(0.5, 0.5, 2),
    new THREE.Vector3(2.5, 0.5, 2),
    new THREE.Vector3(3.75, 0.5, 0),
    new THREE.Vector3(3.75, 0.5, 2),
    new THREE.Vector3(5, 0.5, 0),
    new THREE.Vector3(5, 0.5, 2),
  ];

  const wheels = createWheels(wheelPositions);
  wheels.forEach((wheel) => truck.add(wheel));

  const chassisExtrudeSettings = {
    bevelSize: 0.9,
  };

  const chassis = createChassis(3, 0.01, 0xffffff, chassisExtrudeSettings);
  chassis.position.set(0.5, 1, 1);
  truck.add(chassis);

  const cabinExtrudeSettings = {
    bevelSize: 0.6,
  };

  const cabin = createCabin(0.2, 0.01, 0xff0000, cabinExtrudeSettings);
  cabin.position.set(5, 1.3, 1);
  truck.add(cabin);

  truck.scale.set(scaleFactor, scaleFactor, scaleFactor);
  scene.add(truck);
  return truck;
}
