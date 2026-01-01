// BlackBox Driver App - Renderer Process

// DOM Elements
const elements = {
  // Tab navigation
  tabButtons: document.querySelectorAll('.tab-btn'),
  tabPanes: document.querySelectorAll('.tab-pane'),

  // Status indicators
  statusIcon: document.getElementById('status-icon'),
  statusText: document.getElementById('status-text'),
  simStatus: document.getElementById('sim-status'),
  serverStatus: document.getElementById('server-status'),
  driverName: document.getElementById('driver-name'),
  videoStatus: document.getElementById('video-status'),
  videoResolution: document.getElementById('video-resolution'),

  // Stats
  dataPoints: document.getElementById('data-points'),
  dataRate: document.getElementById('data-rate'),
  sessionDuration: document.getElementById('session-duration'),
  framesCaptured: document.getElementById('frames-captured'),

  // Buttons
  startTelemetry: document.getElementById('start-telemetry'),
  stopTelemetry: document.getElementById('stop-telemetry'),
  startVideo: document.getElementById('start-video'),
  stopVideo: document.getElementById('stop-video'),
  saveSettings: document.getElementById('save-settings'),
  resetSettings: document.getElementById('reset-settings'),
  addDriver: document.getElementById('add-driver'),
  saveDriver: document.getElementById('save-driver'),
  cancelDriver: document.getElementById('cancel-driver'),

  // Settings form elements
  serverUrl: document.getElementById('server-url'),
  authToken: document.getElementById('auth-token'),
  simSelect: document.getElementById('sim-select'),
  captureRate: document.getElementById('capture-rate'),
  localCache: document.getElementById('local-cache'),
  compressionEnabled: document.getElementById('compression-enabled'),
  compressionThreshold: document.getElementById('compression-threshold'),
  batchingEnabled: document.getElementById('batching-enabled'),
  batchSize: document.getElementById('batch-size'),
  videoEnabled: document.getElementById('video-enabled'),
  videoResolutionSelect: document.getElementById('video-resolution'),
  frameRate: document.getElementById('frame-rate'),
  autoStart: document.getElementById('auto-start'),
  startMinimized: document.getElementById('start-minimized'),
  minimizeToTray: document.getElementById('minimize-to-tray'),

  // Driver form
  driversList: document.getElementById('drivers-list'),
  driverForm: document.getElementById('driver-form'),
  driverNameInput: document.getElementById('driver-name'),
  driverEmailInput: document.getElementById('driver-email'),
  driverTeamInput: document.getElementById('driver-team'),

  // Log viewer
  logContainer: document.getElementById('log-container')
};

// Application state
const appState = {
  telemetryRunning: false,
  videoRunning: false,
  simConnected: false,
  serverConnected: false,
  currentDriver: null,
  dataPointCount: 0,
  dataRateValue: 0,
  sessionStartTime: null,
  frameCount: 0,
  driverProfiles: [],
  editingDriverId: null
};

// Tab navigation
elements.tabButtons.forEach(button => {
  button.addEventListener('click', () => {
    const tabName = button.getAttribute('data-tab');

    // Update active tab button
    elements.tabButtons.forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');

    // Show selected tab pane
    elements.tabPanes.forEach(pane => {
      pane.classList.remove('active');
      if (pane.id === tabName) {
        pane.classList.add('active');
      }
    });
  });
});

// Initialize the app
async function initializeApp() {
  // Add log entry
  addLogEntry('Application initialized');

  // Load settings
  await loadSettings();

  // Load driver profiles
  await loadDriverProfiles();

  // Set up event listeners
  setupEventListeners();

  // Set up IPC listeners
  setupIpcListeners();
}

// Load settings from main process
async function loadSettings() {
  try {
    const config = await window.api.invoke('get-config');

    if (config) {
      // Server settings
      elements.serverUrl.value = config.serverUrl || 'http://localhost:3000';
      elements.authToken.value = config.authToken || '';

      // Telemetry settings
      elements.simSelect.value = config.selectedSim || 'iracing';
      elements.captureRate.value = config.telemetryCaptureRate || 10;
      elements.localCache.checked = config.localCacheEnabled !== false;

      // Data transmission settings
      elements.compressionEnabled.checked = config.compressionEnabled !== false;
      elements.compressionThreshold.value = config.compressionThreshold || 1024;
      elements.batchingEnabled.checked = config.batchingEnabled === true;
      elements.batchSize.value = config.batchSize || 10;
      elements.batchSize.disabled = !config.batchingEnabled;

      // Video settings
      elements.videoEnabled.checked = config.videoEnabled === true;
      if (config.videoSettings) {
        elements.videoResolutionSelect.value = config.videoSettings.resolution || '640x480';
        elements.frameRate.value = config.videoSettings.frameRate || 15;
      }
      elements.videoResolutionSelect.disabled = !config.videoEnabled;
      elements.frameRate.disabled = !config.videoEnabled;

      // App settings
      elements.autoStart.checked = config.autoStart === true;
      elements.startMinimized.checked = config.startMinimized === true;
      elements.minimizeToTray.checked = config.minimizeToTray !== false;

      addLogEntry('Settings loaded');
    }
  } catch (err) {
    addLogEntry(`Error loading settings: ${err.message}`, 'error');
  }
}

