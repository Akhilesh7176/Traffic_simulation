import * as THREE from "three";
import "./style.css";
import Stats from "three/addons/libs/stats.module.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";

// import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  CSS2DRenderer,
  CSS2DObject,
} from "three/examples/jsm/renderers/CSS2DRenderer.js";
// Post-processing imports
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { BokehPass } from "three/examples/jsm/postprocessing/BokehPass.js";
import { createBike } from "./vehicles/bike.ts";
import { createCar } from "./vehicles/car.ts";
import { createTruck } from "./vehicles/truck.ts";
import { createSuv } from "./vehicles/suv.ts";
import { create_roads } from "./roads/create_roads/roads.ts";
import { changed_utm_coords } from "./roads/road_coordinates/utm_lat_long.ts";
import { getUniqueItemsById } from "./unique_func.ts";

// Import Chart.js
import { Chart, registerables } from "chart.js";
Chart.register(...registerables);

const pauseButton = document.createElement("button");
pauseButton.textContent = "Pause";
pauseButton.style.position = "absolute";
pauseButton.style.top = "10px";
pauseButton.style.left = "10px";
document.body.appendChild(pauseButton);
let isPaused = false;
let totalElapsedTime = 0;
let lastTime = Date.now();
// let animationFrameId: number;

const scene = new THREE.Scene();
scene.add(new THREE.GridHelper(150));
scene.add(new THREE.AxesHelper(4));
scene.background = new THREE.Color(0xb7ebbd);

const clock = new THREE.Clock();

const camera = new THREE.PerspectiveCamera(
  60, // Reduced FOV for a more cinematic look
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
// Initial camera position (optional, since the camera will follow the vehicle)
camera.position.set(0, 5, 10);
camera.lookAt(0, 0, 0);

const gui = new GUI();

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2; // Adjust exposure as needed
document.body.appendChild(renderer.domElement);
// Post-processing setup
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const bokehPass = new BokehPass(scene, camera, {
  focus: 10.0, // Adjust focus distance
  aperture: 0.00015, // Smaller aperture for greater depth of field effect
  maxblur: 0.01, // Maximum blur amount
});

composer.addPass(bokehPass);

// Create CSS2DRenderer for labels
const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(window.innerWidth, window.innerHeight);
labelRenderer.domElement.style.position = "absolute";
labelRenderer.domElement.style.top = "0";
labelRenderer.domElement.style.pointerEvents = "none"; // Allow mouse events to pass through
document.body.appendChild(labelRenderer.domElement);

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
  // Update composer size on resize
  composer.setSize(window.innerWidth, window.innerHeight);
});

const data = { color: 0x00ff00, lightColor: 0xffffff };
// Directional light setup

const directionalLight = new THREE.DirectionalLight(
  data.lightColor,
  1.25 * Math.PI
);
directionalLight.position.set(3, 3, 3);
scene.add(directionalLight);

const directionalLightHelper = new THREE.DirectionalLightHelper(
  directionalLight
);
directionalLightHelper.visible = false;
scene.add(directionalLightHelper);

// const directionalLightFolder = gui.addFolder("DirectionalLight");
// directionalLightFolder.add(directionalLight, "visible");
// directionalLightFolder.addColor(data, "lightColor").onChange(() => {
//   directionalLight.color.set(data.lightColor);
// });
// directionalLightFolder.add(directionalLight, "intensity", 0, Math.PI * 10);

// const controls = new OrbitControls(camera, renderer.domElement);
// controls.update();

// const stats = new Stats();
// document.body.appendChild(stats.dom);

// const cameraFolder = gui.addFolder("Camera");
// cameraFolder.add(camera.position, "x", -10, 10);
// cameraFolder.add(camera.position, "y", -10, 10);
// cameraFolder.add(camera.position, "z", -10, 10);

// cameraFolder.open();

// Convert latitude and longitude to Web Mercator coordinates
function latLonToWebMercator(lat: number, lon: number) {
  const R = 6378137;
  const x = R * Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 180 / 2));
  const y = R * lon * (Math.PI / 180);
  return { x, y };
}

// Define a reference point using changed_utm_coords
const refPoint = latLonToWebMercator(
  changed_utm_coords[0][0],
  changed_utm_coords[0][1]
);
console.log(" Data output-", changed_utm_coords);
// Pass refPoint to create_roads
const roads = create_roads(refPoint);
scene.add(roads);

const flatPathData = changed_utm_coords;

// Function to animate vehicles
function animateVehicle(vehicleData: VehicleData, elapsedTime: number) {
  const vehicle = vehicleData.vehicle;
  const vehicleMovementData = vehicleData.vehicleMovementData;

  // Handle cases where the vehicle hasn't started moving or has finished moving
  if (elapsedTime < vehicleMovementData[0][4]) {
    // Vehicle hasn't started moving yet
    return;
  } else if (
    elapsedTime > vehicleMovementData[vehicleMovementData.length - 1][4]
  ) {
    // Vehicle has finished moving
    return;
  }

  // Find the current segment based on elapsedTime
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

  // Store current position and time in vehicleData
  vehicleData.currentPosition = vehicle.position.clone();
  vehicleData.currentTime = elapsedTime;

  // Update the speed from vehicleMovementData (index 6)
  vehicleData.speed = vehicleMovementData[currentIndex][6];

  // Store current latitude and longitude
  vehicleData.currentLat = THREE.MathUtils.lerp(lat1, lat2, currentProgress);
  vehicleData.currentLon = THREE.MathUtils.lerp(lon1, lon2, currentProgress);
}

interface VehicleData {
  vehicle_num: any;
  vehicle: THREE.Object3D;
  vehicleMovementData: any[];
  tooltip: string;
  currentPosition?: THREE.Vector3;
  currentTime?: number;
  speed?: number;
  tooltipAlwaysOn?: boolean;
  labelElement?: HTMLDivElement;
  labelObject?: CSS2DObject;
  legendItem?: HTMLDivElement;
  toggleButton?: HTMLButtonElement;
  infoText?: HTMLSpanElement;
  setTargetButton?: HTMLButtonElement;
  currentLat?: number;
  currentLon?: number;
}

