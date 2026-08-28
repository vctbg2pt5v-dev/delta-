const sites = {
  north: {
    pressureMin: 150,
    pressureMax: 20000,
    battery: 24.6,
    flowRate: 9.4,
    throughput: 92,
    efficiency: 96.4,
    vibration: 1.7,
    status: 'Stable',
    statusClass: 'stable',
    alerts: [
      { title: 'Separator pressure', detail: 'Slight rise • 6 min ago', level: 'warning' },
      { title: 'Valve cycle complete', detail: 'Nominal response • 4 min ago', level: 'warning' },
      { title: 'Piping inspection', detail: 'No action required • 2 min ago', level: 'critical' }
    ]
  },
  offshore: {
    pressureMin: 2720,
    pressureMax: 3850,
    battery: 23.8,
    flowRate: 8.7,
    throughput: 88,
    efficiency: 94.1,
    vibration: 2.2,
    status: 'Watch',
    statusClass: 'warning',
    alerts: [
      { title: 'Drill string torque', detail: 'Elevated variation • 4 min ago', level: 'critical' },
      { title: 'Water cut variance', detail: 'Monitoring in range • 2 min ago', level: 'warning' },
      { title: 'Flowline temp drift', detail: 'Corrective action scheduled • 1 min ago', level: 'warning' }
    ]
  },
  gas: {
    pressureMin: 2150,
    pressureMax: 3300,
    battery: 26.1,
    flowRate: 11.2,
    throughput: 96,
    efficiency: 98.2,
    vibration: 1.3,
    status: 'Stable',
    statusClass: 'stable',
    alerts: [
      { title: 'Gas quality index', detail: 'Within target • 5 min ago', level: 'warning' },
      { title: 'Knockout drum level', detail: 'Nominal • 2 min ago', level: 'warning' },
      { title: 'Compressor seal check', detail: 'Routine inspection • 1 min ago', level: 'critical' }
    ]
  }
};

const state = {
  activeSite: 'north',
  live: false,
  systemStarted: false,
  targetThroughput: 82,
    testMode: false,

  testReadings: {
    pressureMin: 2500,
    pressureMax: 3500,
    battery: 24,
    flowRate: 10
  },
  thresholds: {
  pressureMin: 2300,
  pressureMax: 3800,
  batteryMin: 20,
  flowMin: 6
},

thresholdsEnabled: false,
  alarmActive: false,
  emergencyLockout: false,
  series: [
    82, 84, 83, 86, 87, 89, 88, 92, 91, 94, 93, 96,
    95, 97, 98, 96, 99, 101, 100, 98, 102, 105, 104, 107, 109, 106, 110
  ],
  alarmCounter: 0,
  alarmTimer: null,
  audioContext: null,
  sirenMuted: false,
  faultOverlayTimer: null,
  faultOverlayDismissed: false,
  lastErrorMessage: null,
  sitesData: {
    north: { pressureMin: 0, pressureMax: 0, battery: 0, flowRate: 0 },
    offshore: { pressureMin: 0, pressureMax: 0, battery: 0, flowRate: 0 },
    gas: { pressureMin: 0, pressureMax: 0, battery: 0, flowRate: 0 }
  },
  errorSite: null
};

// ============================================
// LOAD SAVED TEST VALUES
// ============================================

const savedTestReadings =
  localStorage.getItem('deltaDashboardTestReadings');

if (savedTestReadings) {
  try {
    const saved = JSON.parse(savedTestReadings);

    state.testReadings.pressureMin = Number(saved.pressureMin);
    state.testReadings.pressureMax = Number(saved.pressureMax);
    state.testReadings.battery = Number(saved.battery);
    state.testReadings.flowRate = Number(saved.flowRate);
  } catch (error) {
    console.warn('Could not load saved test readings:', error);
  }
}

const savedTestMode =
  localStorage.getItem('deltaDashboardTestMode');