// Load driver profiles from main process
async function loadDriverProfiles() {
  try {
    const drivers = await window.api.invoke('get-drivers');
    appState.driverProfiles = drivers || [];

    // Get current driver
    const currentDriver = await window.api.invoke('get-current-driver');
    appState.currentDriver = currentDriver;

    if (currentDriver) {
      elements.driverName.textContent = currentDriver.name;
    }

    // Render driver list
    renderDriversList();

    addLogEntry('Driver profiles loaded');
  } catch (err) {
    addLogEntry(`Error loading driver profiles: ${err.message}`, 'error');
  }
}

// Render the drivers list
function renderDriversList() {
  if (!elements.driversList) return;

  // Clear existing list
  elements.driversList.innerHTML = '';

  if (appState.driverProfiles.length === 0) {
    elements.driversList.innerHTML = '<p class="no-drivers">No driver profiles found. Click "Add Driver" to create one.</p>';
    return;
  }

  // Add each driver to the list
  appState.driverProfiles.forEach(driver => {
    const driverCard = document.createElement('div');
    driverCard.className = 'driver-card';
    if (appState.currentDriver && appState.currentDriver.id === driver.id) {
      driverCard.classList.add('active');
    }

    const createdDate = new Date(driver.createdAt).toLocaleDateString();

    driverCard.innerHTML = `
      <div class="driver-info">
        <h3>${driver.name}</h3>
        <p class="driver-details">
          ${driver.team ? `Team: ${driver.team}` : ''}
          ${driver.team && driver.email ? ' | ' : ''}
          ${driver.email ? `Email: ${driver.email}` : ''}
          <br>Created: ${createdDate}
        </p>
      </div>
      <div class="driver-actions">
        <button class="select-driver-btn" data-id="${driver.id}">Select</button>
        <button class="edit-driver-btn" data-id="${driver.id}">Edit</button>
        <button class="delete-driver-btn" data-id="${driver.id}">Delete</button>
      </div>
    `;

    elements.driversList.appendChild(driverCard);
  });

  // Add event listeners to the buttons
  document.querySelectorAll('.select-driver-btn').forEach(btn => {
    btn.addEventListener('click', () => selectDriver(btn.getAttribute('data-id')));
  });

  document.querySelectorAll('.edit-driver-btn').forEach(btn => {
    btn.addEventListener('click', () => editDriver(btn.getAttribute('data-id')));
  });

  document.querySelectorAll('.delete-driver-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteDriver(btn.getAttribute('data-id')));
  });
}

// Set up event listeners for UI elements
function setupEventListeners() {
  // Telemetry controls
  elements.startTelemetry.addEventListener('click', startTelemetry);
  elements.stopTelemetry.addEventListener('click', stopTelemetry);

  // Video controls
  elements.startVideo.addEventListener('click', startVideo);
  elements.stopVideo.addEventListener('click', stopVideo);

  // Settings controls
  elements.saveSettings.addEventListener('click', saveSettings);
  elements.resetSettings.addEventListener('click', resetSettings);
  elements.batchingEnabled.addEventListener('change', e => {
    elements.batchSize.disabled = !e.target.checked;
  });
  elements.videoEnabled.addEventListener('change', e => {
    elements.videoResolutionSelect.disabled = !e.target.checked;
    elements.frameRate.disabled = !e.target.checked;
  });

  // Driver controls
  elements.addDriver.addEventListener('click', showAddDriverForm);
  elements.saveDriver.addEventListener('click', saveDriver);
  elements.cancelDriver.addEventListener('click', cancelDriverForm);
}

// Set up IPC listeners for main process events
function setupIpcListeners() {
  // Status updates
  window.api.receive('status-update', (status) => {
    updateStatus(status);
  });

  // Telemetry status (reply from start/stop telemetry)
  window.api.receive('telemetry-status', (status) => {
    console.log('Received telemetry-status:', status);
    if (status.running) {
      addLogEntry('Telemetry capture started successfully', 'info');
      appState.telemetryRunning = true;
      elements.startTelemetry.disabled = true;
      elements.startTelemetry.textContent = 'Start Telemetry';
      elements.stopTelemetry.disabled = false;
      appState.sessionStartTime = Date.now();
      updateSessionDuration();
    } else {
      if (status.error) {
        addLogEntry(`Telemetry error: ${status.error}`, 'error');
      } else {
        addLogEntry('Telemetry capture stopped', 'info');
      }
      appState.telemetryRunning = false;
      elements.startTelemetry.disabled = false;
      elements.startTelemetry.textContent = 'Start Telemetry';
      elements.stopTelemetry.disabled = true;
    }
  });

  // Telemetry updates (continuous data)
  window.api.receive('telemetry-update', (data) => {
    updateTelemetryStats(data);
  });

  // Telemetry stats
  window.api.receive('telemetry-stats', (stats) => {
    updateTelemetryStats(stats);
  });

  // Error events
  window.api.receive('error', (error) => {
    addLogEntry(`Error: ${error.message}`, 'error');
  });

  // Show settings tab
  window.api.receive('show-settings', () => {
    showTab('settings');
  });
}

