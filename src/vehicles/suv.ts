import * as THREE from "three";

export function createSuv(
  scene: THREE.Scene,
  scaleFactor: number
): THREE.Group {
  const suv = new THREE.Group();

  const wheel_geometry = new THREE.CylinderGeometry(0.5, 0.5, 0.25, 12);
  const wheel_material = new THREE.MeshStandardMaterial({ color: 0x333333 });
  const wheels = [
    new THREE.Mesh(wheel_geometry, wheel_material),
    new THREE.Mesh(wheel_geometry, wheel_material),
    new THREE.Mesh(wheel_geometry, wheel_material),
    new THREE.Mesh(wheel_geometry, wheel_material),
  ];

  wheels[0].position.set(0.5, 0.5, 0);
  wheels[1].position.set(2.5, 0.5, 0);
  wheels[2].position.set(0.5, 0.5, 2);
  wheels[3].position.set(2.5, 0.5, 2);

  wheels.forEach((wheel) => {
    wheel.rotateX(Math.PI / 2);
    suv.add(wheel);
  });

  const chassis_length = 2.25,
    chassis_width = 0.03;

  const chassis_shape = new THREE.Shape();
  chassis_shape.moveTo(0, 0);
  chassis_shape.lineTo(0, chassis_width);
  chassis_shape.lineTo(chassis_length, chassis_width);
  chassis_shape.lineTo(chassis_length, 0);
  chassis_shape.lineTo(0, 0);

  const chassis_extrudeSettings = {
    steps: 50,
    depth: 0.001,
    bevelEnabled: true,
    bevelThickness: 1,
    bevelSize: 0.5,
    bevelOffset: 0,
    bevelSegments: 2,
  };

  const chassis_geometry = new THREE.ExtrudeGeometry(
    chassis_shape,
    chassis_extrudeSettings
  );
  const chassis_material = new THREE.MeshLambertMaterial({ color: 0x0000ff });
  const chassis = new THREE.Mesh(chassis_geometry, chassis_material);
  chassis.position.set(0.5, 0.75, 1);
  suv.add(chassis);

  const cabin_length = 0.75,
    cabin_width = 0.03;

  const cabin_shape = new THREE.Shape();
  cabin_shape.moveTo(0, 0);
  cabin_shape.lineTo(0, cabin_width);
  cabin_shape.lineTo(cabin_length, cabin_width);
  cabin_shape.lineTo(cabin_length, 0);
  cabin_shape.lineTo(0, 0);

  const cabin_extrudeSettings = {
    steps: 50,
    depth: 0.001,
    bevelEnabled: true,
    bevelThickness: 1,
    bevelSize: 0.5,
    bevelOffset: 0,
    bevelSegments: 2,
  };

  const cabin_geometry = new THREE.ExtrudeGeometry(
    cabin_shape,
    cabin_extrudeSettings
  );
  const cabin_material = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const cabin = new THREE.Mesh(cabin_geometry, cabin_material);
  cabin.position.set(1, 1.25, 1);
  suv.add(cabin);
  // Apply scaling to the entire car
  suv.scale.set(scaleFactor, scaleFactor, scaleFactor);
  // car.rotateY(Math.PI / 0.669);
  scene.add(suv);
  return suv;
}