if (savedTestMode !== null) {
  state.testMode = savedTestMode === 'true';
}
const values = {
  pressureMin: document.getElementById('pressureMinValue'),
  pressureMinDelta: document.getElementById('pressureMinDelta'),
  pressureMax: document.getElementById('pressureMaxValue'),
  pressureMaxDelta: document.getElementById('pressureMaxDelta'),
  battery: document.getElementById('batteryValue'),
  batteryDelta: document.getElementById('batteryDelta'),
  flowRate: document.getElementById('flowRateValue'),
  flowRateDelta: document.getElementById('flowRateDelta'),
  throughput: document.getElementById('throughputValue'),
  efficiency: document.getElementById('efficiencyValue'),
  vibration: document.getElementById('vibrationValue'),
  statusPill: document.getElementById('statusPill'),
  targetSlider: document.getElementById('targetSlider'),
  targetValue: document.getElementById('targetValue'),
  minPressureLimit: document.getElementById('minPressureLimit'),
  maxPressureLimit: document.getElementById('maxPressureLimit'),
  batteryLimit: document.getElementById('batteryLimit'),
  flowLimit: document.getElementById('flowLimit'),
  setThresholdsBtn:
  document.getElementById('setThresholdsBtn'),
  alarmStatus: document.getElementById('alarmStatus'),
  alarmList: document.getElementById('alarmList'),
  pauseBtn: document.getElementById('pauseBtn'),
  ackBtn: document.getElementById('ackBtn'),
  sirenCloseBtn: document.getElementById('sirenCloseBtn'),
  faultDrawer: document.getElementById('faultDrawer'),
  faultDrawerMessage: document.getElementById('faultDrawerMessage'),
  faultDrawerMuteBtn: document.getElementById('faultDrawerMuteBtn'),
  faultDrawerToggle: document.getElementById('faultDrawerToggle'),
  emergencyShutdownBtn: document.getElementById('emergencyShutdownBtn'),
  emergencyLockStatus: document.getElementById('emergencyLockStatus'),
  resetBtn: document.getElementById('resetBtn'),
  siteLocation: document.getElementById('siteLocation'),
  errorOverlay: document.getElementById('errorOverlay'),
  errorLabel: document.getElementById('errorLabel'),
  compressorSwitch: document.getElementById('compressorSwitch'),
  leakSwitch: document.getElementById('leakSwitch'),
  shutdownSwitch: document.getElementById('shutdownSwitch')
};

const chartLine = document.getElementById('chartLine');
const chartArea = document.getElementById('chartArea');
const gridLayer = document.getElementById('gridLayer');

function formatNumber(value) {
  return new Intl.NumberFormat('en-US').format(Math.round(value));
}

function buildGrid() {
  gridLayer.innerHTML = '';
  for (let i = 0; i < 5; i += 1) {
    const y = (i / 4) * 210;
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', '0');
    line.setAttribute('x2', '680');
    line.setAttribute('y1', String(y));
    line.setAttribute('y2', String(y));
    line.setAttribute('stroke', 'rgba(255,255,255,0.06)');
    line.setAttribute('stroke-width', '1');
    gridLayer.appendChild(line);
  }
}

function renderTrend() {
  const valuesToPlot = state.series;
  const width = 680;
  const height = 220;
  const padding = 18;
  const min = Math.min(...valuesToPlot) - 8;
  const max = Math.max(...valuesToPlot) + 8;

  const points = valuesToPlot.map((point, index) => {
    const x = padding + (index / (valuesToPlot.length - 1)) * (width - padding * 2);
    const y = height - padding - ((point - min) / (max - min || 1)) * (height - padding * 2);
    return [x, y];
  });

  const linePath = points
    .map(([x, y], index) => `${index === 0 ? 'M' : 'L'} ${x} ${y}`)
    .join(' ');

  const areaPath = `${linePath} L ${points[points.length - 1][0]} ${height - padding} L ${points[0][0]} ${height - padding} Z`;

  chartLine.setAttribute('d', linePath);
  chartArea.setAttribute('d', areaPath);
}

function renderAlerts() {
  const site = sites[state.activeSite];
  values.alarmList.innerHTML = '';

  site.alerts.forEach((alert) => {
    const li = document.createElement('li');
    const levelClass = alert.level === 'critical' ? 'critical' : 'warning';
    li.innerHTML = `
      <div>
        <strong>${alert.title}</strong>
        <span>${alert.detail}</span>
      </div>
      <span class="alarm-tag ${levelClass}">${alert.level}</span>
    `;
    values.alarmList.appendChild(li);
  });
}

function initAudio() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;
  if (!state.audioContext) {
    state.audioContext = new AudioCtx();
  }
  if (state.audioContext.state === 'suspended') {
    state.audioContext.resume();
  }
}

function triggerBuzzer() {
  initAudio();
  if (!state.audioContext || state.sirenMuted) return;

  const oscillator = state.audioContext.createOscillator();
  const gainNode = state.audioContext.createGain();

  oscillator.type = 'sawtooth';
  oscillator.frequency.setValueAtTime(900, state.audioContext.currentTime);
  oscillator.frequency.linearRampToValueAtTime(1500, state.audioContext.currentTime + 0.18);
  oscillator.frequency.linearRampToValueAtTime(700, state.audioContext.currentTime + 0.36);

  gainNode.gain.setValueAtTime(0.0001, state.audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.22, state.audioContext.currentTime + 0.02);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, state.audioContext.currentTime + 0.36);

  oscillator.connect(gainNode);
  gainNode.connect(state.audioContext.destination);
  oscillator.start();
  oscillator.stop(state.audioContext.currentTime + 0.38);
}

