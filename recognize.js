Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri("/Face_Recognition"),
  faceapi.nets.faceLandmark68Net.loadFromUri("/Face_Recognition"),
  faceapi.nets.faceRecognitionNet.loadFromUri("/Face_Recognition"),
  faceapi.nets.faceExpressionNet.loadFromUri("/Face_Recognition"),
  faceapi.nets.ssdMobilenetv1.loadFromUri("/Face_Recognition"),
]).then(() => console.log("Face API is ready!"));

const Notifier = getNotifier();
// DOM ELEMENTS
const video = document.getElementById("video-element");
const container = document.getElementById("container");

let startupDone = false;
let stream;
let faceMatcher = null;

async function startup(faces) {
  const urlParams = new URLSearchParams(window.location.search);
  const width = urlParams.get("w") || 640;
  const height = urlParams.get("h") || 480;

  stream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: false,
  });

  video.width = width;
  video.height = height;
  video.srcObject = stream;
  video.play();

  const displaySize = {
    width: video.width,
    height: video.height,
  };

  const labeledFaceDescriptors = faces
    .flat()
    .map((item) => faceapi.LabeledFaceDescriptors.fromJSON(item));

  faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors, 0.6);

  setInterval(async function () {
    document.querySelectorAll(".canvas-result").forEach((el) => el.remove());
    let canvas = document.createElement("canvas");
    canvas.className = "canvas-result";
    canvas.style.position = "absolute";
    canvas.style.top = 0;
    canvas.style.left = 0;
    faceapi.matchDimensions(canvas, displaySize);
    container.append(canvas);

    const detections = await faceapi
      .detectAllFaces(video)
      .withFaceLandmarks()
      .withFaceDescriptors();

    // console.log(detections);

    const resizedDetections = faceapi.resizeResults(detections, displaySize);

    const results = resizedDetections.map((d) =>
      faceMatcher.findBestMatch(d.descriptor)
    );

    const payload = results.map((item) => ({
      label: item.label,
      distance: item.distance,
    }));

    if (payload.length > 0) Notifier.sendRecognitions(payload);

    results.forEach((result, i) => {
      const box = resizedDetections[i].detection.box;
      const drawBox = new faceapi.draw.DrawBox(box, {
        label: result.toString(),
      });

      drawBox.draw(canvas);
    });
  }, 500);
}

function getNotifier() {
  if (window.ReactNativeWebView) {
    return {
      sendRecognitions: function (data) {
        window.ReactNativeWebView.postMessage(
          JSON.stringify({ type: "face_found", data })
        );
      },
      sendError: function (error) {
        window.ReactNativeWebView.postMessage(
          JSON.stringify({ type: "error", error })
        );
      },
      showNotification: function (type, message) {
        window.ReactNativeWebView.postMessage(
          JSON.stringify({
            type: "notification",
            notificationType: type,
            message,
          })
        );
      },
      sendData: function (data) {
        window.ReactNativeWebView.postMessage(
          JSON.stringify({
            type: "data",
            data: data,
          })
        );
      },
    };
  } else {
    return {
      showNotification: function (type, message) {
        alert(message);
      },
    };
  }
}

async function onMessage(message) {
  try {
    if (!startupDone) {
      await startup(JSON.parse(message.data));
      startupDone = true;
    }
  } catch (error) {
    Notifier.showNotification(3, "Error from webview!");
    Notifier.sendError(error.message);
  }
}

if (navigator.userAgent.indexOf("Chrome") != -1) {
  document.addEventListener("message", onMessage);
} else {
  window.addEventListener("message", onMessage);
}

async function start() {
  if (!window.ReactNativeWebView) {
    const faces = JSON.parse(localStorage.getItem("data"));
    await startup(faces);
  }
}

start();