// Update application status
function updateStatus(status) {
  // Handle both naming conventions from main process
  // Main sends: isConnected, isRunning
  // Legacy expected: simConnected, serverConnected, telemetryRunning

  // Sim connection status
  const simConnected = status.simConnected ?? status.isConnected ?? appState.simConnected;
  if (simConnected !== undefined) {
    appState.simConnected = simConnected;
    elements.simStatus.textContent = simConnected ? 'Connected' : 'Disconnected';
  }

  // Server connection - assume connected if we got a status update
  const serverConnected = status.serverConnected ?? status.isConnected ?? true;
  appState.serverConnected = serverConnected;
  elements.serverStatus.textContent = serverConnected ? 'Connected' : 'Disconnected';

  // Telemetry running status
  const telemetryRunning = status.telemetryRunning ?? status.isRunning ?? appState.telemetryRunning;
  if (telemetryRunning !== undefined) {
    appState.telemetryRunning = telemetryRunning;
    elements.startTelemetry.disabled = telemetryRunning;
    elements.startTelemetry.textContent = 'Start Telemetry';
    elements.stopTelemetry.disabled = !telemetryRunning;

    if (telemetryRunning && !appState.sessionStartTime) {
      appState.sessionStartTime = Date.now();
      updateSessionDuration();
    }
  }

  // Current driver
  if (status.currentDriver) {
    elements.driverName.textContent = status.currentDriver.name || 'None';
  }

  // Stats
  if (status.stats) {
    updateTelemetryStats(status.stats);
  }

  if (status.videoRunning !== undefined) {
    appState.videoRunning = status.videoRunning;
    elements.startVideo.disabled = status.videoRunning;
    elements.stopVideo.disabled = !status.videoRunning;
    elements.videoStatus.textContent = status.videoRunning ? 'Running' : 'Stopped';
  }

  if (status.videoResolution) {
    elements.videoResolution.textContent = status.videoResolution;
  }

  // Update overall status indicator in header
  const isFullyConnected = appState.simConnected && appState.serverConnected;
  elements.statusIcon.className = isFullyConnected ? 'status-icon connected' : 'status-icon';
  elements.statusText.textContent = isFullyConnected ? 'Connected' : (appState.serverConnected ? 'Waiting for Sim' : 'Disconnected');

  // Log status change (condensed)
  addLogEntry(`Status update: ${JSON.stringify({ running: telemetryRunning, simConnected, serverConnected })}`);
}

// Update telemetry statistics
function updateTelemetryStats(data) {
  if (data.dataPointCount !== undefined) {
    appState.dataPointCount = data.dataPointCount;
    elements.dataPoints.textContent = data.dataPointCount.toLocaleString();
  }

  if (data.dataRate !== undefined) {
    appState.dataRateValue = data.dataRate;
    elements.dataRate.textContent = `${data.dataRate.toFixed(1)} Hz`;
  }

  if (data.frameCount !== undefined) {
    appState.frameCount = data.frameCount;
    elements.framesCaptured.textContent = data.frameCount.toLocaleString();
  }
}

// Update session duration timer
function updateSessionDuration() {
  if (!appState.sessionStartTime || !appState.telemetryRunning) return;

  const elapsed = Date.now() - appState.sessionStartTime;
  const hours = Math.floor(elapsed / 3600000);
  const minutes = Math.floor((elapsed % 3600000) / 60000);
  const seconds = Math.floor((elapsed % 60000) / 1000);

  elements.sessionDuration.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  setTimeout(updateSessionDuration, 1000);
}

// Start telemetry capture
function startTelemetry() {
  console.log('startTelemetry() called - sending IPC');
  addLogEntry('Starting telemetry capture...');
  elements.startTelemetry.disabled = true; // Immediate feedback
  elements.startTelemetry.textContent = 'Starting...';
  window.api.send('start-telemetry');
}

// Stop telemetry capture
function stopTelemetry() {
  window.api.send('stop-telemetry');
  addLogEntry('Stopping telemetry capture...');
}

// Start video capture
function startVideo() {
  window.api.send('start-video');
  addLogEntry('Starting video capture...');
}