const created_car: VehicleData[] = [];
const created_suv: VehicleData[] = [];
const created_bike: VehicleData[] = [];
const created_trucks: VehicleData[] = [];

// Map to store vehicle objects and their data
const vehicleDataMap = new Map<THREE.Object3D, VehicleData>();

function car_ani(id: any) {
  const vehicleMovementData = flatPathData.filter(
    (dataPoint) => dataPoint[3] === id
  );

  const tooltipText = `Car ${id}`;

  const vehicle = createCar(scene, 0.055);
  const vehicleData: VehicleData = {
    vehicle_num: id,
    vehicle: vehicle,
    vehicleMovementData: vehicleMovementData,
    tooltip: tooltipText,
    tooltipAlwaysOn: false,
  };

  created_car.push(vehicleData);
  vehicleDataMap.set(vehicle, vehicleData);
}

function suv_ani(id: any) {
  const vehicleMovementData = flatPathData.filter(
    (dataPoint) => dataPoint[3] === id
  );

  const tooltipText = `Suv ${id}`;

  const vehicle = createSuv(scene, 0.055);
  const vehicleData: VehicleData = {
    vehicle_num: id,
    vehicle: vehicle,
    vehicleMovementData: vehicleMovementData,
    tooltip: tooltipText,
    tooltipAlwaysOn: false,
  };

  created_suv.push(vehicleData);
  vehicleDataMap.set(vehicle, vehicleData);
}

function bike_ani(id: any) {
  const vehicleMovementData = flatPathData.filter(
    (dataPoint) => dataPoint[3] === id
  );

  const tooltipText = `Bike ${id}`;

  const vehicle = createBike(scene, 0.06);
  const vehicleData: VehicleData = {
    vehicle_num: id,
    vehicle: vehicle,
    vehicleMovementData: vehicleMovementData,
    tooltip: tooltipText,
    tooltipAlwaysOn: false,
  };

  created_bike.push(vehicleData);
  vehicleDataMap.set(vehicle, vehicleData);
}

function truck_ani(id: any) {
  const vehicleMovementData = flatPathData.filter(
    (dataPoint) => dataPoint[3] === id
  );

  const tooltipText = `Truck ${id}`;

  const vehicle = createTruck(scene, 0.065);
  const vehicleData: VehicleData = {
    vehicle_num: id,
    vehicle: vehicle,
    vehicleMovementData: vehicleMovementData,
    tooltip: tooltipText,
    tooltipAlwaysOn: false,
  };

  created_trucks.push(vehicleData);
  vehicleDataMap.set(vehicle, vehicleData);
}

// Use the function to get unique items
const uniqueFlatWaysCurves = getUniqueItemsById(flatPathData, 3);

uniqueFlatWaysCurves.forEach((item) => {
  const id = item[3];
  const type = item[5];
  if (type === "Car") {
    car_ani(id);
  }
  if (type === "Medium Vehicle") {
    suv_ani(id);
  }
  if (type === "Motorcycle") {
    bike_ani(id);
  }
  if (type === "Heavy Vehicle") {
    truck_ani(id);
  }
});

// Now, assign the target vehicle AFTER vehicles are created
let targetVehicleData: VehicleData | undefined;

// Ensure there is at least one vehicle to follow
if (created_car.length > 0) {
  targetVehicleData = created_car[0];
} else if (created_bike.length > 0) {
  targetVehicleData = created_bike[0];
} else if (created_trucks.length > 0) {
  targetVehicleData = created_trucks[0];
} else if (created_suv.length > 0) {
  targetVehicleData = created_suv[0];
} else {
  console.error("No vehicles available for camera to follow.");
}

// Create the legend element and style it
const legend = document.createElement("div");
legend.className = "legend";
document.body.appendChild(legend);

// Map to store legend items
const legendItemsMap = new Map<any, HTMLDivElement>();