function startAlarmLoop() {
  if (state.alarmTimer) return;
  triggerBuzzer();
  state.alarmTimer = setInterval(() => {
    triggerBuzzer();
  }, 350);
}

function stopAlarmLoop() {
  if (state.alarmTimer) {
    clearInterval(state.alarmTimer);
    state.alarmTimer = null;
  }
}

function setSirenButtonState() {
  [values.sirenCloseBtn, values.faultDrawerMuteBtn].forEach((button) => {
    if (!button) return;
    button.disabled = false;
    button.style.opacity = state.sirenMuted ? '0.7' : '1';
    button.textContent = state.sirenMuted ? 'Siren Muted' : 'Silence Siren';
  });
}

function silenceSiren() {
  state.sirenMuted = !state.sirenMuted;
  if (state.sirenMuted) {
    stopAlarmLoop();
  } else if (state.alarmActive) {
    startAlarmLoop();
  }
  setSirenButtonState();
}

function dismissMainError() {
  state.faultOverlayDismissed = true;
  values.errorOverlay.classList.remove('visible');
  values.faultDrawer.classList.add('visible');
  if (values.faultDrawerToggle) {
    values.faultDrawerToggle.textContent = 'CLOSE';
  }
}

function showFaultMessage(message) {

  // Do not trigger faults while system is OFF
  if (!state.systemStarted) {
    return;
  }

  const cleanMessage = message || 'System threshold exceeded';
  values.errorLabel.textContent = cleanMessage;
  values.faultDrawerMessage.textContent = cleanMessage;
  values.faultDrawer.classList.add('visible');

  if (state.faultOverlayDismissed) {
    values.errorOverlay.classList.remove('visible');
    return;
  }

  // Only show overlay if it's a different error from the last one
  if (state.lastErrorMessage === cleanMessage) {
    values.errorOverlay.classList.remove('visible');
    return;
  }

  state.lastErrorMessage = cleanMessage;

  // New error detected - unmute siren and restart alarm even if it was muted
  if (state.sirenMuted) {
    state.sirenMuted = false;
    setSirenButtonState();
  }
  startAlarmLoop();

  if (state.faultOverlayTimer) {
    clearTimeout(state.faultOverlayTimer);
    state.faultOverlayTimer = null;
  }

  values.errorOverlay.classList.add('visible');

  state.faultOverlayTimer = setTimeout(() => {
    dismissMainError();
    state.faultOverlayTimer = null;
  }, 5000);
}

function immediateShutdown() {
  const shutdownBtn = document.getElementById('shutdownSwitch');
  const statusPill = document.getElementById('statusPill');

  state.emergencyLockout = true;
  shutdownBtn.textContent = 'On';
  shutdownBtn.classList.add('on');
  statusPill.textContent = 'Shutdown';
  statusPill.className = 'status-pill danger';
  showFaultMessage('Shutdown in progress');

  values.emergencyLockStatus.textContent = 'Locked';
  values.emergencyLockStatus.style.color = '#ff7a7a';
  values.resetBtn.disabled = false;
  values.resetBtn.textContent = 'Reset to Online';

  document.body.classList.add('alarm-mode');
  document.querySelector('.dashboard-shell').classList.add('alarm-mode');

  state.alarmActive = true;
  values.alarmStatus.textContent = 'Alarm';
  values.alarmStatus.classList.add('alarm');

  state.sirenMuted = false;
  setSirenButtonState();
  startAlarmLoop();
}

function resetProcess() {
  const shutdownBtn = document.getElementById('shutdownSwitch');
  const statusPill = document.getElementById('statusPill');

  if (state.faultOverlayTimer) {
    clearTimeout(state.faultOverlayTimer);
    state.faultOverlayTimer = null;
  }
  state.faultOverlayDismissed = false;
  state.lastErrorMessage = null;

  state.emergencyLockout = false;
  shutdownBtn.textContent = 'Off';
  shutdownBtn.classList.remove('on');
  statusPill.textContent = 'Stable';
  statusPill.className = 'status-pill stable';

  values.emergencyLockStatus.textContent = 'Online';
  values.emergencyLockStatus.style.color = '#6ee7b7';

  document.body.classList.remove('alarm-mode');
  document.querySelector('.dashboard-shell').classList.remove('alarm-mode');
  values.errorOverlay.classList.remove('visible');
  values.faultDrawer.classList.remove('visible');

  state.alarmActive = false;
  values.alarmStatus.textContent = 'Normal';
  values.alarmStatus.classList.remove('alarm');
  stopAlarmLoop();
  state.sirenMuted = false;

  values.resetBtn.disabled = true;
  values.resetBtn.textContent = 'Reset to Online';
  if (values.faultDrawerToggle) {
    values.faultDrawerToggle.textContent = 'CLOSE';
  }

  state.sirenMuted = false;
  setSirenButtonState();
}

