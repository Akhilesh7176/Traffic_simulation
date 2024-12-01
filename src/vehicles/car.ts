import * as THREE from "three";
import { createWheels, createChassis, createCabin } from "./vehicle_utils.ts";

export function createCar(
  scene: THREE.Scene,
  scaleFactor: number
): THREE.Group {
  const car = new THREE.Group();

  const wheelPositions = [
    new THREE.Vector3(0.5, 0.5, 0),
    new THREE.Vector3(2.5, 0.5, 0),
    new THREE.Vector3(0.5, 0.5, 2),
    new THREE.Vector3(2.5, 0.5, 2),
  ];

  const wheels = createWheels(wheelPositions);
  wheels.forEach((wheel) => car.add(wheel));

  const chassis = createChassis(2, 0.01, 0xff0000);
  chassis.position.set(0.5, 0.75, 1);
  car.add(chassis);

  const cabin = createCabin(0.5, 0.01, 0xffffff);
  cabin.position.set(1, 1.25, 1);
  car.add(cabin);

  car.scale.set(scaleFactor, scaleFactor, scaleFactor);
  scene.add(car);
  return car;
}