function updateLegend() {
  const vehicleList = [
    ...created_car,
    ...created_bike,
    ...created_trucks,
    ...created_suv,
  ];

  for (let i = 0; i < vehicleList.length; i++) {
    const vehicleData = vehicleList[i];
    const id = vehicleData.vehicle_num;
    const type = vehicleData.tooltip;

    let legendItem = legendItemsMap.get(id);

    if (!legendItem) {
      // Create legend item
      legendItem = document.createElement("div");
      legendItem.className = "legend-item";

      const title = document.createElement("strong");
      title.textContent = type;
      legendItem.appendChild(title);
      legendItem.appendChild(document.createElement("br"));

      // Create toggle button
      const toggleButton = document.createElement("button");
      toggleButton.textContent = vehicleData.tooltipAlwaysOn ? "Hide" : "Show";
      toggleButton.addEventListener("click", function () {
        vehicleData.tooltipAlwaysOn = !vehicleData.tooltipAlwaysOn;
        toggleButton.textContent = vehicleData.tooltipAlwaysOn
          ? "Hide"
          : "Show";

        if (vehicleData.tooltipAlwaysOn) {
          // Create the label
          if (!vehicleData.labelElement) {
            const labelDiv = document.createElement("div");
            labelDiv.className = "label";
            labelDiv.textContent = `${vehicleData.tooltip}`;
            vehicleData.labelElement = labelDiv;

            const labelObject = new CSS2DObject(labelDiv);
            labelObject.position.set(0, 1, 0); // Adjust label position above vehicle
            vehicleData.labelObject = labelObject;
            vehicleData.vehicle.add(labelObject);
          }
        } else {
          // Remove the label
          if (vehicleData.labelObject) {
            vehicleData.vehicle.remove(vehicleData.labelObject);
            vehicleData.labelObject = undefined;
            vehicleData.labelElement = undefined;
          }
        }
      });
      legendItem.appendChild(toggleButton);
      legendItem.appendChild(document.createElement("br"));

      // Create speed/status text
      const infoText = document.createElement("span");
      legendItem.appendChild(infoText);
      legendItem.appendChild(document.createElement("br"));

      // Create 'Set as Target' button
      const setTargetButton = document.createElement("button");
      setTargetButton.textContent =
        vehicleData === targetVehicleData ? "Target Vehicle" : "Set as Target";
      setTargetButton.disabled = vehicleData === targetVehicleData;
      setTargetButton.addEventListener("click", function () {
        targetVehicleData = vehicleData;
        updateLegend(); // Update legend to reflect the new target

        // Update the chart with the new vehicle's path
        const vehicleMovementData = targetVehicleData.vehicleMovementData;
        const dataPoints = vehicleMovementData.map((item) => ({
          lat: item[0],
          lon: item[1],
        }));
        chart.data.datasets[0].data = dataPoints.map((point) => ({
          x: point.lon,
          y: point.lat,
        }));

        // Reset the marker dataset
        if (chart.data.datasets.length > 1) {
          chart.data.datasets[1].data = [];
        }
        chart.update();
      });
      legendItem.appendChild(setTargetButton);
      legendItem.appendChild(document.createElement("br"));

      // Store references
      vehicleData.legendItem = legendItem;
      vehicleData.toggleButton = toggleButton;
      vehicleData.infoText = infoText;
      vehicleData.setTargetButton = setTargetButton; // Store the button

      legend.appendChild(legendItem);
      legend.appendChild(document.createElement("hr"));

      legendItemsMap.set(id, legendItem);
    }

    // Update the infoText
    const infoText: any = vehicleData.infoText;
    if (vehicleData.currentPosition) {
      const speed = vehicleData.speed?.toFixed(2);
      infoText.textContent = `Speed: ${speed} m/s`;
    } else {
      infoText.textContent =
        "Status: " +
        (totalElapsedTime < vehicleData.vehicleMovementData[0][4]
          ? "Not started"
          : "Finished");
    }

    // Update the toggle button text
    vehicleData.toggleButton!.textContent = vehicleData.tooltipAlwaysOn
      ? "Hide"
      : "Show";
    // Update 'Set as Target' button
    vehicleData.setTargetButton!.textContent =
      vehicleData === targetVehicleData ? "Target Vehicle" : "Set as Target";
    vehicleData.setTargetButton!.disabled = vehicleData === targetVehicleData;
  }
}

// Create the plot container and canvas
const plotContainer = document.createElement("div");
plotContainer.id = "plot-container";
plotContainer.style.position = "absolute";
plotContainer.style.bottom = "10px";
plotContainer.style.right = "10px";
plotContainer.style.width = "300px";
plotContainer.style.height = "300px";
plotContainer.style.backgroundColor = "#fff";
plotContainer.style.border = "1px solid #ccc";
plotContainer.style.padding = "10px";
plotContainer.style.boxShadow = "0 2px 5px rgba(0, 0, 0, 0.3)";
document.body.appendChild(plotContainer);

const plotCanvas = document.createElement("canvas");
plotCanvas.id = "plot-canvas";
plotCanvas.width = 280; // Slightly less than container width to account for padding
plotCanvas.height = 280;
plotContainer.appendChild(plotCanvas);

// Variables to store mouse positions
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let containerStartX = 0;
let containerStartY = 0;

// Add event listeners to the plot container
plotContainer.addEventListener("mousedown", onMouseDown);
plotContainer.addEventListener("mouseup", onMouseUp);
plotContainer.addEventListener("mousemove", onMouseMove);

function onMouseDown(event: MouseEvent) {
  isDragging = true;
  dragStartX = event.clientX;
  dragStartY = event.clientY;

  // Get the current position of the container
  const rect = plotContainer.getBoundingClientRect();
  containerStartX = rect.left;
  containerStartY = rect.top;

  // Bring the plot container to the front
  plotContainer.style.zIndex = "1000";
}

function onMouseMove(event: MouseEvent) {
  if (isDragging) {
    // Calculate the new position
    const deltaX = event.clientX - dragStartX;
    const deltaY = event.clientY - dragStartY;

    // Update the position of the container
    plotContainer.style.left = containerStartX + deltaX + "px";
    plotContainer.style.top = containerStartY + deltaY + "px";
  }
}

function onMouseUp() {
  isDragging = false;
  plotContainer.style.zIndex = "10"; // Reset z-index after dragging
}
// Attach events to the plot container
plotContainer.addEventListener("mousedown", onMouseDown);
document.addEventListener("mousemove", onMouseMove);
document.addEventListener("mouseup", onMouseUp);
// Initialize the chart
let chart: Chart;
if (targetVehicleData) {
  const vehicleMovementData = targetVehicleData.vehicleMovementData;
  const dataPoints = vehicleMovementData.map((item) => ({
    lat: item[0],
    lon: item[1],
  }));

  const ctx = plotCanvas.getContext("2d");
  chart = new Chart(ctx!, {
    type: "scatter",
    data: {
      datasets: [
        {
          label: "Vehicle Path",
          data: dataPoints.map((point) => ({ x: point.lon, y: point.lat })),
          borderColor: "blue",
          backgroundColor: "blue",
          showLine: true,
          fill: false,
          pointRadius: 0,
        },
      ],
    },
    options: {
      responsive: false,
      scales: {
        x: {
          type: "linear",
          position: "bottom",
          title: { display: true, text: "Longitude" },
        },
        y: {
          type: "linear",
          title: { display: true, text: "Latitude" },
        },
      },
    },
  });
}

