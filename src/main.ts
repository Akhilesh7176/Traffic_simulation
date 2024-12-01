// main.ts

import * as THREE from "three";
import "./style.css";

import {
  CSS2DRenderer,
  CSS2DObject,
} from "three/examples/jsm/renderers/CSS2DRenderer.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { BokehPass } from "three/examples/jsm/postprocessing/BokehPass.js";
import { create_roads } from "./roads/create_roads/roads.ts";
import { changed_utm_coords } from "./roads/road_coordinates/utm_lat_long.ts";
import { Chart, registerables } from "chart.js";
import {
  getUniqueItemsById,
  latLonToWebMercator,
  createPauseButton,
  createImageButton,
} from "./utils.ts";
import { createVehicle, VehicleData, animateVehicle } from "./vehicles.ts";

// Register Chart.js components
Chart.register(...registerables);

// Initialize the scene
const scene = new THREE.Scene();
scene.add(new THREE.GridHelper(150));
scene.add(new THREE.AxesHelper(4));
scene.background = new THREE.Color(0xb7ebbd);

// Initialize the camera
const camera = new THREE.PerspectiveCamera(
  60, // Reduced FOV for a more cinematic look
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
// Initial camera position
camera.position.set(0, 5, 10);
camera.lookAt(0, 0, 0);

// Initialize the renderer
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

// Handle window resize
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
  // Update composer size on resize
  composer.setSize(window.innerWidth, window.innerHeight);
});

// Lighting setup
const data = { color: 0x00ff00, lightColor: 0xffffff };
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

// Define a reference point using changed_utm_coords
const refPoint = latLonToWebMercator(
  changed_utm_coords[0][0],
  changed_utm_coords[0][1]
);

// Create roads
const roads = create_roads(refPoint);
scene.add(roads);

// Prepare vehicle data
const flatPathData = changed_utm_coords;
const vehicles: VehicleData[] = [];
const vehicleDataMap = new Map<THREE.Object3D, VehicleData>();

// Get unique vehicle IDs
const uniqueFlatWaysCurves = getUniqueItemsById(flatPathData, 3);

// Create vehicles
uniqueFlatWaysCurves.forEach((item) => {
  const id = item[3];
  const type = item[5];
  const vehicleMovementData = flatPathData.filter(
    (dataPoint) => dataPoint[3] === id
  );

  const vehicleData = createVehicle(scene, type, id, vehicleMovementData);
  vehicles.push(vehicleData);
  vehicleDataMap.set(vehicleData.vehicle, vehicleData);
});

// Set the target vehicle
let targetVehicleData: VehicleData | undefined = vehicles[0];

// Create the legend element
const legend = document.createElement("div");
legend.className = "legend";
document.body.appendChild(legend);

// Map to store legend items
const legendItemsMap = new Map<any, HTMLDivElement>();

let totalElapsedTime = 0;
let lastTime = Date.now();
let isPaused = false;

// Create the pause button using utils.ts
const pauseButton = createPauseButton(isPaused, () => {
  isPaused = !isPaused;
  if (isPaused) {
    pauseButton.textContent = "Resume";
  } else {
    pauseButton.textContent = "Pause";
    lastTime = Date.now();
  }
});

