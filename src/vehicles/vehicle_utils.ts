import * as THREE from "three";

const wheelGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.25, 12);
const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });

export function createWheels(wheelPositions: THREE.Vector3[]): THREE.Mesh[] {
  return wheelPositions.map((position) => {
    const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
    wheel.position.copy(position);
    wheel.rotateX(Math.PI / 2);
    return wheel;
  });
}

export function createChassis(
  length: number,
  width: number,
  color: number,
  extrudeSettings?: THREE.ExtrudeGeometryOptions
): THREE.Mesh {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(0, width);
  shape.lineTo(length, width);
  shape.lineTo(length, 0);
  shape.lineTo(0, 0);

  const defaultSettings: THREE.ExtrudeGeometryOptions = {
    steps: 50,
    depth: 0.001,
    bevelEnabled: true,
    bevelThickness: 1,
    bevelSize: 0.5,
    bevelOffset: 0,
    bevelSegments: 2,
  };

  const geometry = new THREE.ExtrudeGeometry(
    shape,
    extrudeSettings || defaultSettings
  );
  const material = new THREE.MeshLambertMaterial({ color });
  return new THREE.Mesh(geometry, material);
}

export function createCabin(
  length: number,
  width: number,
  color: number,
  extrudeSettings?: THREE.ExtrudeGeometryOptions
): THREE.Mesh {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(0, width);
  shape.lineTo(length, width);
  shape.lineTo(length, 0);
  shape.lineTo(0, 0);

  const defaultSettings: THREE.ExtrudeGeometryOptions = {
    steps: 50,
    depth: 0.001,
    bevelEnabled: true,
    bevelThickness: 1,
    bevelSize: 0.5,
    bevelOffset: 0,
    bevelSegments: 2,
  };

  const geometry = new THREE.ExtrudeGeometry(
    shape,
    extrudeSettings || defaultSettings
  );
  const material = new THREE.MeshLambertMaterial({ color });
  return new THREE.Mesh(geometry, material);
}
