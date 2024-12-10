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
import { SelectVehicle } from "./dom_elements/create_dialog.ts";

Chart.register(...registerables);

const scene = new THREE.Scene();
scene.add(new THREE.GridHelper(150));
scene.add(new THREE.AxesHelper(4));
scene.background = new THREE.Color(0xb7ebbd);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 5, 10);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
document.body.appendChild(renderer.domElement);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bokehPass = new BokehPass(scene, camera, {
  focus: 10.0,
  aperture: 0.00015,
  maxblur: 0.01,
});
composer.addPass(bokehPass);

const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(window.innerWidth, window.innerHeight);
labelRenderer.domElement.style.position = "absolute";
labelRenderer.domElement.style.top = "0";
labelRenderer.domElement.style.pointerEvents = "none";
document.body.appendChild(labelRenderer.domElement);

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

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

const refPoint = latLonToWebMercator(
  changed_utm_coords[0][0],
  changed_utm_coords[0][1]
);
const roads = create_roads(refPoint);
scene.add(roads);

const flatPathData = changed_utm_coords;
const vehicles: VehicleData[] = [];
const vehicleDataMap = new Map<THREE.Object3D, VehicleData>();

const uniqueFlatWaysCurves = getUniqueItemsById(flatPathData, 3);
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

let targetVehicleData: VehicleData | undefined = vehicles[0];

const legend = document.createElement("div");
legend.className = "legend";
document.body.appendChild(legend);

const legendItemsMap = new Map<any, HTMLDivElement>();

let totalElapsedTime = 0;
let lastTime = Date.now();
let isPaused = false;

const pauseButton = createPauseButton(isPaused, () => {
  isPaused = !isPaused;
  if (isPaused) {
    pauseButton.textContent = "Resume";
  } else {
    pauseButton.textContent = "Pause";
    lastTime = Date.now();
  }
});

