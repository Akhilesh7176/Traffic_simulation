import * as THREE from "three";

export const latLonToWebMercator = (
  lat: number,
  lon: number
): { x: number; y: number } => {
  const R = 6378137; // Earth's radius in meters
  const x = R * Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 180 / 2));
  const y = R * lon * (Math.PI / 180);
  return { x, y };
};

// Function to create lane markings at a specific 3D point and rotate it
const create_lane = (
  position: THREE.Vector3,
  width = 0.2,
  height = 0.2,
  depth = 0.01,
  color = 0xf2e9ea
): THREE.Mesh => {
  const geometry = new THREE.BoxGeometry(width, height, depth);
  const material = new THREE.MeshBasicMaterial({ color });
  const lane = new THREE.Mesh(geometry, material);
  lane.position.copy(position);
  lane.rotation.y = Math.PI / 2.825;
  return lane;
};

export const addLaneMarkingsToRoad = (
  group: THREE.Group,
  laneCoords: [number, number, number][],
  offsets: number[],
  refPoint: any,
  wayRenderer_road: any
) => {
  laneCoords.forEach(([lat, lon, elevation]) => {
    const mercator = latLonToWebMercator(lat, lon);
    const x =
      (mercator.x - refPoint.x) * wayRenderer_road.scaleFactor +
      wayRenderer_road.offsetX;
    const y = elevation * wayRenderer_road.scaleFactor;
    const z = (mercator.y - refPoint.y) * wayRenderer_road.scaleFactor;

    offsets.forEach((offset) => {
      const position = new THREE.Vector3(x + offset, y, z);
      group.add(create_lane(position));
    });
  });
};
