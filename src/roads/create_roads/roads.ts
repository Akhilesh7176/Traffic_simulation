import * as THREE from "three";
import {
  curve_coords,
  lane_coords_left,
  lane_coords_right,
} from "../road_coordinates/road_coordinates.ts";
import { addLaneMarkingsToRoad } from "./create_roads_func.ts";
import { WayRenderer } from "./create_ways_curves.ts";

export function create_roads(refPoint: { x: number; y: number }): THREE.Group {
  const roads = new THREE.Group();
  const road1 = new THREE.Group();
  const road2 = new THREE.Group();

  roads.add(road1);
  roads.add(road2);

  const wayRenderer_road1 = new WayRenderer(
    road1,
    refPoint,
    0.05,
    new THREE.MeshLambertMaterial({ color: 0x8c8a84 }),
    0,
    0.1,
    0.5
  );

  const wayRenderer_road2 = new WayRenderer(
    road2,
    refPoint,
    0.05,
    new THREE.MeshLambertMaterial({ color: 0x8c8a84 }),
    0,
    0.1,
    0.5
  );

  const laneOffsetsRoad1 = [0.3134091, 0.044773, -0.223863];
  const laneOffsetsRoad2 = [0.223864, 0, -0.268636];

  addLaneMarkingsToRoad(
    road1,
    lane_coords_right,
    laneOffsetsRoad1,
    refPoint,
    wayRenderer_road1
  );

  addLaneMarkingsToRoad(
    road2,
    lane_coords_left,
    laneOffsetsRoad2,
    refPoint,
    wayRenderer_road2
  );

  const midIndex = Math.floor(curve_coords.length / 2);
  const curve_coords_road1 = curve_coords.slice(0, midIndex);
  const curve_coords_road2 = curve_coords.slice(midIndex);

  curve_coords_road1.forEach((way) => wayRenderer_road1.renderWay(way));
  curve_coords_road2.forEach((way) => wayRenderer_road2.renderWay(way));

  roads.rotateY(THREE.MathUtils.degToRad(0));
  return roads;
}
