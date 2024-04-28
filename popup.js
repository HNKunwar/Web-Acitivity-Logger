let currentClass = null;
let currentLocation = null;

// This is a certifiable mess and masterclass on how not to update code
document.addEventListener('DOMContentLoaded', () => {
  const classNameInput = document.getElementById('class-name');
  const addClassButton = document.getElementById('add-class');
  const classesListDiv = document.getElementById('classes-list');
  const locationNameInput = document.getElementById('location-name');
  const addLocationButton = document.getElementById('add-location');
  const locationsListDiv = document.getElementById('locations-list');
  const messageDiv = document.getElementById('message');
  const getLocationButton = document.getElementById('get-location');
  const locationInfoDiv = document.getElementById('location-info');

  addClassButton.addEventListener('click', () => {
    const className = classNameInput.value.trim();
    if (className) {
      chrome.runtime.sendMessage({ action: 'addClass', className }, (response) => {
        if (response.success) {
          classNameInput.value = '';
          loadClasses();
        } else {
          console.error('Error adding class:', response.error);
        }
      });
    }
  });

  addLocationButton.addEventListener('click', () => {
    const locationName = locationNameInput.value.trim();
    if (locationName) {
      chrome.runtime.sendMessage({ action: 'addLocation', locationName }, (response) => {
        if (response.success) {
          locationNameInput.value = '';
          loadLocations();
        } else {
          console.error('Error adding location:', response.error);
        }
      });
    }
  });

  classesListDiv.addEventListener('click', (event) => {
    if (event.target.classList.contains('remove-btn')) {
      const className = event.target.parentElement.querySelector('.class-name').textContent;
      removeClass(className);
    }
  });

  locationsListDiv.addEventListener('click', (event) => {
    if (event.target.classList.contains('remove-btn')) {
      const locationName = event.target.parentElement.querySelector('.location-name').textContent;
      removeLocation(locationName);
    } else if (event.target.classList.contains('edit-nickname-btn')) {
      const locationDiv = event.target.parentElement;
      const locationName = locationDiv.querySelector('.location-name').textContent;
      const currentNickname = locationDiv.querySelector('.nickname')?.textContent || '';
      showEditNicknameModal(locationName, currentNickname);
    }
  });

  loadClasses();
  loadLocations();

  // Listen for messages from the background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'showPopupMessage') {
      messageDiv.textContent = message.message;
      messageDiv.style.display = 'block';
    } else if (message.action === 'updateActiveLocation') {
      const { locationName, nickname, isNewLocation } = message;
      updateActiveLocation(locationName, nickname, isNewLocation);
    }
  });

  // Load the active location from storage
  chrome.storage.local.get(['activeLocation'], (result) => {
    if (result.activeLocation) {
      const { locationName, nickname } = result.activeLocation;
      updateActiveLocation(locationName, nickname, false);
    }
  });
});

function showEditNicknameModal(locationName, currentNickname) {
  const newNickname = prompt('Enter a new nickname for this location:', currentNickname);
  if (newNickname !== null && newNickname !== currentNickname) {
    chrome.runtime.sendMessage({ action: 'updateNickname', locationName, newNickname }, (response) => {
      if (response.success) {
        const locationDiv = document.querySelector(`.location-item[data-name="${locationName}"]`);
        const nicknameSpan = locationDiv.querySelector('.nickname');
        nicknameSpan.textContent = newNickname;
      } else {
        console.error('Error updating nickname:', response.error);
      }
    });
  }
}

function updateActiveLocation(locationName, nickname, isNewLocation) {
  const locationDiv = document.querySelector(`.location-item[data-name="${locationName}"]`);
  if (locationDiv) {
    const nicknameSpan = locationDiv.querySelector('.nickname');
    if (nicknameSpan) {
      nicknameSpan.textContent = nickname;
    } else {
      const newNicknameSpan = document.createElement('span');
      newNicknameSpan.classList.add('nickname');
      newNicknameSpan.textContent = nickname;
      locationDiv.appendChild(newNicknameSpan);
    }
    locationDiv.classList.add('toggle-active');
    currentLocation = locationName;
  } else if (isNewLocation) {
    // If the location doesn't exist, create a new item
    const newLocationDiv = document.createElement('div');
    newLocationDiv.classList.add('location-item', 'toggle-active');
    newLocationDiv.dataset.name = locationName;
    const locationNameSpan = document.createElement('span');
    locationNameSpan.classList.add('location-name');
    locationNameSpan.textContent = locationName;
    const nicknameSpan = document.createElement('span');
    nicknameSpan.classList.add('nickname');
    nicknameSpan.textContent = nickname;
    const removeButton = document.createElement('button');
    removeButton.classList.add('remove-btn');
    removeButton.textContent = 'X';
    const editNicknameButton = document.createElement('button');
    editNicknameButton.classList.add('edit-nickname-btn');
    editNicknameButton.textContent = '...';
    newLocationDiv.appendChild(locationNameSpan);
    newLocationDiv.appendChild(nicknameSpan);
    newLocationDiv.appendChild(removeButton);
    newLocationDiv.appendChild(editNicknameButton);
    locationsListDiv.appendChild(newLocationDiv);
    currentLocation = locationName;
  }

  // Store the active location in storage
  chrome.storage.local.set({ 'activeLocation': { locationName, nickname } });
}

