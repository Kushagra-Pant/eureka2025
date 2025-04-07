const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const screenshotImg = document.getElementById('screenshot');
const captureButton = document.getElementById('captureButton');
const apiKey = "AIzaSyBabMtgBhaYsk1gL7LSXUkqLJafxdaqocI";
const distanceDiv = document.querySelector('.distance');
const scoreDiv = document.querySelector('.score');
const prevLoc = document.querySelector('.locations');

let homeLat = 43.46;
let homeLon = -79.69;
window.targetLat = 0;
window.landmarkName = 'none';
var targetLon = 0;

async function getRandomLandmark(radius) {
    const query = `
      [out:json][timeout:25];
      (
        node["tourism"="attraction"](around:${radius},${homeLat},${homeLon});
        node["historic"="monument"](around:${radius},${homeLat},${homeLon});
        node["leisure"="park"](around:${radius},${homeLat},${homeLon});
      );
      out center;
    `;
  
    const response = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: query,
    });
  
    const data = await response.json();
    const landmarks = data.elements;
  
    if (landmarks.length === 0) {
      throw new Error("No landmarks found in this area.");
    }
    const randomIndex = Math.floor(Math.random() * landmarks.length);
    const selected = landmarks[randomIndex];
            
    return selected;
}

function updateStreetView() {
    const img = document.getElementById("streetViewImage");
    const url = `https://maps.googleapis.com/maps/api/streetview?size=640x480&location=${window.targetLat},${window.targetLon}&fov=80&heading=100&pitch=0&key=${apiKey}`;
    
    img.src = url;
}

function map() {
    getTotalDistance();
    getTotalScore();

    navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => {
        video.srcObject = stream;
    })
    .catch(err => {
        console.error('Error accessing the camera: ', err);
    });

    captureButton.addEventListener('click', () => {
      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;

      canvas.width = videoWidth;
      canvas.height = videoHeight;

      const context = canvas.getContext('2d');
      context.drawImage(video, 0, 0, videoWidth, videoHeight);

      const dataUrl = canvas.toDataURL('image/png');
        
      screenshotImg.src = dataUrl;
      screenshotImg.onload = () => {
        const compared = compareImages();
        if (compared) {
          screenshotImg.style.outline = "4px solid green";
          markComplete();
          alert("Points Awarded!");
          setTimeout(() => {
            location.reload();
          }, 3000);
        } else {
          screenshotImg.style.outline = "4px solid red";
          alert("Incorrect Location. Points not awarded");
        }
      }
    });
    
    if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition(function(position) {
        homeLat = position.coords.latitude;
        homeLon = position.coords.longitude;

    }, function(error) {
        console.error("Error getting location: " + error.message);
    });
    } else {
        console.log("Geolocation is not available in this browser.");
    }
}

async function initialize() {
    try {
        const landmark = await getRandomLandmark(10000);
        window.targetLat = landmark.lat;
        window.targetLon = landmark.lon;
        window.landmarkName = landmark.tags.name;
        console.log('Latitude:', window.targetLat);
        console.log('Longitude:', window.targetLon);
        console.log('Landmark:', landmark.tags.name);
        updateStreetView();

        processLandmarkData();
    } catch (error) {
        console.error(error);
    }
}

function processLandmarkData() {
    console.log("Processing with global values:", window.targetLat, window.targetLon, window.landmarkName);
}

initialize();

map();

function giveScore(given) { 
    given = given*1000;
    const minDistance = 10;    
    const maxDistance = 50000;   

    const clamped = Math.max(minDistance, Math.min(maxDistance, given));

    const logMin = Math.log(minDistance);
    const logMax = Math.log(maxDistance);
    const logValue = Math.log(clamped);

    let normalized = (logValue - logMin) / (logMax - logMin);

    const curveStrength = 1.2;
    normalized = Math.pow(normalized, curveStrength);

    const points = Math.round(normalized * 1000);
    return points;
}

function saveCompletedLocation(lat, lng, score) {
  const key = 'completedLocations';
  const stored = localStorage.getItem(key);
  const completed = stored ? JSON.parse(stored) : [];

  const newLoc = `${window.landmarkName},${lat},${lng},${score},${calcDistance(homeLat, homeLon, window.targetLat, window.targetLon).toFixed(2)}`;
  if (!completed.includes(newLoc)) {
    completed.push(newLoc);
    localStorage.setItem(key, JSON.stringify(completed));
  }

  prevLoc.innerHTML = window.landmarkName;
}


