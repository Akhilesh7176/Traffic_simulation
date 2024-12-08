export function latLonToWebMercator(lat: number, lon: number) {
  const R = 6378137;
  const x = R * Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 180 / 2));
  const y = R * lon * (Math.PI / 180);
  return { x, y };
}

export function getUniqueItemsById(data: any[], idIndex: number) {
  const uniqueItemsMap = new Map<any, any>();
  data.forEach((item) => {
    const id = item[idIndex];
    if (!uniqueItemsMap.has(id)) {
      uniqueItemsMap.set(id, item);
    }
  });
  return Array.from(uniqueItemsMap.values());
}

export function createPauseButton(
  isPaused: boolean,
  onPauseClick: () => void
): HTMLButtonElement {
  const pauseButton = document.createElement("button");
  pauseButton.textContent = isPaused ? "Resume" : "Pause";
  pauseButton.style.position = "absolute";
  pauseButton.style.top = "20px";
  pauseButton.style.right = "30px";

  pauseButton.style.padding = "10px 20px";
  pauseButton.style.fontSize = "16px";
  pauseButton.style.fontWeight = "bold";
  pauseButton.style.color = "#ffffff";
  pauseButton.style.background = "linear-gradient(to bottom, #444444, #333333)";
  pauseButton.style.border = "none";
  pauseButton.style.borderRadius = "20px";
  pauseButton.style.cursor = "pointer";
  pauseButton.style.boxShadow = "0 2px 5px rgba(0, 0, 0, 0.5)";

  pauseButton.addEventListener("mouseenter", () => {
    pauseButton.style.background =
      "linear-gradient(to bottom, #555555, #444444)";
  });
  pauseButton.addEventListener("mouseleave", () => {
    pauseButton.style.background =
      "linear-gradient(to bottom, #444444, #333333)";
  });
  pauseButton.style.transform = "translate3d(0px, 0px, 0)";

  document.body.appendChild(pauseButton);

  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let translateX = 0;
  let translateY = 0;

  pauseButton.addEventListener("mousedown", (event: MouseEvent) => {
    isDragging = true;
    startX = event.clientX - translateX;
    startY = event.clientY - translateY;

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  });

  function onMouseMove(event: MouseEvent) {
    if (isDragging) {
      translateX = event.clientX - startX;
      translateY = event.clientY - startY;

      pauseButton.style.transform = `translate3d(${translateX}px, ${translateY}px, 0)`;
    }
  }

  function onMouseUp() {
    if (isDragging) {
      isDragging = false;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    }
  }

  pauseButton.addEventListener("click", onPauseClick);

  return pauseButton;
}

export function createImageButton(onImageClick: () => void): HTMLButtonElement {
  const imageButton = document.createElement("button");
  imageButton.textContent = "Image";
  imageButton.style.position = "absolute";
  imageButton.style.top = "20px";
  imageButton.style.right = "200px";

  imageButton.style.padding = "10px 20px";
  imageButton.style.fontSize = "16px";
  imageButton.style.fontWeight = "bold";
  imageButton.style.color = "#ffffff";
  imageButton.style.background = "linear-gradient(to bottom, #444444, #333333)";
  imageButton.style.border = "none";
  imageButton.style.borderRadius = "20px";
  imageButton.style.cursor = "pointer";
  imageButton.style.boxShadow = "0 2px 5px rgba(0, 0, 0, 0.5)";

  imageButton.addEventListener("mouseenter", () => {
    imageButton.style.background =
      "linear-gradient(to bottom, #555555, #444444)";
  });
  imageButton.addEventListener("mouseleave", () => {
    imageButton.style.background =
      "linear-gradient(to bottom, #444444, #333333)";
  });
  imageButton.style.transform = "translate3d(0px, 0px, 0)";
  document.body.appendChild(imageButton);

  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let translateX = 0;
  let translateY = 0;

  imageButton.addEventListener("mousedown", (event: MouseEvent) => {
    isDragging = true;
    startX = event.clientX - translateX;
    startY = event.clientY - translateY;

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  });

  function onMouseMove(event: MouseEvent) {
    if (isDragging) {
      translateX = event.clientX - startX;
      translateY = event.clientY - startY;

      imageButton.style.transform = `translate3d(${translateX}px, ${translateY}px, 0)`;
    }
  }

  function onMouseUp() {
    if (isDragging) {
      isDragging = false;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    }
  }

  imageButton.addEventListener("click", onImageClick);

  return imageButton;
}