function updateThresholdsFromInputs() {

  const pressureMin = values.minPressureLimit.value.trim();
  const pressureMax = values.maxPressureLimit.value.trim();
  const batteryMin = values.batteryLimit.value.trim();
  const flowMin = values.flowLimit.value.trim();

  // Do not enable the alarm until the user
  // has actually entered threshold values.
  if (
    pressureMin === '' ||
    pressureMax === '' ||
    batteryMin === '' ||
    flowMin === ''
  ) {
    state.thresholdsEnabled = false;
    return;
  }

  state.thresholds.pressureMin = Number(pressureMin);
  state.thresholds.pressureMax = Number(pressureMax);
  state.thresholds.batteryMin = Number(batteryMin);
  state.thresholds.flowMin = Number(flowMin);

  // User has manually configured the thresholds
  state.thresholdsEnabled = true;

  localStorage.setItem(
    'deltaDashboardThresholds',
    JSON.stringify(state.thresholds)
  );

  updateSiteData();
}

function evaluateThresholds(pressureMin, pressureMax, battery, flowRate) {

  // Threshold alarm is disabled until the user
  // manually sets the threshold values.
  if (!state.thresholdsEnabled) {
    return;
  }

  const issues = [];

  if (pressureMin < state.thresholds.pressureMin) issues.push('Pressure low');
  if (pressureMax > state.thresholds.pressureMax) issues.push('Pressure high');
  if (battery < state.thresholds.batteryMin) issues.push('Battery low');
  if (flowRate < state.thresholds.flowMin) issues.push('Flow low');

  if (state.emergencyLockout) {
    document.body.classList.add('alarm-mode');
    document.querySelector('.dashboard-shell').classList.add('alarm-mode');
    values.errorOverlay.classList.add('visible');
    values.errorLabel.textContent = 'Shutdown in progress';
    state.alarmActive = true;
    values.alarmStatus.textContent = 'Alarm';
    values.alarmStatus.classList.add('alarm');
    startAlarmLoop();
    return;
  }

  const alarmOn = issues.length > 0;

  document.body.classList.toggle('alarm-mode', alarmOn);
  document.querySelector('.dashboard-shell').classList.toggle('alarm-mode', alarmOn);

  if (alarmOn && !state.faultOverlayDismissed) {
    if (issues.length) {
      showFaultMessage(issues.join(' • '));
    } else {
      showFaultMessage('System threshold exceeded');
    }
  } else if (alarmOn) {
    values.errorOverlay.classList.remove('visible');
    values.faultDrawer.classList.add('visible');
  } else {
    if (state.faultOverlayTimer) {
      clearTimeout(state.faultOverlayTimer);
      state.faultOverlayTimer = null;
    }
    state.faultOverlayDismissed = false;
    state.lastErrorMessage = null;
    values.errorOverlay.classList.remove('visible');
    values.faultDrawer.classList.remove('visible');
  }

  if (alarmOn) {
    state.alarmActive = true;
    values.alarmStatus.textContent = 'Alarm';
    values.alarmStatus.classList.add('alarm');
    startAlarmLoop();
  } else {
    state.alarmActive = false;
    values.alarmStatus.textContent = 'Normal';
    values.alarmStatus.classList.remove('alarm');
    stopAlarmLoop();
  }
}


function updateAllSitesData() {
  Object.keys(sites).forEach((siteKey) => {
    const site = sites[siteKey];

    if (state.testMode) {
      state.sitesData[siteKey] = {
        pressureMin: Number(state.testReadings.pressureMin),
        pressureMax: Number(state.testReadings.pressureMax),
        battery: Number(state.testReadings.battery),
        flowRate: Number(state.testReadings.flowRate)
      };

      return;
    }

    const offset = Math.random() * 12 - 6;
    const throughputFactor = state.targetThroughput / 100;

    const pressureMin = Math.max(
      3000,
      site.pressureMin + offset * 18
    );

    const pressureMax = Math.max(
      2500,
      site.pressureMax + offset * 22
    );

    const battery = Math.min(
      30,
      Math.max(
        18,
        site.battery + (Math.random() - 0.5) * 1.8
      )
    );

    const flowRate = Math.max(
      4,
      site.flowRate + offset * 0.42 + throughputFactor * 1.1
    );

    state.sitesData[siteKey] = {
      pressureMin,
      pressureMax,
      battery,
      flowRate
    };
  });
}

