Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
  faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
  faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
  faceapi.nets.faceExpressionNet.loadFromUri("/models"),
  faceapi.nets.ssdMobilenetv1.loadFromUri("/models"),
]).then(() => console.log("Face API is ready!"));

const Notifier = getNotifier();

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

    Notifier.showNotification(1, "Photo has been captured!");

    console.log("Picture Taken!", data);
    // // Get Label
    // const urlParams = new URLSearchParams(window.location.search);
    // const label = urlParams.get("id") || "unknown";
    // // Prepare Image
    // const image = document.createElement("img");
    // image.src = window.URL.createObjectURL(blob);
    // const descriptions = [];
    // const detections = await faceapi
    //   .detectSingleFace(image)
    //   .withFaceLandmarks()
    //   .withFaceDescriptor();
    // descriptions.push(detections.descriptor);
    // const labeledFaceDescriptors = new faceapi.LabeledFaceDescriptors(
    //   label,
    //   descriptions
    // );
    // console.log(labeledFaceDescriptors);
  });
}

function getNotifier() {
  if (window.ReactNativeWebView) {
    return {
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
      sendData: function (data) {
        localStorage.setItem("data", data);
      },
    };
  }
}

takePicBtn.addEventListener("click", takePhoto);

doneBtn.addEventListener("click", async (e) => {
  e.preventDefault();

  if (Object.keys(data).length > 0) {
    doneBtn.disabled = true;
    Notifier.showNotification(0, "Training started...");
    const labeledFaceDescriptors = await loadLabeledImages();
    const faces = labeledFaceDescriptors.map((item) => item.toJSON());
    faces && Notifier.sendData(JSON.stringify(faces));
    // Object.values(data).map((item) => window.URL.revokeObjectURL(item));
    doneBtn.disabled = false;
    Notifier.showNotification(0, "Training finished...");
  } else {
    Notifier.showNotification(2, "There are no pictures taken!");
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
          .detectSingleFace(img)
          .withFaceLandmarks()
          .withFaceDescriptor();
        descriptions.push(detections.descriptor);
      }
      return new faceapi.LabeledFaceDescriptors(label, descriptions);
    })
  );
}

getStream();