let animationFrameId: number;
function animate() {
  animationFrameId = requestAnimationFrame(animate);
  const currentTime = Date.now();
  let deltaTime = 0;

  if (!isPaused) {
    deltaTime = (currentTime - lastTime) / 1000; // Convert milliseconds to seconds
    totalElapsedTime += deltaTime;
  }

  lastTime = currentTime;

  const elapsedTime = totalElapsedTime;

  // Animate cars
  for (let i = 0; i < created_car.length; i++) {
    const car = created_car[i];
    animateVehicle(car, elapsedTime);
  }

  // Animate bikes
  for (let i = 0; i < created_bike.length; i++) {
    const bike = created_bike[i];
    animateVehicle(bike, elapsedTime);
  }

  // Animate trucks
  for (let i = 0; i < created_trucks.length; i++) {
    const truck = created_trucks[i];
    animateVehicle(truck, elapsedTime);
  }
  for (let i = 0; i < created_suv.length; i++) {
    const suv = created_suv[i];
    animateVehicle(suv, elapsedTime);
  }

  // Update legend
  updateLegend();

  // Update labels for vehicles with 'tooltipAlwaysOn'
  const vehicleList = [
    ...created_car,
    ...created_bike,
    ...created_trucks,
    ...created_suv,
  ];
  for (let i = 0; i < vehicleList.length; i++) {
    const vehicleData = vehicleList[i];
    if (vehicleData.tooltipAlwaysOn && vehicleData.labelElement) {
      let statusText = "";
      if (vehicleData.speed === undefined) {
        // Vehicle hasn't started or has finished
        if (elapsedTime < vehicleData.vehicleMovementData[0][4]) {
          statusText = "Not started";
        } else if (
          elapsedTime >
          vehicleData.vehicleMovementData[
            vehicleData.vehicleMovementData.length - 1
          ][4]
        ) {
          statusText = "Finished";
        }
      } else {
        // Vehicle is moving
        statusText = `Speed: ${vehicleData.speed?.toFixed(2)} m/s`;
      }
      vehicleData.labelElement.textContent = `${vehicleData.tooltip}\n${statusText}`;
    }
  }

  // Update camera position to follow the target vehicle
  if (targetVehicleData && targetVehicleData.vehicle) {
    const vehicle = targetVehicleData.vehicle;
    const vehiclePosition = vehicle.position.clone();
    const vehicleDirection = new THREE.Vector3();
    vehicle.getWorldDirection(vehicleDirection);

    // Calculate camera offset
    const cameraOffset = vehicleDirection.clone().multiplyScalar(-5); // Distance behind the vehicle
    cameraOffset.y += 2; // Height above the vehicle

    // Set camera position and orientation
    const cameraPosition = vehiclePosition.clone().add(cameraOffset);
    camera.position.lerp(cameraPosition, 0.2); // Smooth camera movement
    camera.lookAt(vehiclePosition);
  }

  // Update the marker on the chart
  if (
    targetVehicleData &&
    targetVehicleData.currentLat !== undefined &&
    targetVehicleData.currentLon !== undefined
  ) {
    const currentLat = targetVehicleData.currentLat;
    const currentLon = targetVehicleData.currentLon;

    // Update the marker on the chart
    if (chart.data.datasets.length > 1) {
      chart.data.datasets[1].data = [{ x: currentLon, y: currentLat }];
    } else {
      chart.data.datasets.push({
        label: "Current Position",
        data: [{ x: currentLon, y: currentLat }],
        borderColor: "red",
        backgroundColor: "red",
        pointRadius: 5,
        showLine: false,
      });
    }
    chart.update();
  }

  composer.render();
  labelRenderer.render(scene, camera);
}

pauseButton.addEventListener("click", () => {
  isPaused = !isPaused;
  if (isPaused) {
    pauseButton.textContent = "Resume";
  } else {
    pauseButton.textContent = "Pause";
    lastTime = Date.now();
  }
});
pauseButton.style.position = "absolute";
pauseButton.style.top = "375px";
pauseButton.style.left = "87.5%";
pauseButton.style.padding = "10px 20px";
pauseButton.style.fontSize = "16px";
pauseButton.style.backgroundColor = "#ffffff";
pauseButton.style.border = "1px solid #ccc";
pauseButton.style.borderRadius = "5px";
pauseButton.style.cursor = "pointer";
pauseButton.style.boxShadow = "0 2px 5px rgba(0, 0, 0, 0.3)";
// Variables for dragging state
let isDraggingPause = false;
let pauseStartX = 0;
let pauseStartY = 0;
let pauseTranslateX = 0;
let pauseTranslateY = 0;

pauseButton.style.transform = "translate3d(0px, 0px, 0)";

pauseButton.addEventListener("mousedown", onPauseMouseDown);

function onPauseMouseDown(event: MouseEvent) {
  isDraggingPause = true;
  pauseStartX = event.clientX - pauseTranslateX;
  pauseStartY = event.clientY - pauseTranslateY;

  document.addEventListener("mousemove", onPauseMouseMove);
  document.addEventListener("mouseup", onPauseMouseUp);
}

function onPauseMouseMove(event: MouseEvent) {
  if (isDraggingPause) {
    pauseTranslateX = event.clientX - pauseStartX;
    pauseTranslateY = event.clientY - pauseStartY;

    pauseButton.style.transform = `translate3d(${pauseTranslateX}px, ${pauseTranslateY}px, 0)`;
  }
}

function onPauseMouseUp() {
  if (isDraggingPause) {
    isDraggingPause = false;
    document.removeEventListener("mousemove", onPauseMouseMove);
    document.removeEventListener("mouseup", onPauseMouseUp);
  }
}