function findErrorSite() {
  // Check all sites for errors
  for (const siteKey of Object.keys(sites)) {
    const data = state.sitesData[siteKey];
    const issues = [];

    if (data.pressureMin < state.thresholds.pressureMin) issues.push('Pressure low');
    if (data.pressureMax > state.thresholds.pressureMax) issues.push('Pressure high');
    if (data.battery < state.thresholds.batteryMin) issues.push('Battery low');
    if (data.flowRate < state.thresholds.flowMin) issues.push('Flow low');

    if (issues.length > 0) {
      return { site: siteKey, message: issues.join(' • ') };
    }
  }
  return null;
}

function updateSiteData() {
  const site = sites[state.activeSite];
  const siteData = state.sitesData[state.activeSite];
  const offset = Math.random() * 12 - 6;
  const throughputFactor = state.targetThroughput / 100;

  const pressureMin = siteData.pressureMin;
  const pressureMax = siteData.pressureMax;
  const battery = siteData.battery;
  const flowRate = siteData.flowRate;
  const efficiency = Math.min(99.9, Math.max(88, site.efficiency + (Math.random() - 0.5) * 2.5 + (state.targetThroughput - 82) * 0.1));
  const vibration = Math.max(0.4, site.vibration + (Math.random() - 0.5) * 0.8);
  const throughput = Math.max(75, Math.min(100, site.throughput + (state.targetThroughput - 82) * 0.3 + Math.random() * 8 - 4));

  values.pressureMin.textContent = formatNumber(pressureMin);
  values.pressureMinDelta.textContent = 'psi';
  values.pressureMax.textContent = formatNumber(pressureMax);
  values.pressureMaxDelta.textContent = 'psi';
  values.battery.textContent = battery.toFixed(1);
  values.batteryDelta.textContent = 'V';
  values.flowRate.textContent = flowRate.toFixed(1);
  values.flowRateDelta.textContent = 'mmscf/d';
  values.throughput.textContent = `${Math.round(throughput)}%`;
  values.efficiency.textContent = `${efficiency.toFixed(1)}%`;
  values.vibration.textContent = `${vibration.toFixed(1)} mm/s`;

  evaluateThresholds(pressureMin, pressureMax, battery, flowRate);

  const status = throughput >= 95 ? 'Stable' : throughput >= 85 ? 'Watch' : 'Critical';
  const statusClass = throughput >= 95 ? 'stable' : throughput >= 85 ? 'warning' : 'danger';

  values.statusPill.textContent = status;
  values.statusPill.className = `status-pill ${statusClass}`;

  state.series.push(Math.max(70, Math.min(120, throughput * 1.14 + (Math.random() * 12 - 6))));
  if (state.series.length > 28) {
    state.series.shift();
  }
  renderTrend();
}

function updateSiteLocationLabel() {
  const labels = {
    north: 'CAPCO',
    offshore: 'AL KHOR',
    gas: 'RAS LAFFAN'
  };

  if (values.siteLocation) {
    values.siteLocation.textContent = labels[state.activeSite] || 'CAPCO';
  }
}

function setSite(siteKey) {
  state.activeSite = siteKey;
  document.querySelectorAll('.site-btn').forEach((button) => {
    button.classList.toggle('active', button.dataset.site === siteKey);
  });
  updateSiteLocationLabel();
  renderAlerts();
  updateSiteData();
}

function toggleLive() {
  state.live = !state.live;
  values.pauseBtn.textContent = state.live ? 'Pause feed' : 'Resume feed';
  values.pauseBtn.style.opacity = state.live ? '1' : '0.8';
}

function acknowledgeAlerts() {
  const site = sites[state.activeSite];
  site.alerts = [
    { title: 'No active faults', detail: 'System is in a normal state', level: 'warning' }
  ];
  renderAlerts();
  values.statusPill.textContent = 'Stable';
  values.statusPill.className = 'status-pill stable';
}

function updateTarget(value) {
  state.targetThroughput = Number(value);
  values.targetValue.textContent = `${state.targetThroughput}%`;
  updateSiteData();
}

