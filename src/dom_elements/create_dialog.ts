import { DIALOG_CSS } from "./dom_ui.ts";
import { hideLoadingOverlay, showLoadingOverlay } from "./loader.ts";

let dialogContainer: HTMLDivElement;

const vehicle_options: string[] = [
  "--v0",
  "--T",
  "--s0",
  "--a",
  "--b",
  "--fol",
];
const values_vehicles: string[] = [
  "Speed",
  "Time Gap",
  "Safe Gap",
  "Acceleration",
  "Deceleration",
  "Follower Id",
];

export const SelectVehicle: HTMLButtonElement =
  document.createElement("button");
SelectVehicle.textContent = "Select Vehicle";
SelectVehicle.style.position = "absolute";
SelectVehicle.style.top = "20px";
SelectVehicle.style.left = "30px";
SelectVehicle.style.padding = "10px 20px";
SelectVehicle.style.fontSize = "16px";
SelectVehicle.style.fontWeight = "bold";
SelectVehicle.style.color = "#ffffff";
SelectVehicle.style.background = "linear-gradient(to bottom, #444444, #333333)";
SelectVehicle.style.border = "none";
SelectVehicle.style.borderRadius = "20px";
SelectVehicle.style.cursor = "pointer";
SelectVehicle.style.boxShadow = "0 2px 5px rgba(0, 0, 0, 0.5)";

SelectVehicle.addEventListener("mouseenter", () => {
  SelectVehicle.style.background =
    "linear-gradient(to bottom, #000000, #333333)";
});
SelectVehicle.addEventListener("mouseleave", () => {
  SelectVehicle.style.background =
    "linear-gradient(to bottom, #444444, #333333)";
});
SelectVehicle.style.transform = "translate3d(0px, 0px, 0)";
document.body.appendChild(SelectVehicle);

SelectVehicle.addEventListener("click", () => {
  createDialog();
});

export function createDialog() {
  const style = document.createElement("style");
  style.type = "text/css";
  style.innerHTML = DIALOG_CSS;
  document.head.appendChild(style);

  dialogContainer = document.createElement("div");
  dialogContainer.className = "dialog-overlay";

  const dialogBox: HTMLDivElement = document.createElement("div");
  dialogBox.className = "dialog-box";

  const title: HTMLHeadingElement = document.createElement("h2");
  title.textContent = "IDM Parameters";
  dialogBox.appendChild(title);

  const checkboxContainer: HTMLDivElement = document.createElement("div");
  checkboxContainer.className = "checkbox-container";
  dialogBox.appendChild(checkboxContainer);

  // We'll use vehicle_options as the primary array and values_vehicles as the labels
  const checkboxInputsMap: {
    key: string;
    option: string;
    checkbox: HTMLInputElement;
    inputField: HTMLInputElement;
  }[] = [];

  vehicle_options.forEach((key, index) => {
    const option = values_vehicles[index];

    const row: HTMLDivElement = document.createElement("div");
    row.className = "checkbox-row";

    const checkbox: HTMLInputElement = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = key;

    const label: HTMLLabelElement = document.createElement("label");
    label.textContent = option;

    label.style.whiteSpace = "nowrap";

    const textInput: HTMLInputElement = document.createElement("input");

    textInput.type = "text";
    textInput.placeholder = `Enter ${option}`;
    textInput.size = 60;
    textInput.style.width = "200px";
    textInput.style.marginLeft = "70px";
    textInput.classList.add("form-control");

    row.appendChild(checkbox);
    row.appendChild(label);
    row.appendChild(textInput);
    checkboxContainer.appendChild(row);

    checkboxInputsMap.push({ key, option, checkbox, inputField: textInput });
  });

  const buttonContainer: HTMLDivElement = document.createElement("div");
  buttonContainer.className = "dialog-buttons";

  const runButton: HTMLButtonElement = document.createElement("button");
  runButton.textContent = "Run";
  runButton.addEventListener("click", async () => {
    const data: Record<string, string | null> = {};
    checkboxInputsMap.forEach(({ key, checkbox, inputField }) => {
      if (checkbox.checked) {
        data[key] = inputField.value.trim() || null;
      } else {
        data[key] = null;
      }
    });

    await runSimulation(data);
  });
  buttonContainer.appendChild(runButton);

  const cancelButton: HTMLButtonElement = document.createElement("button");
  cancelButton.classList.add("cancel-btn");
  cancelButton.textContent = "Close";
  cancelButton.addEventListener("click", () => {
    if (dialogContainer && dialogContainer.parentNode) {
      dialogContainer.parentNode.removeChild(dialogContainer);
    }
  });
  buttonContainer.appendChild(cancelButton);

  dialogBox.appendChild(buttonContainer);
  dialogContainer.appendChild(dialogBox);
  document.body.appendChild(dialogContainer);
}
const runSimulation = async (data: Record<string, string | null>) => {
  try {
    showLoadingOverlay();

    const response = await fetch("http://127.0.0.1:8000/api/run-simulation/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    hideLoadingOverlay();

    if (response.ok) {
      if (dialogContainer && dialogContainer.parentNode) {
        dialogContainer.parentNode.removeChild(dialogContainer);
      }

      window.location.reload();
    } else {
      console.error("Simulation Error:", result.error || result.details);
      alert("Failed to run simulation. Check console for details.");
    }
  } catch (error) {
    hideLoadingOverlay();
    console.error("Request Error:", error);
    alert("Error connecting to the server.");
  }
};