// Create the 'Image' button
const imageButton = document.createElement("button");
imageButton.textContent = "Image";
imageButton.style.position = "absolute";
imageButton.style.top = "10px";
imageButton.style.left = "80px"; // Adjust the position as needed
// Style the button
imageButton.style.padding = "10px 20px";
imageButton.style.fontSize = "16px";
imageButton.style.backgroundColor = "#ffffff";
imageButton.style.border = "1px solid #ccc";
imageButton.style.borderRadius = "5px";
imageButton.style.cursor = "pointer";
imageButton.style.boxShadow = "0 2px 5px rgba(0, 0, 0, 0.3)";

document.body.appendChild(imageButton);

imageButton.addEventListener("click", () => {
  if (!targetVehicleData || !targetVehicleData.vehicle) {
    alert("No target vehicle selected.");
    return;
  }

  // Save the current camera position and orientation
  const originalCameraPosition = camera.position.clone();
  const originalCameraQuaternion = camera.quaternion.clone();

  // Position the camera inside the vehicle (driver's seat position)
  // Adjust these values based on your vehicle model dimensions
  const driverSeatPosition = new THREE.Vector3(-0.75, 0, 0.85); // X (left/right), Y (up/down), Z (front/back)

  // Get the vehicle's world position and orientation
  const vehicleWorldPosition = new THREE.Vector3();
  targetVehicleData.vehicle.getWorldPosition(vehicleWorldPosition);

  const vehicleWorldQuaternion = new THREE.Quaternion();
  targetVehicleData.vehicle.getWorldQuaternion(vehicleWorldQuaternion);

  // Compute the camera's position in world coordinates
  const cameraPosition = driverSeatPosition
    .clone()
    .applyQuaternion(vehicleWorldQuaternion)
    .add(vehicleWorldPosition);

  // Set the camera position and orientation
  camera.position.copy(cameraPosition);
  camera.quaternion.copy(vehicleWorldQuaternion);

  // Make the camera look forward (adjust as needed)
  camera.rotateY(Math.PI); // Rotate the camera to look forward

  // Update the camera
  camera.updateMatrixWorld();

  // Render the scene
  composer.render();
  labelRenderer.render(scene, camera);

  // Wait for the next animation frame to ensure the scene is updated
  requestAnimationFrame(() => {
    // Capture the screenshot
    renderer.domElement.toBlob((blob) => {
      if (blob) {
        // Create a link element to download the image
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "screenshot.png";
        link.click();

        // Optionally, revoke the object URL after some time
        setTimeout(() => {
          URL.revokeObjectURL(link.href);
        }, 100);
      } else {
        alert("Failed to capture screenshot.");
      }
    }, "image/png");

    // Reset the camera to its original position and orientation
    camera.position.copy(originalCameraPosition);
    camera.quaternion.copy(originalCameraQuaternion);
    camera.updateMatrixWorld();
  });
});
// Variables for dragging state
let isDraggingImage = false;
let imageStartX = 0;
let imageStartY = 0;
let imageTranslateX = 0;
let imageTranslateY = 0;

imageButton.style.transform = "translate3d(0px, 0px, 0)";

imageButton.addEventListener("mousedown", onImageMouseDown);

function onImageMouseDown(event: MouseEvent) {
  isDraggingImage = true;
  imageStartX = event.clientX - imageTranslateX;
  imageStartY = event.clientY - imageTranslateY;

  document.addEventListener("mousemove", onImageMouseMove);
  document.addEventListener("mouseup", onImageMouseUp);
}

function onImageMouseMove(event: MouseEvent) {
  if (isDraggingImage) {
    imageTranslateX = event.clientX - imageStartX;
    imageTranslateY = event.clientY - imageStartY;

    imageButton.style.transform = `translate3d(${imageTranslateX}px, ${imageTranslateY}px, 0)`;
  }
}

function onImageMouseUp() {
  if (isDraggingImage) {
    isDraggingImage = false;
    document.removeEventListener("mousemove", onImageMouseMove);
    document.removeEventListener("mouseup", onImageMouseUp);
  }
}

lastTime = Date.now();

animate();

// import * as THREE from "three";
// import "./style.css";
// import Stats from "three/addons/libs/stats.module.js";
// import { GUI } from "three/addons/libs/lil-gui.module.min.js";
// import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
// import {
//   CSS2DRenderer,
//   CSS2DObject,
// } from "three/examples/jsm/renderers/CSS2DRenderer.js";
// import { createBike } from "./bike.ts";
// import { createCar } from "./car.ts";
// import { createSuv } from "./suv.ts";
// import { createTruck } from "./truck.ts";
// import { create_roads } from "./roads.ts";
// import { changed_utm_coords } from "./utm_lat_long.ts";
// import { getUniqueItemsById } from "./unique_func.ts";
// const pauseButton = document.createElement("button");
// pauseButton.textContent = "Pause";
// pauseButton.style.position = "absolute";
// pauseButton.style.top = "10px";
// pauseButton.style.left = "10px";
// document.body.appendChild(pauseButton);
// let isPaused = false;
// let totalElapsedTime = 0;
// let lastTime = Date.now();
// let animationFrameId: number;

// const scene = new THREE.Scene();
// scene.add(new THREE.GridHelper(150));
// scene.add(new THREE.AxesHelper(4));
// scene.background = new THREE.Color(0xb7ebbd);
// // scene.background = new THREE.Color(0xffffff);

// const clock = new THREE.Clock();

// const camera = new THREE.PerspectiveCamera(
//   50,
//   window.innerWidth / window.innerHeight,
//   0.1,
//   1000
// );
// camera.position.set(-1, 3, 4);
// camera.lookAt(1, 0.5, 0.5);

// const gui = new GUI();

// const renderer = new THREE.WebGLRenderer({ antialias: true });
// renderer.setSize(window.innerWidth, window.innerHeight);
// document.body.appendChild(renderer.domElement);

// // Create CSS2DRenderer for labels
// const labelRenderer = new CSS2DRenderer();
// labelRenderer.setSize(window.innerWidth, window.innerHeight);
// labelRenderer.domElement.style.position = "absolute";
// labelRenderer.domElement.style.top = "0";
// labelRenderer.domElement.style.pointerEvents = "none"; // Allow mouse events to pass through
// document.body.appendChild(labelRenderer.domElement);