function callEmergencyService(serviceType) {
  const services = {
    police: '911 - Police',
    ambulance: '911 - Ambulance/EMS',
    firefighter: '911 - Fire Department'
  };
  
  const serviceName = services[serviceType] || 'Emergency Services';
  
  // Create a log entry with timestamp
  const timestamp = new Date().toLocaleTimeString();
  const callLog = `[${timestamp}] ${serviceName} contacted for site: ${state.activeSite}`;
  
  // Add visual feedback - highlight the button
  const button = document.getElementById(`call${serviceType.charAt(0).toUpperCase() + serviceType.slice(1)}`);
  if (button) {
    button.classList.add('called');
    
    // Show confirmation
    const originalText = button.textContent;
    button.innerHTML = `<span class="icon">✓</span><span>Dispatched</span>`;
    
    // Reset after 3 seconds
    setTimeout(() => {
      button.classList.remove('called');
      button.innerHTML = originalText;
    }, 3000);
  }
  
  console.log(callLog);
  
  // In a real system, this would send to an actual emergency dispatch system
  showFaultMessage(`EMERGENCY SERVICES CALLED: ${serviceName} - Site: ${state.activeSite}`);
}

function initControls() {
  document.querySelectorAll('.site-btn').forEach((button) => {
    button.addEventListener('click', () => setSite(button.dataset.site));
  });

  values.resetBtn.disabled = true;
  values.pauseBtn.addEventListener('click', toggleLive);
  values.ackBtn.addEventListener('click', acknowledgeAlerts);
  values.sirenCloseBtn.addEventListener('click', silenceSiren);
  values.faultDrawerMuteBtn.addEventListener('click', silenceSiren);
  values.faultDrawerToggle.addEventListener('click', () => {
    values.faultDrawer.classList.add('visible');
    values.errorOverlay.classList.remove('visible');
    state.faultOverlayDismissed = true;
    values.faultDrawerToggle.textContent = 'CLOSE';
  });
  values.emergencyShutdownBtn.addEventListener('click', immediateShutdown);
  values.resetBtn.addEventListener('click', resetProcess);
  values.targetSlider.addEventListener('input', (event) => updateTarget(event.target.value));
  values.minPressureLimit.addEventListener('input', updateThresholdsFromInputs);
  values.maxPressureLimit.addEventListener('input', updateThresholdsFromInputs);
  values.batteryLimit.addEventListener('input', updateThresholdsFromInputs);
  values.flowLimit.addEventListener('input', updateThresholdsFromInputs);

  document.addEventListener('pointerdown', initAudio, { once: true });

  // Emergency service buttons
  const callPoliceBtn = document.getElementById('callPolice');
  const callAmbulanceBtn = document.getElementById('callAmbulance');
  const callFirefighterBtn = document.getElementById('callFirefighter');
  
  if (callPoliceBtn) {
    callPoliceBtn.addEventListener('click', () => callEmergencyService('police'));
  }
  if (callAmbulanceBtn) {
    callAmbulanceBtn.addEventListener('click', () => callEmergencyService('ambulance'));
  }
  if (callFirefighterBtn) {
    callFirefighterBtn.addEventListener('click', () => callEmergencyService('firefighter'));
  }

  values.compressorSwitch.addEventListener('click', () => {
    values.compressorSwitch.classList.toggle('on');
    values.compressorSwitch.textContent = values.compressorSwitch.classList.contains('on') ? 'On' : 'Off';
  });

  values.leakSwitch.addEventListener('click', () => {
    values.leakSwitch.classList.toggle('on');
    values.leakSwitch.textContent = values.leakSwitch.classList.contains('on') ? 'On' : 'Off';
  });

  values.shutdownSwitch.addEventListener('click', () => {
    values.shutdownSwitch.classList.toggle('on');
    values.shutdownSwitch.textContent = values.shutdownSwitch.classList.contains('on') ? 'On' : 'Off';
  });
}

function tick() {

  // System has not been started
  if (!state.systemStarted) {
    return;
  }

  if (state.live) {
    updateAllSitesData();
    
    // Check if there's an error on a different site
    const errorInfo = findErrorSite();
    if (errorInfo && errorInfo.site !== state.activeSite) {
      // Switch to the error site and highlight it
      setSite(errorInfo.site);
      document.querySelector('.kpi-grid').classList.add('error-highlight');
      setTimeout(() => {
        document.querySelector('.kpi-grid').classList.remove('error-highlight');
      }, 3000);
    }
    
    updateSiteData();
  }
}

buildGrid();
initControls();
const systemStartOverlay =
  document.getElementById('systemStartOverlay');

const startSystemBtn =
  document.getElementById('startSystemBtn');

startSystemBtn.addEventListener('click', () => {

  // Start the system
  state.systemStarted = true;
  state.live = true;

  // Hide startup screen
  systemStartOverlay.style.display = 'none';

  // Start the first readings immediately
  updateAllSitesData();
  updateSiteData();

  console.log('SYSTEM STARTED');
});
updateSiteLocationLabel();
renderAlerts();
renderTrend();