function updateClassUI(activeClass) {
  const classItems = document.querySelectorAll('.class-item');
  classItems.forEach(classDiv => {
    const className = classDiv.querySelector('.class-name').textContent;
    if (className === activeClass) {
      classDiv.classList.add('toggle-active');
    } else {
      classDiv.classList.remove('toggle-active');
    }
  });
}

function loadClasses() {
  chrome.runtime.sendMessage({ action: 'getClasses' }, (response) => {
    if (response.error) {
      console.error('Error loading classes:', response.error);
    } else {
      const classesListDiv = document.getElementById('classes-list');
      classesListDiv.innerHTML = '';
      response.classes.forEach((className) => {
        const classDiv = document.createElement('div');
        classDiv.classList.add('class-item');
        classDiv.dataset.name = className;
        const classNameSpan = document.createElement('span');
        classNameSpan.classList.add('class-name');
        classNameSpan.textContent = className;
        classNameSpan.addEventListener('click', () => toggleClass(className, classDiv));
        const removeButton = document.createElement('button');
        removeButton.classList.add('remove-btn');
        removeButton.textContent = 'X';
        classDiv.appendChild(classNameSpan);
        classDiv.appendChild(removeButton);
        classesListDiv.appendChild(classDiv);
        if (currentClass && className === currentClass) {
          const classDiv = document.querySelector(`.class-item[data-name="${currentClass}"]`);
          if (classDiv) {
            classDiv.classList.add('toggle-active');
          }
        }
      });
      chrome.storage.local.get(['activeClass'], (result) => {
        const activeClass = result.activeClass;
        updateClassUI(activeClass);
      });
    }
  });
}

function toggleClass(className, classDiv) {
  const isActive = classDiv.classList.contains('toggle-active');
  // Untoggle any currently active class
  const currentActiveClassDiv = document.querySelector('.class-item.toggle-active');
  if (currentActiveClassDiv) {
    currentActiveClassDiv.classList.remove('toggle-active');
    const currentActiveClassName = currentActiveClassDiv.querySelector('.class-name').textContent;
    if (className !== currentActiveClassName) {
      // Notify about untoggling the previous class
      chrome.runtime.sendMessage({ action: 'setCurrentClass', className: null });
    }
  }
  // Toggle the clicked class
  if (isActive) {
    classDiv.classList.remove('toggle-active');
    currentClass = null;
  } else {
    classDiv.classList.add('toggle-active');
    currentClass = className;
  }

  // Store the new state to local storage
  chrome.storage.local.set({ 'activeClass': currentClass });
  // Sends the active class or null to the background script
  chrome.runtime.sendMessage({ action: 'setCurrentClass', className: currentClass });
}

function removeClass(className) {
  chrome.runtime.sendMessage({ action: 'removeClass', className }, (response) => {
    if (response && response.success) {
      loadClasses();
    } else if (response && response.error) {
      console.error('Error removing class:', response.error);
    } else {
      console.error('Unknown error occurred while removing a class.');
    }
  });
}

function loadLocations() {
  chrome.runtime.sendMessage({ action: 'getLocations' }, (response) => {
    if (response.error) {
      console.error('Error loading locations:', response.error);
    } else {
      const locationsListDiv = document.getElementById('locations-list');
      locationsListDiv.innerHTML = '';
      response.locations.forEach((location) => {
        const locationDiv = document.createElement('div');
        locationDiv.classList.add('location-item');
        locationDiv.dataset.name = location.address;
        const locationSpan = document.createElement('span');
        locationSpan.classList.add('location-name');
        locationSpan.textContent = location.address;
        locationSpan.addEventListener('click', () => toggleLocation(location.address, locationDiv));
        const nicknameSpan = document.createElement('span');
        nicknameSpan.classList.add('nickname');
        nicknameSpan.textContent = location.nickname || '';
        const removeButton = document.createElement('button');
        removeButton.classList.add('remove-btn');
        removeButton.textContent = 'X';
        const editNicknameButton = document.createElement('button');
        editNicknameButton.classList.add('edit-nickname-btn');
        editNicknameButton.textContent = '...';
        locationDiv.appendChild(locationSpan);
        locationDiv.appendChild(nicknameSpan);
        locationDiv.appendChild(removeButton);
        locationDiv.appendChild(editNicknameButton);
        locationsListDiv.appendChild(locationDiv);
      });
    }
  });
}

function toggleLocation(locationName, locationDiv) {
  const isActive = locationDiv.classList.contains('toggle-active');
  // Untoggle any currently active location
  const currentActiveLocationDiv = document.querySelector('.location-item.toggle-active');
  if (currentActiveLocationDiv) {
    currentActiveLocationDiv.classList.remove('toggle-active');
    const currentActiveLocationName = currentActiveLocationDiv.querySelector('.location-name').textContent;
    console.log(`[${currentActiveLocationName}] untoggled`);
  }
  if (isActive) {
    locationDiv.classList.remove('toggle-active');
    console.log(`[${locationName}] untoggled`);
  } else {
    locationDiv.classList.add('toggle-active');
    console.log(`[${locationName}] toggled`);
  }
  // Send the toggled location to the background script
  chrome.runtime.sendMessage({ action: 'setCurrentLocation', locationName: isActive ? null : locationName });
}

function removeLocation(locationName) {
  chrome.runtime.sendMessage({ action: 'removeLocation', locationName }, (response) => {
    if (response && response.success) {
      loadLocations();
    } else if (response && response.error) {
      console.error('Error removing location:', response.error);
    } else {
      console.error('Unknown error occurred while removing a location.');
    }
  });
}