// window.addEventListener("resize", () => {
//   camera.aspect = window.innerWidth / window.innerHeight;
//   camera.updateProjectionMatrix();
//   renderer.setSize(window.innerWidth, window.innerHeight);
//   labelRenderer.setSize(window.innerWidth, window.innerHeight);
// });

// const data = { color: 0x00ff00, lightColor: 0xffffff };
// // Directional light setup

// const directionalLight = new THREE.DirectionalLight(
//   data.lightColor,
//   1.25 * Math.PI
// );
// directionalLight.position.set(3, 3, 3);
// scene.add(directionalLight);

// const directionalLightHelper = new THREE.DirectionalLightHelper(
//   directionalLight
// );
// directionalLightHelper.visible = false;
// scene.add(directionalLightHelper);

// const directionalLightFolder = gui.addFolder("DirectionalLight");
// directionalLightFolder.add(directionalLight, "visible");
// directionalLightFolder.addColor(data, "lightColor").onChange(() => {
//   directionalLight.color.set(data.lightColor);
// });
// directionalLightFolder.add(directionalLight, "intensity", 0, Math.PI * 10);

// const controls = new OrbitControls(camera, renderer.domElement);
// controls.update();

// const stats = new Stats();
// document.body.appendChild(stats.dom);

// const cameraFolder = gui.addFolder("Camera");
// cameraFolder.add(camera.position, "x", -10, 10);
// cameraFolder.add(camera.position, "y", -10, 10);
// cameraFolder.add(camera.position, "z", -10, 10);

// cameraFolder.open();

// // Convert latitude and longitude to Web Mercator coordinates
// function latLonToWebMercator(lat: number, lon: number) {
//   const R = 6378137;
//   const x = R * Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 180 / 2));
//   const y = R * lon * (Math.PI / 180);
//   return { x, y };
// }

// // Define a reference point using changed_utm_coords
// const refPoint = latLonToWebMercator(
//   changed_utm_coords[0][0],
//   changed_utm_coords[0][1]
// );
// // console.log(" Data ouput-", changed_utm_coords);
// // Pass refPoint to create_roads
// // const roads = create_roads(refPoint);
// const roads = create_roads(refPoint);
// scene.add(roads);

// const flatPathData = changed_utm_coords;

// // Function to animate vehicles
// function animateVehicle(vehicleData: VehicleData, elapsedTime: number) {
//   const vehicle = vehicleData.vehicle;
//   const vehicleMovementData = vehicleData.vehicleMovementData;

//   // Handle cases where the vehicle hasn't started moving or has finished moving
//   if (elapsedTime < vehicleMovementData[0][4]) {
//     // Vehicle hasn't started moving yet
//     return;
//   } else if (
//     elapsedTime > vehicleMovementData[vehicleMovementData.length - 1][4]
//   ) {
//     // Vehicle has finished moving
//     return;
//   }

//   // Find the current segment based on elapsedTime
//   let currentIndex = 0;
//   for (let i = 0; i < vehicleMovementData.length - 1; i++) {
//     if (
//       vehicleMovementData[i][4] <= elapsedTime &&
//       elapsedTime < vehicleMovementData[i + 1][4]
//     ) {
//       currentIndex = i;
//       break;
//     }
//   }

//   const nextIndex = currentIndex + 1;
//   const [lat1, lon1, elevation1] = vehicleMovementData[currentIndex];
//   const [lat2, lon2, elevation2] = vehicleMovementData[nextIndex];
//   const time1 = vehicleMovementData[currentIndex][4];
//   const time2 = vehicleMovementData[nextIndex][4];

//   const currentProgress = (elapsedTime - time1) / (time2 - time1);

//   // Interpolate position
//   const pos1 = latLonToWebMercator(lat1, lon1);
//   // console.log("position1 -", pos1);

//   const pos2 = latLonToWebMercator(lat2, lon2);
//   // console.log("position2 -", pos2);
//   const x = THREE.MathUtils.lerp(pos1.x, pos2.x, currentProgress);
//   const z = THREE.MathUtils.lerp(pos1.y, pos2.y, currentProgress);

//   const scale = 0.05;
//   const elevationScale = 0.05;
//   const y =
//     THREE.MathUtils.lerp(elevation1, elevation2, currentProgress) *
//     elevationScale;

//   vehicle.position.set(
//     (x - refPoint.x) * scale,
//     y + 0.1,
//     (z - refPoint.y) * scale
//   );
//   // console.log("x position-", x);
//   // console.log("y position-", y);
//   // console.log("z position-", z);
//   // Set vehicle orientation
//   const target = new THREE.Vector3(
//     (pos2.x - refPoint.x) * scale,
//     elevation2 * elevationScale + 0.1,
//     (pos2.y - refPoint.y) * scale
//   );
//   // console.log("Target-", target);
//   vehicle.lookAt(target);
//   vehicle.up.set(0, 1, 0);
//   vehicle.rotateY(1.5 * Math.PI);

//   // Store current position and time in vehicleData
//   vehicleData.currentPosition = vehicle.position.clone();
//   vehicleData.currentTime = elapsedTime;

//   // Update the speed from vehicleMovementData (index 6)
//   vehicleData.speed = vehicleMovementData[currentIndex][6];
// }

// interface VehicleData {
//   vehicle_num: any;
//   vehicle: THREE.Object3D;
//   vehicleMovementData: any[];
//   tooltip: string;
//   currentPosition?: THREE.Vector3;
//   currentTime?: number;
//   speed?: number;
//   tooltipAlwaysOn?: boolean;
//   labelElement?: HTMLDivElement;
//   labelObject?: CSS2DObject;
//   legendItem?: HTMLDivElement;
//   toggleButton?: HTMLButtonElement;
//   infoText?: HTMLSpanElement;
// }