function markComplete() { 
    saveCompletedLocation(homeLat, homeLon, giveScore(calcDistance(homeLat, homeLon, window.targetLat, window.targetLon)));
}

function clearCompletedLocations() {
    localStorage.removeItem('completedLocations');
    alert("All saved locations have been deleted.");
  }

function getCompletedLocations() {
    const stored = localStorage.getItem('completedLocations');
    return stored ? JSON.parse(stored) : [];
}

function showCompletedLocations() {
    console.log(getCompletedLocations());
}

function getTotalScore() {
    const locations = getCompletedLocations();
    let totalScore = 0;
    
    locations.forEach(location => {
      const parts = location.split(',');

      if (parts.length >= 3) {
        const score = parseFloat(parts[3]);
        if (!isNaN(score)) {
          totalScore += score;
        }
      }
    });
    
    scoreDiv.innerHTML = totalScore;
    return totalScore;
}

function showTotalScore() {
    const total = getTotalScore();
    alert("Total score: " + total);
}

function getTotalDistance() {
    const locations = getCompletedLocations();
    let totalDistance = 0;
    
    locations.forEach(location => {
      const parts = location.split(',');

      if (parts.length >= 4) {
        const distance = parseFloat(parts[4]);
        if (!isNaN(distance)) {
          totalDistance += distance;
        }
      }
    });
    
    distanceDiv.innerHTML = totalDistance.toFixed(2);
    return totalDistance;
}

function showTotalDistance() {
    const total = getTotalDistance();
    alert("Total score: " + total);
}

function toRadians(degrees) {
    return degrees * Math.PI / 180;
  }
  
function calcDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    
    const φ1 = toRadians(lat1);
    const φ2 = toRadians(lat2);
    const Δφ = toRadians(lat2 - lat1);
    let Δλ = toRadians(lon2 - lon1);

    if (Math.abs(Δλ) > Math.PI) {
        Δλ = Δλ > 0 ? Δλ - 2 * Math.PI : Δλ + 2 * Math.PI;
    }

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}


function compareImages() {
  screenshot = document.getElementById('screenshot');
  streetViewImage = document.getElementById('streetViewImage');

  const canvas1 = document.createElement('canvas');
  const canvas2 = document.createElement('canvas');
  const ctx1 = canvas1.getContext('2d');
  const ctx2 = canvas2.getContext('2d');

  canvas1.width = screenshot.width;
  canvas1.height = screenshot.height;
  canvas2.width = streetViewImage.width;
  canvas2.height = streetViewImage.height;

  ctx1.drawImage(screenshot, 0, 0, screenshot.width, screenshot.height);
  ctx2.drawImage(streetViewImage, 0, 0, streetViewImage.width, streetViewImage.height);

  const imageData1 = ctx1.getImageData(0, 0, canvas1.width, canvas1.height);
  const imageData2 = ctx2.getImageData(0, 0, canvas2.width, canvas2.height);

  if (imageData1.width !== imageData2.width || imageData1.height !== imageData2.height) {
    console.log("Images have different sizes and cannot be compared.");
    return false;
  }

  let pixelDifference = 0;
  let pixelDifferenceSq = 0;
  let pixelDifferenceSqrt = 0;
  length = imageData1.data.length;

  for (let i = 0; i < length; i += 4) {
    r1 = imageData1.data[i];
    g1 = imageData1.data[i + 1];
    b1 = imageData1.data[i + 2];
    r2 = imageData2.data[i];
    g2 = imageData2.data[i + 1];
    b2 = imageData2.data[i + 2];

    
    diff = Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2)
    diffSqrt = (Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2))**0.5;
    diffSq = (Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2))**2;
    pixelDifference += diff;
    pixelDifferenceSq += diffSq;
    pixelDifferenceSqrt += diffSqrt;
  }

  console.log("Pixel Difference Square Root: " + pixelDifferenceSqrt)
  console.log("Pixel Difference: " + pixelDifference)
  console.log("Pixel Difference Squared: " + pixelDifferenceSq)

  const threshold = 4000000;
  if (pixelDifferenceSqrt < threshold) {
    console.log("The images are similar.");
    return true;
  } else {
    console.log("The images are different.");
    return false;
  }
}
