import { BIKE_LOADER_HTML, BIKE_LOADER_STYLE } from "./dom_ui.ts";

let loadingOverlay: HTMLDivElement;

export function showLoadingOverlay() {
  if (!loadingOverlay) {
    loadingOverlay = document.createElement("div");
    loadingOverlay.style.position = "fixed";
    loadingOverlay.style.top = "0";
    loadingOverlay.style.left = "0";
    loadingOverlay.style.width = "100%";
    loadingOverlay.style.height = "100%";
    loadingOverlay.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
    loadingOverlay.style.display = "flex";
    loadingOverlay.style.justifyContent = "center";
    loadingOverlay.style.alignItems = "center";
    loadingOverlay.style.zIndex = "1001";

    const bikeLoader = document.createElement("div");
    bikeLoader.innerHTML = BIKE_LOADER_HTML;

    bikeLoader.style.display = "flex";
    bikeLoader.style.alignItems = "center";
    bikeLoader.style.justifyContent = "center";

    loadingOverlay.appendChild(bikeLoader);
  }

  document.body.appendChild(loadingOverlay);

  const style = document.createElement("style");
  style.type = "text/css";
  style.innerHTML = BIKE_LOADER_STYLE;
  document.head.appendChild(style);
}

export function hideLoadingOverlay() {
  if (loadingOverlay && loadingOverlay.parentNode) {
    loadingOverlay.parentNode.removeChild(loadingOverlay);
  }
}