// const created_car: VehicleData[] = [];
// const created_suv: VehicleData[] = [];
// const created_bike: VehicleData[] = [];
// const created_trucks: VehicleData[] = [];

// // Map to store vehicle objects and their data
// const vehicleDataMap = new Map<THREE.Object3D, VehicleData>();

// function car_ani(id: any) {
//   const vehicleMovementData = flatPathData.filter(
//     (dataPoint) => dataPoint[3] === id
//   );

//   const tooltipText = `Car ${id}`;

//   const vehicle = createCar(scene, 0.055);
//   const vehicleData: VehicleData = {
//     vehicle_num: id,
//     vehicle: vehicle,
//     vehicleMovementData: vehicleMovementData,
//     tooltip: tooltipText,
//     tooltipAlwaysOn: false,
//   };

//   created_car.push(vehicleData);
//   vehicleDataMap.set(vehicle, vehicleData);
// }

// function suv_ani(id: any) {
//   const vehicleMovementData = flatPathData.filter(
//     (dataPoint) => dataPoint[3] === id
//   );

//   const tooltipText = `Suv ${id}`;

//   const vehicle = createSuv(scene, 0.055);
//   const vehicleData: VehicleData = {
//     vehicle_num: id,
//     vehicle: vehicle,
//     vehicleMovementData: vehicleMovementData,
//     tooltip: tooltipText,
//     tooltipAlwaysOn: false,
//   };

//   created_suv.push(vehicleData);
//   vehicleDataMap.set(vehicle, vehicleData);
// }

// function bike_ani(id: any) {
//   const vehicleMovementData = flatPathData.filter(
//     (dataPoint) => dataPoint[3] === id
//   );

//   const tooltipText = `Bike ${id}`;

//   const vehicle = createBike(scene, 0.06);
//   const vehicleData: VehicleData = {
//     vehicle_num: id,
//     vehicle: vehicle,
//     vehicleMovementData: vehicleMovementData,
//     tooltip: tooltipText,
//     tooltipAlwaysOn: false,
//   };

//   created_bike.push(vehicleData);
//   vehicleDataMap.set(vehicle, vehicleData);
// }

// function truck_ani(id: any) {
//   console.log("Check the truck data -", flatPathData);
//   const vehicleMovementData = flatPathData.filter(
//     (dataPoint) => dataPoint[3] === id
//   );
//   console.log("CHeck vehicle movement truck -", vehicleMovementData);
//   const tooltipText = `Truck ${id}`;

//   const vehicle = createTruck(scene, 0.065);
//   const vehicleData: VehicleData = {
//     vehicle_num: id,
//     vehicle: vehicle,
//     vehicleMovementData: vehicleMovementData,
//     tooltip: tooltipText,
//     tooltipAlwaysOn: false,
//   };

//   created_trucks.push(vehicleData);
//   vehicleDataMap.set(vehicle, vehicleData);
// }

// // Use the function to get unique items
// const uniqueFlatWaysCurves = getUniqueItemsById(flatPathData, 3);

// uniqueFlatWaysCurves.forEach((item) => {
//   const id = item[3];
//   const type = item[5];
//   if (type === "Car") {
//     car_ani(id);
//   }
//   if (type === "Motorcycle") {
//     bike_ani(id);
//   }
//   if (type === "Medium Vehicle") {
//     suv_ani(id);
//   }
//   if (type === "Heavy Vehicle") {
//     console.log("check it truck -", id);
//     truck_ani(id);
//   }
// });

// // Create the legend element and style it
// const legend = document.createElement("div");
// legend.className = "legend";
// document.body.appendChild(legend);

// // Map to store legend items
// const legendItemsMap = new Map<any, HTMLDivElement>();

// function updateLegend() {
//   const vehicleList = [
//     ...created_car,
//     ...created_bike,
//     ...created_trucks,
//     ...created_suv,
//   ];

//   for (let i = 0; i < vehicleList.length; i++) {
//     const vehicleData = vehicleList[i];
//     const id = vehicleData.vehicle_num;
//     const type = vehicleData.tooltip;

//     let legendItem = legendItemsMap.get(id);

//     if (!legendItem) {
//       // Create legend item
//       legendItem = document.createElement("div");
//       legendItem.className = "legend-item";

//       const title = document.createElement("strong");
//       title.textContent = type;
//       legendItem.appendChild(title);
//       legendItem.appendChild(document.createElement("br"));

//       // Create toggle button
//       const toggleButton = document.createElement("button");
//       toggleButton.textContent = vehicleData.tooltipAlwaysOn ? "Hide" : "Show";
//       toggleButton.addEventListener("click", function () {
//         vehicleData.tooltipAlwaysOn = !vehicleData.tooltipAlwaysOn;
//         toggleButton.textContent = vehicleData.tooltipAlwaysOn
//           ? "Hide"
//           : "Show";

//         if (vehicleData.tooltipAlwaysOn) {
//           // Create the label
//           if (!vehicleData.labelElement) {
//             const labelDiv = document.createElement("div");
//             labelDiv.className = "label";
//             labelDiv.textContent = `${vehicleData.tooltip}`;
//             vehicleData.labelElement = labelDiv;

//             const labelObject = new CSS2DObject(labelDiv);
//             labelObject.position.set(0, 1, 0); // Adjust label position above vehicle
//             vehicleData.labelObject = labelObject;
//             vehicleData.vehicle.add(labelObject);
//           }
//         } else {
//           // Remove the label
//           if (vehicleData.labelObject) {
//             vehicleData.vehicle.remove(vehicleData.labelObject);
//             vehicleData.labelObject = undefined;
//             vehicleData.labelElement = undefined;
//           }
//         }
//       });
//       legendItem.appendChild(toggleButton);
//       legendItem.appendChild(document.createElement("br"));

