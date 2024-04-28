window.onload = function() {
  navigator.geolocation.getCurrentPosition(function(position) {
    let lat = position.coords.latitude;
    let lon = position.coords.longitude;
    console.log(lat, lon); 
  
    // Send an action with the geolocation to the background script
    chrome.runtime.sendMessage({
      action: 'updateGeolocation',
      geolocation: { latitude: lat, longitude: lon }
    });
  });
};

// Event listener for keyboard shortcuts
document.addEventListener('keydown', (event) => {
  // CMD/CTRL + J to mark a URL as 'safe'
  if ((event.ctrlKey || event.metaKey) && event.key === 'j') {
    chrome.runtime.sendMessage({
      action: "markAsSafe",
      url: window.location.href
    }, response => {
      console.log(response);
    });
  }
});

// Messaging with the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case "blockOverlay":
      // Cover the whole website with an overlay
      createOverlay(message.message);
      break;
    case "redirect":
      // Redirect to the given URL
      window.location.href = message.url;
      break;
    default:
      // Handle other incoming messages as needed
      break;
  }
  sendResponse({ success: true });
  return true;
});

// Function to create an overlay to block the website
function createOverlay(message) {
  const overlay = document.createElement('div');
  overlay.textContent = message || 'This site has been blocked!'; // Display the provided message or a default message
  overlay.style.position = 'fixed';
  overlay.style.left = 0;
  overlay.style.top = 0;
  overlay.style.width = '100%';
  overlay.style.height = '100%';
  overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
  overlay.style.zIndex = 9999;
  overlay.style.color = 'white';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.fontSize = '24px';
  document.body.appendChild(overlay);
}



