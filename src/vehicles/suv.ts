import * as THREE from "three";
import { createWheels, createChassis, createCabin } from "./vehicle_utils.ts";

export function createSuv(
  scene: THREE.Scene,
  scaleFactor: number
): THREE.Group {
  const suv = new THREE.Group();

  const wheelPositions = [
    new THREE.Vector3(0.5, 0.5, 0),
    new THREE.Vector3(2.5, 0.5, 0),
    new THREE.Vector3(0.5, 0.5, 2),
    new THREE.Vector3(2.5, 0.5, 2),
  ];

  const wheels = createWheels(wheelPositions);
  wheels.forEach((wheel) => suv.add(wheel));

  const chassis = createChassis(2.25, 0.03, 0x0000ff);
  chassis.position.set(0.5, 0.75, 1);
  suv.add(chassis);

  const cabin = createCabin(0.75, 0.03, 0xffffff);
  cabin.position.set(1, 1.25, 1);
  suv.add(cabin);

  suv.scale.set(scaleFactor, scaleFactor, scaleFactor);
  scene.add(suv);
  return suv;
}
