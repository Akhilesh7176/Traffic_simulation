export const DIALOG_CSS: string = `
* {
  box-sizing: border-box;
  font-family: Arial, sans-serif;
}

.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0,0,0,0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}

.dialog-box {
  background: #ffffff;
  width: 400px;
  border-radius: 10px;
  box-shadow: 0 8px 30px rgba(0,0,0,0.2);
  padding: 25px;
  animation: slideIn 0.3s ease;
  position: relative;
}

@keyframes slideIn {
  from { transform: translateY(-20px); opacity: 0; }
  to   { transform: translateY(0); opacity: 1; }
}

.dialog-box h2 {
  margin-top: 0;
  margin-bottom: 20px;
  font-size: 1.4em;
  color: #333;
  text-align: center;
}

.checkbox-container {
  margin-bottom: 20px;
}

.checkbox-row {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.checkbox-row label {
  margin-left: 5px;
  font-size: 0.95em;
  color: #333;
  width: 40px;
}

.checkbox-row input[type="checkbox"] {
  transform: scale(1.2);
  cursor: pointer;
}

.checkbox-row input[type="text"] {
  flex: 1;
  margin-left: 10px;
  padding: 5px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 0.9em;
}

.dialog-buttons {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}

.dialog-buttons button {
  background: #007BFF;
  color: #fff;
  border: none;
  padding: 10px 15px;
  font-size: 0.9em;
  border-radius: 4px;
  cursor: pointer;
  margin-left: 10px;
  transition: background 0.2s ease;
}

.dialog-buttons button:hover {
  background: #0056b3;
}

.dialog-buttons .cancel-btn {
  background: #6c757d;
}

.dialog-buttons .cancel-btn:hover {
  background: #5a6268;
}
`;

export const BIKE_LOADER_HTML: string = `
<svg class="bike" viewBox="0 0 48 30" width="96px" height="60px">
  <g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1">
    <g transform="translate(9.5,19)">
      <circle class="bike__tire" r="9" stroke-dasharray="56.549 56.549" />
      <g class="bike__spokes-spin" stroke-dasharray="31.416 31.416" stroke-dashoffset="-23.562">
        <circle class="bike__spokes" r="5" />
        <circle class="bike__spokes" r="5" transform="rotate(180,0,0)" />
      </g>
    </g>
    <g transform="translate(24,19)">
      <g class="bike__pedals-spin" stroke-dasharray="25.133 25.133" stroke-dashoffset="-21.991" transform="rotate(67.5,0,0)">
        <circle class="bike__pedals" r="4" />
        <circle class="bike__pedals" r="4" transform="rotate(180,0,0)" />
      </g>
    </g>
    <g transform="translate(38.5,19)">
      <circle class="bike__tire" r="9" stroke-dasharray="56.549 56.549" />
      <g class="bike__spokes-spin" stroke-dasharray="31.416 31.416" stroke-dashoffset="-23.562">
        <circle class="bike__spokes" r="5" />
        <circle class="bike__spokes" r="5" transform="rotate(180,0,0)" />
      </g>
    </g>
    <polyline class="bike__seat" points="14 3,18 3" stroke-dasharray="5 5" />
    <polyline class="bike__body" points="16 3,24 19,9.5 19,18 8,34 7,24 19" stroke-dasharray="79 79" />
    <path class="bike__handlebars" d="m30,2h6s1,0,1,1-1,1-1,1" stroke-dasharray="10 10" />
    <polyline class="bike__front" points="32.5 2,38.5 19" stroke-dasharray="19 19" />
  </g>
</svg>
`;

export const BIKE_LOADER_STYLE: string = `
.bike {
  display: block;
  margin: auto;
  width: 16em;
  height: auto;
}
.bike__body,
.bike__front,
.bike__handlebars,
.bike__pedals,
.bike__pedals-spin,
.bike__seat,
.bike__spokes,
.bike__spokes-spin,
.bike__tire {
  animation: bikeBody 3s ease-in-out infinite;
  stroke: #3498db;
}
.bike__front {
  animation-name: bikeFront;
}
.bike__handlebars {
  animation-name: bikeHandlebars;
}
.bike__pedals {
  animation-name: bikePedals;
}
.bike__pedals-spin {
  animation-name: bikePedalsSpin;
}
.bike__seat {
  animation-name: bikeSeat;
}
.bike__spokes-spin {
  animation-name: bikeSpokesSpin;
}
.bike__tire {
  animation-name: bikeTire;
}

@keyframes bikeBody {
  from { stroke-dashoffset: 79; }
  33%,
  67% { stroke-dashoffset: 0; }
  to { stroke-dashoffset: -79; }
}
@keyframes bikeFront {
  from { stroke-dashoffset: 19; }
  33%,
  67% { stroke-dashoffset: 0; }
  to { stroke-dashoffset: -19; }
}
@keyframes bikeHandlebars {
  from { stroke-dashoffset: 10; }
  33%,
  67% { stroke-dashoffset: 0; }
  to { stroke-dashoffset: -10; }
}
@keyframes bikePedals {
  from {
    animation-timing-function: ease-in;
    stroke-dashoffset: -25.133;
  }
  33%,
  67% {
    animation-timing-function: ease-out;
    stroke-dashoffset: -21.991;
  }
  to {
    stroke-dashoffset: -25.133;
  }
}
@keyframes bikePedalsSpin {
  from { transform: rotate(0.1875turn); }
  to { transform: rotate(3.1875turn); }
}
@keyframes bikeSeat {
  from { stroke-dashoffset: 5; }
  33%,
  67% { stroke-dashoffset: 0; }
  to { stroke-dashoffset: -5; }
}
@keyframes bikeSpokesSpin {
  from { transform: rotate(0); }
  to { transform: rotate(3turn); }
}
@keyframes bikeTire {
  from {
    animation-timing-function: ease-in;
    stroke-dashoffset: 56.549;
    transform: rotate(0);
  }
  33% {
    stroke-dashoffset: 0;
    transform: rotate(0.33turn);
  }
  67% {
    animation-timing-function: ease-out;
    stroke-dashoffset: 0;
    transform: rotate(0.67turn);
  }
  to {
    stroke-dashoffset: -56.549;
    transform: rotate(1turn);
  }
}
`;