if (state.systemStarted) {
  updateAllSitesData();
  updateSiteData();
}

// Expose globally for testing/debugging
window.state = state;
window.sites = sites;
window.values = values;
window.sitesData = state.sitesData;
function createTestModePanel() {
  // ==============================
  // TEST MODE BUTTON
  // ==============================

  const launcher = document.createElement('button');

  launcher.id = 'testModeLauncher';
  launcher.textContent = 'TEST MODE';

  launcher.style.cssText = `
    position: fixed;
    right: 24px;
    bottom: 24px;
    z-index: 9998;

    padding: 12px 22px;

    border: 1px solid rgba(255,255,255,0.2);
    border-radius: 8px;

    background: #374151;
    color: white;

    font-size: 14px;
    font-weight: 700;

    cursor: pointer;

    box-shadow: 0 8px 25px rgba(0,0,0,0.35);
  `;

  document.body.appendChild(launcher);


  // ==============================
  // POPUP BACKGROUND
  // ==============================

  const overlay = document.createElement('div');

  overlay.id = 'testModeOverlay';

  overlay.style.cssText = `
    display: none;

    position: fixed;
    inset: 0;

    z-index: 9999;

    background: rgba(0,0,0,0.65);

    align-items: center;
    justify-content: center;
  `;


  // ==============================
  // POPUP
  // ==============================

  const panel = document.createElement('div');

  panel.style.cssText = `
    width: 380px;
    max-width: 90vw;

    padding: 24px;

    background: #111827;
    color: white;

    border: 1px solid rgba(255,255,255,0.15);
    border-radius: 14px;

    box-shadow: 0 20px 60px rgba(0,0,0,0.5);

    font-family: inherit;
  `;


  panel.innerHTML = `
    <div style="
      display:flex;
      justify-content:space-between;
      align-items:center;
      margin-bottom:8px;
    ">

      <div style="
        font-size:22px;
        font-weight:700;
      ">
        TEST MODE
      </div>

      <button
        id="closeTestMode"
        style="
          border:0;
          background:transparent;
          color:white;
          font-size:28px;
          cursor:pointer;
          line-height:1;
        "
      >
        ×
      </button>

    </div>


    <div style="
      font-size:12px;
      opacity:0.75;
      margin-bottom:20px;
    ">
      Enter simulated sensor readings for system testing.
    </div>


    <label style="
      display:block;
      font-size:13px;
      margin-bottom:14px;
    ">
      Minimum Pressure (psi)

      <input
        id="testPressureMin"
        type="number"
        value="${state.testReadings.pressureMin}"
        style="
          display:block;
          width:100%;
          box-sizing:border-box;
          margin-top:6px;
          padding:10px;
          border-radius:7px;
          border:1px solid rgba(255,255,255,0.2);
          background:#1f2937;
          color:white;
          font-size:14px;
        "
      >
    </label>


    <label style="
      display:block;
      font-size:13px;
      margin-bottom:14px;
    ">
      Maximum Pressure (psi)

      <input
        id="testPressureMax"
        type="number"
        value="${state.testReadings.pressureMax}"
        style="
          display:block;
          width:100%;
          box-sizing:border-box;
          margin-top:6px;
          padding:10px;
          border-radius:7px;
          border:1px solid rgba(255,255,255,0.2);
          background:#1f2937;
          color:white;
          font-size:14px;
        "
      >
    </label>


    <label style="
      display:block;
      font-size:13px;
      margin-bottom:14px;
    ">
      Battery (V)

      <input
        id="testBattery"
        type="number"
        step="0.1"
        value="${state.testReadings.battery}"
        style="
          display:block;
          width:100%;
          box-sizing:border-box;
          margin-top:6px;
          padding:10px;
          border-radius:7px;
          border:1px solid rgba(255,255,255,0.2);
          background:#1f2937;
          color:white;
          font-size:14px;
        "
      >
    </label>


    <label style="
      display:block;
      font-size:13px;
      margin-bottom:14px;
    ">
      Flow Rate (mmscf/d)

      <input
        id="testFlowRate"
        type="number"
        step="0.1"
        value="${state.testReadings.flowRate}"
        style="
          display:block;
          width:100%;
          box-sizing:border-box;
          margin-top:6px;
          padding:10px;
          border-radius:7px;
          border:1px solid rgba(255,255,255,0.2);
          background:#1f2937;
          color:white;
          font-size:14px;
        "
      >
    </label>


    <div style="
      display:flex;
      gap:10px;
      margin-top:20px;
    ">

      <button
        id="applyTestValues"
        style="
          flex:1;
          padding:11px;
          border:0;
          border-radius:7px;
          background:#2563eb;
          color:white;
          font-weight:700;
          cursor:pointer;
        "
      >
        Apply Test Values
      </button>

      <button
        id="exitTestMode"
        style="
          flex:1;
          padding:11px;
          border:0;
          border-radius:7px;
          background:#374151;
          color:white;
          font-weight:700;
          cursor:pointer;
        "
      >
        Exit Test Mode
      </button>

    </div>


    <div
      id="testModeStatus"
      style="
        margin-top:16px;
        font-size:12px;
        opacity:0.8;
      "
    >
      Test mode is currently OFF.
    </div>
  `;


  overlay.appendChild(panel);

  document.body.appendChild(overlay);


  // ==============================
  // OPEN POPUP
  // ==============================

  launcher.addEventListener('click', () => {

    overlay.style.display = 'flex';

  });


  // ==============================
  // CLOSE POPUP
  // ==============================

  document
    .getElementById('closeTestMode')
    .addEventListener('click', () => {

      overlay.style.display = 'none';

    });


  // Close when clicking outside popup

  overlay.addEventListener('click', (event) => {

    if (event.target === overlay) {

      overlay.style.display = 'none';

    }

  });


  // ==============================
  // APPLY TEST VALUES
  // ==============================

  document
    .getElementById('applyTestValues')
    .addEventListener('click', () => {

      state.testReadings.pressureMin =
        Number(
          document.getElementById('testPressureMin').value
        );

      state.testReadings.pressureMax =
        Number(
          document.getElementById('testPressureMax').value
        );

      state.testReadings.battery =
        Number(
          document.getElementById('testBattery').value
        );

      state.testReadings.flowRate =
  Number(
    document.getElementById('testFlowRate').value
  );

// ============================================
// SAVE TEST VALUES
// ============================================

localStorage.setItem(
  'deltaDashboardTestReadings',
  JSON.stringify(state.testReadings)
);

// Turn TEST MODE ON

state.testMode = true;

localStorage.setItem(
  'deltaDashboardTestMode',
  'true'
);


      // Change button text

      launcher.textContent = 'TEST MODE: ON';


      // Update status

      document.getElementById('testModeStatus').textContent =
        'Test mode is ON. Manual readings are being used.';


      // Update dashboard

      updateAllSitesData();

      updateSiteData();

    });


  // ==============================
  // EXIT TEST MODE
  // ==============================

  document
    .getElementById('exitTestMode')
    .addEventListener('click', () => {

      // Turn TEST MODE OFF

state.testMode = false;

localStorage.setItem(
  'deltaDashboardTestMode',
  'false'
);

// Change button text back

      launcher.textContent = 'TEST MODE';


      // Update status

      document.getElementById('testModeStatus').textContent =
        'Test mode is OFF. Normal simulation is active.';


      // Restore normal readings

      updateAllSitesData();

      updateSiteData();


      // Close popup

      overlay.style.display = 'none';

    });

}


