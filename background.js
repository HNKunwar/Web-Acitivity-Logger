const CLASSES_KEY = 'studyTracker.classes';
const LOCATIONS_KEY = 'studyTracker.locations';
const GEOLOCATION_KEY = 'studyTracker.geolocation';
const ACTIVE_CLASS_KEY = 'activeClass';


let currentClass = null; 


function saveToStorage(key, data) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ [key]: data }, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError.message);
      } else {
        resolve();
      }
    });
  });
}

function loadFromStorage(key) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get([key], (result) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError.message);
      } else {
        resolve(result[key] || []);
      }
    });
  });
}

// Function to send data to the Flask server
async function sendToFlaskServer(data) {
  try {
    const response = await fetch('http://localhost:4999/log_visit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    console.log('Raw response: ', await response.text());
    
    const responseData = await response.json();
    return responseData;
  } catch (error) {
    console.error('Error sending data to Flask server:', error);
    return { error: error.message };
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'updateGeolocation':
      saveToStorage(GEOLOCATION_KEY, message.geolocation)
        .then(() => {
            sendResponse({ success: true });
        })
        .catch((error) => {
            sendResponse({ success: false, error });
        });
      return true;

    case 'logVisit':
      loadFromStorage(GEOLOCATION_KEY)
        .then((geolocation) => {
          const dataWithGeolocation = { ...message.data, geolocation };
          sendToFlaskServer(dataWithGeolocation)
            .then((response) => {
              if (response.action === 'blockOverlay') {
                chrome.tabs.sendMessage(message.data.tabId, 
                  { action: 'blockOverlay', message: response.message });
              } else if (response.action === 'showPopupMessage') {
                chrome.runtime.sendMessage({ action: 'showPopupMessage', 
                  message: response.message });
              }
              if (response.is_new_location) {
                // Send a message to the popup script to update the active location UI
                chrome.runtime.sendMessage({ action: 'updateActiveLocation', locationName: response.address, nickname: null });
              }
              sendResponse(response);
            })
            .catch((error) => {
              console.error('Error:', error);
              sendResponse({ error: error.message });
            });
        })
        .catch((error) => {
          console.error('Error:', error);
          sendResponse({ error: error.message });
        });
      return true;


    case 'showPopupMessage':
      chrome.runtime.sendMessage({ action: 'showPopupMessage', message: message.message });
      break;

    case 'addClass':
      loadFromStorage(CLASSES_KEY)
        .then((classes) => {
          const newClasses = [...new Set([...classes, message.className])];
          saveToStorage(CLASSES_KEY, newClasses)
            .then(() => {
              sendResponse({ success: true });
            })
            .catch((error) => {
              sendResponse({ success: false, error });
            });
        })
        .catch((error) => {
          sendResponse({ success: false, error });
        });
      return true;
    
    case 'removeClass':
      loadFromStorage(CLASSES_KEY)
        .then((classes) => {
          const newClasses = classes.filter((className) => className !== message.className);
          saveToStorage(CLASSES_KEY, newClasses)
            .then(() => {
              sendResponse({ success: true });
            })
            .catch((error) => {
              sendResponse({ success: false, error });
            });
        })
        .catch((error) => {
          sendResponse({ success: false, error });
        });
      return true;

    case 'getClasses':
      loadFromStorage(CLASSES_KEY)
        .then((classes) => {
          sendResponse({ classes });
        })
        .catch((error) => {
          sendResponse({ error });
        });
      return true;
    
    case 'removeLocation':
      loadFromStorage(LOCATIONS_KEY)
        .then((locations) => {
          const newLocations = locations.filter((locationName) => locationName !== message.locationName);
          saveToStorage(LOCATIONS_KEY, newLocations)
            .then(() => {
              sendResponse({ success: true });
            })
            .catch((error) => {
              sendResponse({ success: false, error });
            });
        })
        .catch((error) => {
          sendResponse({ success: false, error });
        });
      return true;
      
    case 'addLocation':
      loadFromStorage(LOCATIONS_KEY)
        .then((locations) => {
          const newLocations = [...new Set([...locations, message.locationName])];
          saveToStorage(LOCATIONS_KEY, newLocations)
            .then(() => {
              sendResponse({ success: true });
            })
            .catch((error) => {
              sendResponse({ success: false, error });
            });
        })
        .catch((error) => {
          sendResponse({ success: false, error });
        });
      return true;
    
    case 'getLocations':
      loadFromStorage(LOCATIONS_KEY)
        .then((locations) => {
          sendResponse({ locations });
        })
        .catch((error) => {
          sendResponse({ error });
        });
      return true;

    
    case 'updateNickname':
    const { locationName, newNickname } = message;
    fetch('http://localhost:4999/update_nickname', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ address: locationName, new_nickname: newNickname })
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        sendResponse({ success: true });
        // Check if the updated location is the active location
        chrome.storage.local.get(['activeLocation'], (result) => {
          if (result.activeLocation && result.activeLocation.locationName === locationName) {
            // Send a message to the popup script to update the active location UI
            chrome.runtime.sendMessage({ action: 'updateActiveLocation', locationName, nickname: newNickname });
          }
        });
      } else {
        sendResponse({ success: false, error: 'Failed to update nickname' });
      }
    })
    .catch(error => {
      sendResponse({ success: false, error: error.message });
    });
    return true;

    case 'getTabId':
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        detectPageVisit(message.url, tabs[0].id);
      });
      break;
    
    case 'getClasses':
      chrome.storage.local.get(['classes'], function(result) {
        if (chrome.runtime.lastError) {
          sendResponse({ error: 'Failed to retrieve classes.' });
        } else {
          sendResponse({ classes: result.classes || [] });
        }
      });
      return true;

    case 'setCurrentClass':
      currentClass = message.className; // Handles classes and replacing the class
      chrome.storage.local.set({ [ACTIVE_CLASS_KEY]: message.className }, function() {
        const error = chrome.runtime.lastError;
        if (error) {
          console.error('Error saving the active class:', error);
        } else {
          console.log('Active class updated in storage:', message.className);
        }
      // Send current class state to Flask server
      const isActive = currentClass !== null;
      fetch('http://localhost:4999/toggle_class', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ class_name: currentClass, active: currentClass !== null })
      })
      .then(response => response.json())
      .then(data => {
        sendResponse({ success: true, data: data });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
      return true;

      
    });
    break;
    
    default:
      break;
  }
});

// Load the current class from storage, if it exists
chrome.storage.local.get([ACTIVE_CLASS_KEY], function(result) {
  if (result[ACTIVE_CLASS_KEY]) {
    currentClass = result[ACTIVE_CLASS_KEY]; // Updating the currentClass variable to whatever is stored
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    loadFromStorage(GEOLOCATION_KEY)
      .then((geolocation) => {
            const dataWithGeolocation = { url: changeInfo.url, tabId, geolocation };
            sendToFlaskServer(dataWithGeolocation);
      });
  }
});

chrome.tabs.onActivated.addListener(activeInfo => {
  chrome.tabs.get(activeInfo.tabId, tab => {
    loadFromStorage(GEOLOCATION_KEY)
        .then((geolocation) => {
          const dataWithGeolocation = { url: tab.url, tabId: tab.id, geolocation };
          sendToFlaskServer(dataWithGeolocation);
      });
  });
});