// Stop video capture
function stopVideo() {
  window.api.send('stop-video');
  addLogEntry('Stopping video capture...');
}

// Save settings
function saveSettings() {
  const settings = {
    // Server settings
    serverUrl: elements.serverUrl.value,
    authToken: elements.authToken.value,

    // Telemetry settings
    selectedSim: elements.simSelect.value,
    telemetryCaptureRate: parseInt(elements.captureRate.value, 10),
    localCacheEnabled: elements.localCache.checked,

    // Data transmission settings
    compressionEnabled: elements.compressionEnabled.checked,
    compressionThreshold: parseInt(elements.compressionThreshold.value, 10),
    batchingEnabled: elements.batchingEnabled.checked,
    batchSize: parseInt(elements.batchSize.value, 10),

    // Video settings
    videoEnabled: elements.videoEnabled.checked,
    videoSettings: {
      resolution: elements.videoResolutionSelect.value,
      frameRate: parseInt(elements.frameRate.value, 10),
      quality: 80
    },

    // App settings
    autoStart: elements.autoStart.checked,
    startMinimized: elements.startMinimized.checked,
    minimizeToTray: elements.minimizeToTray.checked
  };

  window.api.send('update-settings', settings);
  addLogEntry('Settings saved');
}

// Reset settings to default
function resetSettings() {
  if (confirm('Are you sure you want to reset all settings to default?')) {
    window.api.send('reset-settings');
    addLogEntry('Settings reset to default');

    // Reload settings
    setTimeout(loadSettings, 500);
  }
}

// Show add driver form
function showAddDriverForm() {
  appState.editingDriverId = null;
  elements.driverForm.querySelector('h3').textContent = 'Add Driver';
  elements.driverNameInput.value = '';
  elements.driverEmailInput.value = '';
  elements.driverTeamInput.value = '';
  elements.driverForm.classList.remove('hidden');
}

// Edit driver
function editDriver(driverId) {
  const driver = appState.driverProfiles.find(d => d.id === driverId);
  if (!driver) return;

  appState.editingDriverId = driverId;
  elements.driverForm.querySelector('h3').textContent = 'Edit Driver';
  elements.driverNameInput.value = driver.name || '';
  elements.driverEmailInput.value = driver.email || '';
  elements.driverTeamInput.value = driver.team || '';
  elements.driverForm.classList.remove('hidden');
}

// Save driver
function saveDriver() {
  const name = elements.driverNameInput.value.trim();
  if (!name) {
    alert('Driver name is required');
    return;
  }

  const driverData = {
    name,
    email: elements.driverEmailInput.value.trim(),
    team: elements.driverTeamInput.value.trim()
  };

  if (appState.editingDriverId) {
    // Update existing driver
    window.api.send('update-driver', {
      id: appState.editingDriverId,
      ...driverData
    });
    addLogEntry(`Driver "${name}" updated`);
  } else {
    // Create new driver
    window.api.send('create-driver', driverData);
    addLogEntry(`Driver "${name}" created`);
  }

  // Hide form and reload drivers
  elements.driverForm.classList.add('hidden');
  setTimeout(loadDriverProfiles, 500);
}

// Cancel driver form
function cancelDriverForm() {
  elements.driverForm.classList.add('hidden');
  appState.editingDriverId = null;
}

// Select driver
function selectDriver(driverId) {
  window.api.send('select-driver', { id: driverId });
  addLogEntry(`Driver selected`);

  // Reload driver profiles
  setTimeout(loadDriverProfiles, 500);
}

// Delete driver
function deleteDriver(driverId) {
  const driver = appState.driverProfiles.find(d => d.id === driverId);
  if (!driver) return;

  if (confirm(`Are you sure you want to delete driver "${driver.name}"?`)) {
    window.api.send('delete-driver', { id: driverId });
    addLogEntry(`Driver "${driver.name}" deleted`);

    // Reload driver profiles
    setTimeout(loadDriverProfiles, 500);
  }
}

// Show specific tab
function showTab(tabName) {
  const tabButton = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
  if (tabButton) {
    tabButton.click();
  }
}

// Add log entry
function addLogEntry(message, type = 'info') {
  if (!elements.logContainer) return;

  const now = new Date();
  const timeString = now.toLocaleTimeString();

  const logEntry = document.createElement('div');
  logEntry.className = `log-entry ${type}`;
  logEntry.innerHTML = `
    <span class="log-time">${timeString}</span>
    <span class="log-message">${message}</span>
  `;

  elements.logContainer.appendChild(logEntry);
  elements.logContainer.scrollTop = elements.logContainer.scrollHeight;

  // Limit log entries
  while (elements.logContainer.children.length > 100) {
    elements.logContainer.removeChild(elements.logContainer.firstChild);
  }
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);