//       // Create speed/status text
//       const infoText = document.createElement("span");
//       legendItem.appendChild(infoText);
//       legendItem.appendChild(document.createElement("br"));

//       // Store references
//       vehicleData.legendItem = legendItem;
//       vehicleData.toggleButton = toggleButton;
//       vehicleData.infoText = infoText;

//       legend.appendChild(legendItem);
//       legend.appendChild(document.createElement("hr"));

//       legendItemsMap.set(id, legendItem);
//     }

//     // Update the infoText
//     const infoText: any = vehicleData.infoText;
//     if (vehicleData.currentPosition) {
//       const speed = vehicleData.speed?.toFixed(2);
//       infoText.textContent = `Speed: ${speed} m/s`;
//     } else {
//       infoText.textContent =
//         "Status: " +
//         (clock.getElapsedTime() < vehicleData.vehicleMovementData[0][4]
//           ? "Not started"
//           : "Finished");
//     }

//     // Update the toggle button text
//     vehicleData.toggleButton!.textContent = vehicleData.tooltipAlwaysOn
//       ? "Hide"
//       : "Show";
//   }
// }

// function animate() {
//   animationFrameId = requestAnimationFrame(animate);
//   const currentTime = Date.now();
//   let deltaTime = 0;

//   if (!isPaused) {
//     deltaTime = (currentTime - lastTime) / 1000; // Convert milliseconds to seconds
//     totalElapsedTime += deltaTime;
//   }

//   lastTime = currentTime;

//   const elapsedTime = totalElapsedTime;

//   // Animate cars
//   for (let i = 0; i < created_car.length; i++) {
//     const car = created_car[i];
//     animateVehicle(car, elapsedTime);
//   }

//   // Animate bikes
//   for (let i = 0; i < created_bike.length; i++) {
//     const bike = created_bike[i];
//     animateVehicle(bike, elapsedTime);
//   }

//   // Animate trucks
//   for (let i = 0; i < created_trucks.length; i++) {
//     const truck = created_trucks[i];
//     animateVehicle(truck, elapsedTime);
//   }

//   for (let i = 0; i < created_suv.length; i++) {
//     const suv = created_suv[i];
//     animateVehicle(suv, elapsedTime);
//   }

//   // Update legend
//   updateLegend();

//   // Update labels for vehicles with 'tooltipAlwaysOn'
//   const vehicleList = [
//     ...created_car,
//     ...created_bike,
//     ...created_trucks,
//     ...created_suv,
//   ];
//   for (let i = 0; i < vehicleList.length; i++) {
//     const vehicleData = vehicleList[i];
//     if (vehicleData.tooltipAlwaysOn && vehicleData.labelElement) {
//       let statusText = "";
//       const elapsedTime = clock.getElapsedTime();
//       if (vehicleData.speed === undefined) {
//         // Vehicle hasn't started or has finished
//         if (elapsedTime < vehicleData.vehicleMovementData[0][4]) {
//           statusText = "Not started";
//         } else if (
//           elapsedTime >
//           vehicleData.vehicleMovementData[
//             vehicleData.vehicleMovementData.length - 1
//           ][4]
//         ) {
//           statusText = "Finished";
//         }
//       } else {
//         // Vehicle is moving
//         statusText = `Speed: ${vehicleData.speed?.toFixed(2)} m/s`;
//       }
//       vehicleData.labelElement.textContent = `${vehicleData.tooltip}\n${statusText}`;
//     }
//   }

//   renderer.render(scene, camera);
//   labelRenderer.render(scene, camera);
// }
// pauseButton.addEventListener("click", () => {
//   isPaused = !isPaused;
//   if (isPaused) {
//     pauseButton.textContent = "Resume";
//   } else {
//     pauseButton.textContent = "Pause";
//     lastTime = Date.now();
//   }
// });
// pauseButton.style.top = "375px";
// pauseButton.style.left = "87.5%";
// pauseButton.style.padding = "10px 20px";
// pauseButton.style.fontSize = "16px";
// pauseButton.style.backgroundColor = "#ffffff";
// pauseButton.style.border = "1px solid #ccc";
// pauseButton.style.borderRadius = "5px";
// pauseButton.style.cursor = "pointer";
// pauseButton.style.boxShadow = "0 2px 5px rgba(0, 0, 0, 0.3)";

// lastTime = Date.now();
// // Create the "Get Vehicles" button
// const getVehiclesButton = document.createElement("button");
// getVehiclesButton.textContent = "Get Vehicles";
// getVehiclesButton.style.position = "absolute";
// getVehiclesButton.style.top = "425px"; // Adjust the position as needed
// getVehiclesButton.style.left = "87.5%";
// getVehiclesButton.style.padding = "10px 20px";
// getVehiclesButton.style.fontSize = "16px";
// getVehiclesButton.style.backgroundColor = "#ffffff";
// getVehiclesButton.style.border = "1px solid #ccc";
// getVehiclesButton.style.borderRadius = "5px";
// getVehiclesButton.style.cursor = "pointer";
// getVehiclesButton.style.boxShadow = "0 2px 5px rgba(0, 0, 0, 0.3)";

// // getVehiclesButton.addEventListener("click", () => {
// //   alert("Fetching vehicle data...");
// // });

// getVehiclesButton.addEventListener("click", async () => {
//   const apiUrl = "http://127.0.0.1:8000/api/vehicle/";

//   try {
//     // Fetch data from the API
//     const response = await fetch(apiUrl);
//     if (!response.ok) {
//       throw new Error(`HTTP error! status: ${response.status}`);
//     }
//     const data = await response.json();

//     // Log the data to the console
//     console.log("Vehicle Data:", data);
//   } catch (error) {
//     // Handle any errors
//     console.error("Error fetching vehicle data:", error);
//   }
// });

// // Add the button to the document body
// document.body.appendChild(getVehiclesButton);

// animate()