createImageButton(() => {
  if (!targetVehicleData || !targetVehicleData.vehicle) {
    alert("No target vehicle selected.");
    return;
  }

  const originalCameraPosition = camera.position.clone();
  const originalCameraQuaternion = camera.quaternion.clone();

  const driverSeatPosition = new THREE.Vector3(-0.75, 0, 0.85);
  const vehicleWorldPosition = new THREE.Vector3();
  targetVehicleData.vehicle.getWorldPosition(vehicleWorldPosition);
  const vehicleWorldQuaternion = new THREE.Quaternion();
  targetVehicleData.vehicle.getWorldQuaternion(vehicleWorldQuaternion);

  const cameraPosition = driverSeatPosition
    .clone()
    .applyQuaternion(vehicleWorldQuaternion)
    .add(vehicleWorldPosition);

  camera.position.copy(cameraPosition);
  camera.quaternion.copy(vehicleWorldQuaternion);

  camera.rotateY(Math.PI);
  camera.updateMatrixWorld();

  composer.render();
  labelRenderer.render(scene, camera);

  requestAnimationFrame(() => {
    renderer.domElement.toBlob((blob) => {
      if (blob) {
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

    camera.position.copy(originalCameraPosition);
    camera.quaternion.copy(originalCameraQuaternion);
    camera.updateMatrixWorld();
  });
});

function updateLegend() {
  vehicles.forEach((vehicleData) => {
    const id = vehicleData.vehicle_num;
    const type = vehicleData.tooltip;
    let legendItem = legendItemsMap.get(id);

    if (!legendItem) {
      legendItem = document.createElement("div");
      legendItem.className = "legend-item";

      const title = document.createElement("strong");
      title.textContent = type;
      legendItem.appendChild(title);
      legendItem.appendChild(document.createElement("br"));

      const toggleButton = document.createElement("button");
      toggleButton.textContent = vehicleData.tooltipAlwaysOn ? "Hide" : "Show";
      toggleButton.addEventListener("click", function () {
        vehicleData.tooltipAlwaysOn = !vehicleData.tooltipAlwaysOn;
        toggleButton.textContent = vehicleData.tooltipAlwaysOn
          ? "Hide"
          : "Show";

        if (vehicleData.tooltipAlwaysOn) {
          if (!vehicleData.labelElement) {
            const labelDiv = document.createElement("div");
            labelDiv.className = "label";
            labelDiv.textContent = `${vehicleData.tooltip}`;
            vehicleData.labelElement = labelDiv;

            const labelObject = new CSS2DObject(labelDiv);
            labelObject.position.set(0, 6, 0);
            vehicleData.labelObject = labelObject;
            vehicleData.vehicle.add(labelObject);
          }
        } else {
          if (vehicleData.labelObject) {
            vehicleData.vehicle.remove(vehicleData.labelObject);
            vehicleData.labelObject = undefined;
            vehicleData.labelElement = undefined;
          }
        }
      });
      legendItem.appendChild(toggleButton);
      legendItem.appendChild(document.createElement("br"));

      const infoText = document.createElement("span");
      legendItem.appendChild(infoText);
      legendItem.appendChild(document.createElement("br"));

      const setTargetButton = document.createElement("button");
      setTargetButton.textContent =
        vehicleData === targetVehicleData ? "Target Vehicle" : "Set as Target";
      setTargetButton.disabled = vehicleData === targetVehicleData;
      setTargetButton.addEventListener("click", function () {
        targetVehicleData = vehicleData;
        updateLegend();
        const vehicleMovementData = targetVehicleData.vehicleMovementData;
        const dataPoints = vehicleMovementData.map((item) => ({
          lat: item[0],
          lon: item[1],
        }));
        chart.data.datasets[0].data = dataPoints.map((point) => ({
          x: point.lon,
          y: point.lat,
        }));
        if (chart.data.datasets.length > 1) {
          chart.data.datasets[1].data = [];
        }
        chart.update();
      });
      legendItem.appendChild(setTargetButton);
      legendItem.appendChild(document.createElement("br"));

      vehicleData.legendItem = legendItem;
      vehicleData.toggleButton = toggleButton;
      vehicleData.infoText = infoText;
      vehicleData.setTargetButton = setTargetButton;

      legend.appendChild(legendItem);
      legend.appendChild(document.createElement("hr"));

      legendItemsMap.set(id, legendItem);
    }

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

    vehicleData.toggleButton!.textContent = vehicleData.tooltipAlwaysOn
      ? "Hide"
      : "Show";
    vehicleData.setTargetButton!.textContent =
      vehicleData === targetVehicleData ? "Target Vehicle" : "Set as Target";
    vehicleData.setTargetButton!.disabled = vehicleData === targetVehicleData;
  });
}

const plotContainer = document.createElement("div");
plotContainer.id = "plot-container";
plotContainer.style.position = "absolute";
plotContainer.style.bottom = "10px";
plotContainer.style.left = "10px";
plotContainer.style.width = "300px";
plotContainer.style.height = "300px";
plotContainer.style.backgroundColor = "#fff";
plotContainer.style.border = "1px solid #ccc";
plotContainer.style.padding = "10px";
plotContainer.style.boxShadow = "0 2px 5px rgba(0, 0, 0, 0.3)";
document.body.appendChild(plotContainer);

const plotCanvas = document.createElement("canvas");
plotCanvas.id = "plot-canvas";
plotCanvas.width = 280;
plotCanvas.height = 280;
plotContainer.appendChild(plotCanvas);

let isDraggingPlot = false;
let dragStartX = 0;
let dragStartY = 0;
let containerStartX = 0;
let containerStartY = 0;

plotContainer.addEventListener("mousedown", onPlotMouseDown);
plotContainer.addEventListener("mouseup", onPlotMouseUp);
plotContainer.addEventListener("mousemove", onPlotMouseMove);

function onPlotMouseDown(event: MouseEvent) {
  isDraggingPlot = true;
  dragStartX = event.clientX;
  dragStartY = event.clientY;
  const rect = plotContainer.getBoundingClientRect();
  containerStartX = rect.left;
  containerStartY = rect.top;
  plotContainer.style.zIndex = "1000";
}

function onPlotMouseMove(event: MouseEvent) {
  if (isDraggingPlot) {
    const deltaX = event.clientX - dragStartX;
    const deltaY = event.clientY - dragStartY;
    plotContainer.style.left = containerStartX + deltaX + "px";
    plotContainer.style.top = containerStartY + deltaY + "px";
  }
}

function onPlotMouseUp() {
  isDraggingPlot = false;
  plotContainer.style.zIndex = "10";
}

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

function animate() {
  requestAnimationFrame(animate);
  const currentTime = Date.now();
  let deltaTime = 0;

  if (!isPaused) {
    deltaTime = (currentTime - lastTime) / 1000;
    totalElapsedTime += deltaTime;
  }

  lastTime = currentTime;
  const elapsedTime = totalElapsedTime;

  vehicles.forEach((vehicleData) => {
    animateVehicle(vehicleData, elapsedTime, refPoint);
  });

  updateLegend();

  vehicles.forEach((vehicleData) => {
    if (vehicleData.tooltipAlwaysOn && vehicleData.labelElement) {
      let statusText = "";
      if (vehicleData.speed === undefined) {
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
        statusText = `Speed: ${vehicleData.speed?.toFixed(2)} m/s`;
      }
      vehicleData.labelElement.textContent = `${vehicleData.tooltip}\n${statusText}`;
    }
  });

  if (targetVehicleData && targetVehicleData.vehicle) {
    const vehicle = targetVehicleData.vehicle;
    const vehiclePosition = vehicle.position.clone();
    const vehicleDirection = new THREE.Vector3();
    vehicle.getWorldDirection(vehicleDirection);
    const cameraOffset = vehicleDirection.clone().multiplyScalar(-5);
    cameraOffset.y += 2;
    const cameraPosition = vehiclePosition.clone().add(cameraOffset);
    camera.position.lerp(cameraPosition, 0.2);
    camera.lookAt(vehiclePosition);
  }

  if (
    targetVehicleData &&
    targetVehicleData.currentLat !== undefined &&
    targetVehicleData.currentLon !== undefined
  ) {
    const currentLat = targetVehicleData.currentLat;
    const currentLon = targetVehicleData.currentLon;
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
lastTime = Date.now();
SelectVehicle;
animate();