// Create the image button using utils.ts
createImageButton(() => {
  if (!targetVehicleData || !targetVehicleData.vehicle) {
    alert("No target vehicle selected.");
    return;
  }

  // Save the current camera position and orientation
  const originalCameraPosition = camera.position.clone();
  const originalCameraQuaternion = camera.quaternion.clone();

  // Position the camera inside the vehicle (driver's seat position)
  const driverSeatPosition = new THREE.Vector3(-0.75, 0, 0.85);

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
  camera.rotateY(Math.PI);
  camera.updateMatrixWorld();

  // Render the scene
  composer.render();
  labelRenderer.render(scene, camera);

  // Wait for the next animation frame to ensure the scene is updated
  requestAnimationFrame(() => {
    renderer.domElement.toBlob((blob) => {
      if (blob) {
        // Create a link element to download the image
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "screenshot.png";
        link.click();

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

// Function to update the legend
function updateLegend() {
  vehicles.forEach((vehicleData) => {
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
      vehicleData.setTargetButton = setTargetButton;

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
  });
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

// Variables to store mouse positions for dragging the plot container
let isDraggingPlot = false;
let dragStartX = 0;
let dragStartY = 0;
let containerStartX = 0;
let containerStartY = 0;

// Add event listeners to the plot container
plotContainer.addEventListener("mousedown", onPlotMouseDown);
plotContainer.addEventListener("mouseup", onPlotMouseUp);
plotContainer.addEventListener("mousemove", onPlotMouseMove);

function onPlotMouseDown(event: MouseEvent) {
  isDraggingPlot = true;
  dragStartX = event.clientX;
  dragStartY = event.clientY;

  // Get the current position of the container
  const rect = plotContainer.getBoundingClientRect();
  containerStartX = rect.left;
  containerStartY = rect.top;

  // Bring the plot container to the front
  plotContainer.style.zIndex = "1000";
}

function onPlotMouseMove(event: MouseEvent) {
  if (isDraggingPlot) {
    // Calculate the new position
    const deltaX = event.clientX - dragStartX;
    const deltaY = event.clientY - dragStartY;

    // Update the position of the container
    plotContainer.style.left = containerStartX + deltaX + "px";
    plotContainer.style.top = containerStartY + deltaY + "px";
  }
}

function onPlotMouseUp() {
  isDraggingPlot = false;
  plotContainer.style.zIndex = "10"; // Reset z-index after dragging
}

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

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  const currentTime = Date.now();
  let deltaTime = 0;

  if (!isPaused) {
    deltaTime = (currentTime - lastTime) / 1000; // Convert milliseconds to seconds
    totalElapsedTime += deltaTime;
  }

  lastTime = currentTime;

  const elapsedTime = totalElapsedTime;

  // Animate vehicles
  vehicles.forEach((vehicleData) => {
    animateVehicle(vehicleData, elapsedTime, refPoint);
  });

  // Update legend
  updateLegend();

  // Update labels for vehicles with 'tooltipAlwaysOn'
  vehicles.forEach((vehicleData) => {
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
  });

  // Update camera position to follow the target vehicle
  if (targetVehicleData && targetVehicleData.vehicle) {
    const vehicle = targetVehicleData.vehicle;
    const vehiclePosition = vehicle.position.clone();
    const vehicleDirection = new THREE.Vector3();
    vehicle.getWorldDirection(vehicleDirection);

    // Calculate camera offset
    const cameraOffset = vehicleDirection.clone().multiplyScalar(-5);
    cameraOffset.y += 2;

    // Set camera position and orientation
    const cameraPosition = vehiclePosition.clone().add(cameraOffset);
    camera.position.lerp(cameraPosition, 0.2);
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

// Start the animation loop
lastTime = Date.now();

// Create the "Get Vehicles" button
const getVehiclesButton = document.createElement("button");
getVehiclesButton.textContent = "Get Vehicles";
getVehiclesButton.style.position = "absolute";
getVehiclesButton.style.top = "425px"; // Adjust the position as needed
getVehiclesButton.style.left = "87.5%";
getVehiclesButton.style.padding = "10px 20px";
getVehiclesButton.style.fontSize = "16px";
getVehiclesButton.style.backgroundColor = "#ffffff";
getVehiclesButton.style.border = "1px solid #ccc";
getVehiclesButton.style.borderRadius = "5px";
getVehiclesButton.style.cursor = "pointer";
getVehiclesButton.style.boxShadow = "0 2px 5px rgba(0, 0, 0, 0.3)";

// getVehiclesButton.addEventListener("click", () => {
//   alert("Fetching vehicle data...");
// });

getVehiclesButton.addEventListener("click", async () => {
  const apiUrl = "http://127.0.0.1:8000/api/vehicle/";

  try {
    // Fetch data from the API
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();

    // Log the data to the console
    console.log("Vehicle Data:", data);
  } catch (error) {
    // Handle any errors
    console.error("Error fetching vehicle data:", error);
  }
});

// Add the button to the document body
document.body.appendChild(getVehiclesButton);
animate();
