require('dotenv').config();
const apiKey = process.env.API_KEY;


const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const screenshotImg = document.getElementById('screenshot');
const captureButton = document.getElementById('captureButton');

function map() {
    // Request access to webcam
    navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => {
        // Set the video source to the webcam stream
        video.srcObject = stream;
    })
    .catch(err => {
        console.error('Error accessing the camera: ', err);
    });

    // Capture the screenshot when the button is clicked
    captureButton.addEventListener('click', () => {
    // Get the video dimensions
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;

    // Set the canvas size to match the video size
    canvas.width = videoWidth;
    canvas.height = videoHeight;

    // Draw the current video frame onto the canvas
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, videoWidth, videoHeight);

    // Convert the canvas image to a data URL (base64 image)
    const dataUrl = canvas.toDataURL('image/png');

    // Set the data URL as the source for the image element
    screenshotImg.src = dataUrl;
    });

    if ("geolocation" in navigator) {
    // Get the current position
    navigator.geolocation.getCurrentPosition(function(position) {
        let latitude = position.coords.latitude;
        let longitude = position.coords.longitude;

        console.log("Latitude: " + latitude);
        console.log("Longitude: " + longitude);

        updateStreetView(latitude, longitude);
        // Now initialize the map using actual coordinates
        var map = L.map('map').setView([latitude, longitude], 13);

        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(map);

        // Pop-up marker and content
        var marker = L.marker([latitude, longitude]).addTo(map);
        marker.bindPopup("<b>Hello world!</b><br>I am a popup.").openPopup();

        var popup = L.popup()
            .setLatLng([latitude, longitude])
            .setContent("I am a standalone popup.")
            .openOn(map);

    }, function(error) {
        // Handle errors if location access is denied or fails
        console.error("Error getting location: " + error.message);
    });
    } else {
    console.log("Geolocation is not available in this browser.");
    }
}

map();

function updateStreetView(lat, lng) {
    const apiKey = "AIzaSyDr6FSf4ksQ_8sY2KT_7op1mfb23kZF1fY"; // make sure this is restricted!
    const img = document.getElementById("streetViewImage");
  
    const url = `https://maps.googleapis.com/maps/api/streetview?size=400x400&location=${lat},${lng}&fov=80&heading=100&pitch=0&key=${apiKey}`;
    
    img.src = url;
}

async function getRandomLandmark(lat, lon, radius = 2000) {
    const query = `
      [out:json][timeout:25];
      (
        node["tourism"="attraction"](around:${radius},${lat},${lon});
        node["historic"="monument"](around:${radius},${lat},${lon});
        node["leisure"="park"](around:${radius},${lat},${lon});
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
  
    // Choose a random one with equal probability
    const randomIndex = Math.floor(Math.random() * landmarks.length);
    const selected = landmarks[randomIndex];
  
    return selected;
  }

// For Kushagra
function giveScore() {
    
    return 200;
}

/*
* Saving location and score to browser
*/
function saveCompletedLocation(lat, lng, score) {
  const key = 'completedLocations';
  const stored = localStorage.getItem(key);
  const completed = stored ? JSON.parse(stored) : [];

  // Add new location if not already saved
  const newLoc = `${lat},${lng},${score}`;
  if (!completed.includes(newLoc)) {
    completed.push(newLoc);
    localStorage.setItem(key, JSON.stringify(completed));
  }
}

function markComplete() {
    const lat = 47.5763831;
    const lng = -122.4211769;
    const score = giveScore();
    saveCompletedLocation(lat, lng, score);
    alert("Saved!");
}

function clearCompletedLocations() {
    localStorage.removeItem('completedLocations');
    alert("All saved locations have been deleted.");
  }

function getCompletedLocations() {
    const stored = localStorage.getItem('completedLocations');
    console.log(stored);
    return stored ? JSON.parse(stored) : [];
}

/*
* Distance algorithm
*/
function toRadians(degrees) {
    return degrees * Math.PI / 180;
  }
  
function calcDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of Earth in kilometers

    // Convert degrees to radians
    const φ1 = toRadians(lat1);
    const φ2 = toRadians(lat2);
    const Δφ = toRadians(lat2 - lat1);
    let Δλ = toRadians(lon2 - lon1);

    // Account for longitude wrapping (ensure Δλ is in the range [-180°, 180°])
    if (Math.abs(Δλ) > Math.PI) {
        Δλ = Δλ > 0 ? Δλ - 2 * Math.PI : Δλ + 2 * Math.PI;
    }

    // Haversine formula
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    // Distance in kilometers
    const distance = R * c;

    return distance;
}
  