createTestModePanel();


setInterval(tick, 2200);



// ============================================
// FAULT STATUS CLOSE / REOPEN
// ============================================

const faultDrawer = document.getElementById('faultDrawer');
const faultDrawerToggle = document.getElementById('faultDrawerToggle');

const faultReopenButton = document.createElement('button');

faultReopenButton.id = 'faultReopenButton';
faultReopenButton.type = 'button';
faultReopenButton.textContent = 'FAULT STATUS';

faultReopenButton.style.cssText = `
  position: fixed;
  right: 24px;
  bottom: 85px;
  z-index: 99999;

  display: none;

  padding: 12px 20px;

  border: 1px solid rgba(255, 120, 120, 0.7);
  border-radius: 999px;

  background: rgba(30, 8, 8, 0.95);
  color: white;

  font-size: 14px;
  font-weight: 800;

  cursor: pointer;

  box-shadow: 0 8px 20px rgba(0,0,0,0.35);
`;

document.body.appendChild(faultReopenButton);


// CLOSE FAULT STATUS
faultDrawerToggle.addEventListener('click', () => {

  // Hide fault panel
  faultDrawer.style.display = 'none';

  // Show reopen button
  faultReopenButton.style.display = 'block';

});


// REOPEN FAULT STATUS
faultReopenButton.addEventListener('click', () => {

  // Show fault panel
  faultDrawer.style.display = 'block';

  // Make sure visible class is present
  faultDrawer.classList.add('visible');

  // Hide reopen button
  faultReopenButton.style.display = 'none';

});

