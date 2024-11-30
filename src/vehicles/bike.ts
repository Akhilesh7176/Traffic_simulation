import * as THREE from "three";

export function createBike(
  scene: THREE.Scene,
  scaleFactor: number
): THREE.Group {
  const bike = new THREE.Group();

  // Materials
  const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
  const chassisMaterial = new THREE.MeshLambertMaterial({ color: 0xff0000 });
  const chainMaterial = new THREE.MeshStandardMaterial({ color: 0xd3d3d3 });
  const lightMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
  const handleMaterial = new THREE.MeshStandardMaterial({ color: 0xd3d3d3 });

  // Geometries
  const wheelGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.25, 12);
  const lightGeometry = new THREE.SphereGeometry(0.2, 10, 20);
  const handleGeometry = new THREE.CylinderGeometry(0.05, 0.05, 1, 40);

  // Helper function to create rectangle shapes
  const createRectangleShape = (width: number, height: number) => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(0, height);
    shape.lineTo(width, height);
    shape.lineTo(width, 0);
    shape.lineTo(0, 0);
    return shape;
  };

  // Chassis
  const chassisShape = createRectangleShape(0.2, 0.2);
  const chassisGeometry = new THREE.ExtrudeGeometry(chassisShape, {
    steps: 4,
    depth: 0.25,
    bevelEnabled: true,
    bevelThickness: 0.5,
    bevelSize: 0.1,
    bevelOffset: 0,
    bevelSegments: 2,
  });

  // Chain
  const chainShape = createRectangleShape(0.2, 0.2);
  const chainGeometry = new THREE.ExtrudeGeometry(chainShape, {
    steps: 4,
    depth: 1,
    bevelEnabled: true,
    bevelThickness: 0.75,
    bevelSize: 0.05,
    bevelOffset: 0,
    bevelSegments: 1,
  });

  // Function to create wheels
  const createWheel = (position: THREE.Vector3) => {
    const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
    wheel.position.copy(position);
    wheel.rotateX(Math.PI / 2);
    return wheel;
  };

  // Add wheels
  bike.add(createWheel(new THREE.Vector3(0.5, 0.5, 0)));
  bike.add(createWheel(new THREE.Vector3(2.5, 0.5, 0)));

  // Add chassis
  const chassis = new THREE.Mesh(chassisGeometry, chassisMaterial);
  chassis.position.set(1.4, 1, 0.1);
  chassis.rotateY(Math.PI / 2);
  bike.add(chassis);

  // Add chain
  const chain = new THREE.Mesh(chainGeometry, chainMaterial);
  chain.position.set(1, 0.3, 0.1);
  chain.rotateY(Math.PI / 2);
  bike.add(chain);

  // Add light
  const light = new THREE.Mesh(lightGeometry, lightMaterial);
  light.position.set(2.4, 1.3, 0);
  bike.add(light);

  // Add handle
  const handle = new THREE.Mesh(handleGeometry, handleMaterial);
  handle.position.set(2.1, 1.5, 0);
  handle.rotateX(Math.PI / 2);
  bike.add(handle);

  // Scale and add to scene
  bike.scale.set(scaleFactor, scaleFactor, scaleFactor);
  scene.add(bike);

  return bike;
}
