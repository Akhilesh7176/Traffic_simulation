import * as THREE from "three";
import { latLonToWebMercator } from "./create_roads_func.ts";

class CustomCurve extends THREE.Curve<THREE.Vector3> {
  constructor(public points: THREE.Vector3[]) {
    super();
  }

  getPoint(t: number): THREE.Vector3 {
    const index = (this.points.length - 1) * t;
    const startIndex = Math.floor(index);
    const endIndex = Math.ceil(index);
    return new THREE.Vector3().lerpVectors(
      this.points[startIndex],
      this.points[endIndex],
      index - startIndex
    );
  }
}

export class WayRenderer {
  constructor(
    private parent: THREE.Group,
    private refPoint: { x: number; y: number },
    public scaleFactor = 0.05,
    private extrudeMaterial: THREE.Material = new THREE.MeshLambertMaterial({
      color: 0x8c8a84,
      wireframe: false,
    }),
    public offsetX = 0,
    private width = 0.1,
    private height = 0.5
  ) {}

  private convertTo3DPoints(
    way: [number, number, number][][]
  ): THREE.Vector3[] {
    return way.flat().map(([lat, lon, elevation]) => {
      const mercator = latLonToWebMercator(lat, lon);
      return new THREE.Vector3(
        (mercator.x - this.refPoint.x) * this.scaleFactor + this.offsetX,
        elevation * this.scaleFactor,
        (mercator.y - this.refPoint.y) * this.scaleFactor
      );
    });
  }

  private addExtrudedShape(points: THREE.Vector3[]): void {
    const curve = new CustomCurve(points);

    const shape = new THREE.Shape();
    const width = this.width;
    const height = this.height;

    shape.moveTo(-width, -height);
    shape.lineTo(-width, height);
    shape.lineTo(width, height);
    shape.lineTo(width, -height);
    shape.lineTo(-width, -height);

    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      steps: 200,
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.05,
      bevelSegments: 10,
      extrudePath: curve,
    };

    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    const mesh = new THREE.Mesh(geometry, this.extrudeMaterial);
    this.parent.add(mesh);
  }

  public renderWay(way: [number, number, number][][]): void {
    const points = this.convertTo3DPoints(way);
    this.addExtrudedShape(points);
  }
}
