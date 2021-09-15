Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri("/Face_Recognition"),
  faceapi.nets.faceLandmark68Net.loadFromUri("/Face_Recognition"),
  faceapi.nets.faceRecognitionNet.loadFromUri("/Face_Recognition"),
  faceapi.nets.faceExpressionNet.loadFromUri("/Face_Recognition"),
  faceapi.nets.ssdMobilenetv1.loadFromUri("/Face_Recognition"),
])
  .then(() => getStream())
  .catch((error) => {
    Emitter.emit(Events.ERROR, { error: "Errors loading models" });
  });

let stream;
let data = {};
const video = document.getElementById("video-element");
const takePicBtn = document.getElementById("take-picture");
const doneBtn = document.getElementById("done");

async function getStream() {
  stream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: false,
  });
  video.srcObject = stream;
  video.play();
}

async function takePhoto() {
  const videoTrack = stream.getVideoTracks()[0];
  const imageCapture = new ImageCapture(videoTrack);
  imageCapture.takePhoto().then(async (blob) => {
    // // Get Label
    const urlParams = new URLSearchParams(window.location.search);
    const label = urlParams.get("id") || "unknown";

    const picURL = window.URL.createObjectURL(blob);

    if (Array.isArray(data[label])) {
      data[label].push(picURL);
    } else {
      data[label] = [picURL];
    }

    Emitter.emit(Events.NOTIFICATION, {
      notificationType: 1,
      message: "Photo has been captured!",
    });
    // Notifier.showNotification(1, "Photo has been captured!");
    console.log("Picture Taken!", data);
  });
}

takePicBtn.addEventListener("click", takePhoto);

doneBtn.addEventListener("click", async (e) => {
  try {
    e.preventDefault();

    if (Object.keys(data).length > 0) {
      doneBtn.disabled = true;
      Emitter.emit(Events.NOTIFICATION, {
        notificationType: 0,
        message: "Training started...",
      });
      Emitter.emit(Events.TRAINING_START);

      const labeledFaceDescriptors = await loadLabeledImages();
      const faces = labeledFaceDescriptors.map((item) => item.toJSON());
      faces && Emitter.emit(Events.DATA, { data: JSON.stringify(faces) });
      // Object.values(data).map((item) => window.URL.revokeObjectURL(item));
      doneBtn.disabled = false;
      Emitter.emit(Events.TRAINING_FINISH);
      Emitter.emit(Events.NOTIFICATION, {
        notificationType: 0,
        message: "Training finished...",
      });
    } else {
      Emitter.emit(Events.NOTIFICATION, {
        notificationType: 2,
        message: "There are no pictures taken!",
      });
    }
  } catch (error) {
    Emitter.emit(Events.ERROR, {
      error: "Error in training faces!" + "Error: " + error.message,
    });
  }
});

function loadLabeledImages() {
  return Promise.all(
    Object.entries(data).map(async (item) => {
      const label = item[0];
      const descriptions = [];

      for (let i = 0; i < item[1].length; i++) {
        const img = await faceapi.fetchImage(item[1][i]);
        const detections = await faceapi
          .detectSingleFace(
            img,
            new faceapi.SsdMobilenetv1Options({ minConfidence: 0.9 })
          )
          .withFaceLandmarks()
          .withFaceDescriptor();
        if (detections) {
          descriptions.push(detections.descriptor);
        }
      }
      return new faceapi.LabeledFaceDescriptors(label, descriptions);
    })
  );
}
