/* sn.js - Spatial Navigation Task (Full programmatic DOM creation like MRT) */

(() => {
  // ========== CONFIGURATION ==========
  const CFG = window.SN_CONFIG || {};
  const stimulusMapping = window.stimulusMapping || { easy: [], hard: [], control: [] };
  
  // Check if embedded
  const isEmbedded = (window !== window.top);
  const qs = new URLSearchParams(location.search);
  const SESSION_CODE = (qs.get('code') || '').toUpperCase();
  const PARTICIPANT_ID_PARAM = qs.get('pid') || '';

  // Mobile detection
  const isMobile = (() => {
    const hasTouch = ('ontouchstart' in window) || 
                    (navigator.maxTouchPoints > 0) || 
                    (navigator.msMaxTouchPoints > 0);
    const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet/i;
    const isMobileUA = mobileRegex.test(navigator.userAgent);
    const isSmallScreen = window.innerWidth <= 1024;
    return hasTouch && (isMobileUA || isSmallScreen);
  })();

  // ========== CREATE ALL DOM ELEMENTS ==========
  
  // Create main container
  const container = document.createElement('div');
  container.id = 'experiment-container';
  container.style.cssText = `
    position: relative;
    width: 100%;
    max-width: 860px;
    height: 100vh;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  `;

  // Create progress indicator
  const progressDiv = document.createElement('div');
  progressDiv.id = 'progress';
  progressDiv.style.cssText = `
    position: absolute;
    top: 10px;
    right: 10px;
    font-size: 14px;
    color: #666;
  `;

  // ========== DATA ENTRY SCREEN ==========
  const dataEntryScreen = document.createElement('div');
  dataEntryScreen.className = 'screen active';
  dataEntryScreen.style.cssText = `
    display: block;
    text-align: center;
    padding: 20px;
    width: 100%;
    max-width: 500px;
  `;

  dataEntryScreen.innerHTML = `
    <h2>Spatial Navigation Task</h2>
    <div style="margin: 20px 0;">
      <div class="form-group" style="margin: 10px 0; text-align: left;">
        <label style="display: inline-block; width: 160px; text-align: right; margin-right: 10px;">Participant Group:</label>
        <select id="participant-group" style="padding: 8px; font-size: 16px; width: 220px; border: 1px solid #ddd; border-radius: 4px;">
          <option value="">Select your group...</option>
          <option value="DF">Deaf Fluent Signer</option>
          <option value="HF">Hearing Fluent Signer</option>
          <option value="DNF">Deaf Non-Fluent Signer</option>
          <option value="HNF">Hearing Non-Fluent Signer</option>
          <option value="HNS">Hearing Non-Signer</option>
        </select>
      </div>
      <div id="group-desc" style="font-size: 12px; color: #666; font-style: italic; margin-top: 6px;"></div>
      
      <div class="form-group" style="margin: 10px 0; text-align: left;">
        <label style="display: inline-block; width: 160px; text-align: right; margin-right: 10px;">Age:</label>
        <input type="number" id="age" min="18" max="100" style="padding: 8px; font-size: 16px; width: 220px; border: 1px solid #ddd; border-radius: 4px;">
      </div>
      
      <div class="form-group" style="margin: 10px 0; text-align: left;">
        <label style="display: inline-block; width: 160px; text-align: right; margin-right: 10px;">Gender:</label>
        <select id="gender" style="padding: 8px; font-size: 16px; width: 220px; border: 1px solid #ddd; border-radius: 4px;">
          <option value="">Select...</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="non-binary">Non-binary</option>
          <option value="prefer-not">Prefer not to say</option>
        </select>
      </div>
      
      <div class="form-group" style="margin: 10px 0; text-align: left;">
        <label style="display: inline-block; width: 160px; text-align: right; margin-right: 10px;">Handedness:</label>
        <select id="handedness" style="padding: 8px; font-size: 16px; width: 220px; border: 1px solid #ddd; border-radius: 4px;">
          <option value="">Select...</option>
          <option value="right">Right</option>
          <option value="left">Left</option>
          <option value="ambidextrous">Ambidextrous</option>
        </select>
      </div>
    </div>
    
    <button id="start-button" disabled style="
      background: #4CAF50;
      color: #fff;
      border: 0;
      border-radius: 6px;
      padding: 12px 22px;
      font-size: 16px;
      cursor: pointer;
      margin-top: 14px;
      opacity: 0.5;
    ">Please select your group first</button>
  `;

  // ========== INSTRUCTION SCREEN ==========
  const instructionScreen = document.createElement('div');
  instructionScreen.className = 'screen';
  instructionScreen.style.cssText = `
    display: none;
    text-align: center;
    padding: 20px;
    width: 100%;
    max-width: 640px;
  `;

  instructionScreen.innerHTML = `
    <div id="nav-type-indicator"></div>
    <div id="instruction-text" style="font-size: 18px; line-height: 1.5; margin: 0 auto;"></div>
    <button id="instruction-continue" style="
      background: #4CAF50;
      color: #fff;
      border: 0;
      border-radius: 6px;
      padding: 12px 22px;
      font-size: 16px;
      cursor: pointer;
      margin-top: 14px;
    ">Continue</button>
  `;

  // ========== STIMULUS SCREEN ==========
  const stimulusScreen = document.createElement('div');
  stimulusScreen.className = 'screen';
  stimulusScreen.style.cssText = `
    display: none;
    text-align: center;
    padding: 20px;
  `;

  // Practice banner
  const practiceBanner = document.createElement('div');
  practiceBanner.id = 'practice-banner';
  practiceBanner.style.cssText = `
    display: none;
    padding: 8px 16px;
    border-radius: 6px;
    color: #fff;
    font-weight: bold;
    margin: 10px auto 16px;
    display: inline-block;
  `;

  // Stimulus stage
  const stimulusStage = document.createElement('div');
  stimulusStage.style.cssText = `
    width: 500px;
    height: 500px;
    margin: 0 auto;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  `;

  // Stimulus image
  const stimulusImage = document.createElement('img');
  stimulusImage.id = 'stimulus-image';
  stimulusImage.style.cssText = `
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: contain;
    border: 2px solid #ddd;
    display: none;
    pointer-events: none;
  `;

  // Fixation cross
  const fixation = document.createElement('div');
  fixation.id = 'fixation';
  fixation.style.cssText = `
    position: absolute;
    width: 64px;
    height: 64px;
    display: none;
  `;

  // Create fixation cross with pseudo-elements via actual elements
  const fixVertical = document.createElement('div');
  fixVertical.style.cssText = `
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    top: 0;
    width: 2px;
    height: 100%;
    background: #333;
  `;

  const fixHorizontal = document.createElement('div');
  fixHorizontal.style.cssText = `
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    left: 0;
    width: 100%;
    height: 2px;
    background: #333;
  `;

  fixation.appendChild(fixVertical);
  fixation.appendChild(fixHorizontal);

  // Practice helper
  const practiceHelper = document.createElement('div');
  practiceHelper.id = 'practice-helper';
  practiceHelper.style.cssText = `
    display: none;
    margin-top: 10px;
    font-size: 14px;
    color: #555;
  `;

  // Assemble stimulus screen
  stimulusStage.appendChild(stimulusImage);
  stimulusStage.appendChild(fixation);
  stimulusScreen.appendChild(practiceBanner);
  stimulusScreen.appendChild(stimulusStage);
  stimulusScreen.appendChild(practiceHelper);

  // ========== FEEDBACK SCREEN ==========
  const feedbackScreen = document.createElement('div');
  feedbackScreen.className = 'screen';
  feedbackScreen.style.cssText = `
    display: none;
    text-align: center;
    padding: 20px;
  `;

  feedbackScreen.innerHTML = `
    <div id="feedback-text" style="font-size: 24px; margin: 20px;"></div>
    <button id="download-data" style="
      display: none;
      background: #4CAF50;
      color: #fff;
      border: 0;
      border-radius: 6px;
      padding: 12px 22px;
      font-size: 16px;
      cursor: pointer;
      margin-top: 14px;
    ">Download Data</button>
  `;

  // ========== D-PAD FOR MOBILE ==========
  const touchControls = document.createElement('div');
  touchControls.id = 'touch-controls';
  touchControls.style.cssText = `
    position: absolute;
    bottom: 80px;
    width: 180px;
    height: 180px;
    display: none;
    touch-action: manipulation;
    right: 20px;
  `;

  if (isMobile) {
    ['up', 'down', 'left', 'right'].forEach((dir, i) => {
      const btn = document.createElement('button');
      btn.className = `dpad-button ${dir}`;
      btn.dataset.key = `Arrow${dir.charAt(0).toUpperCase() + dir.slice(1)}`;
      btn.textContent = dir === 'up' ? '▲' : dir === 'down' ? '▼' : dir === 'left' ? '◄' : '►';
      
      const positions = {
        up: 'left: 60px; top: 0;',
        down: 'left: 60px; top: 120px;',
        left: 'left: 0; top: 60px;',
        right: 'left: 120px; top: 60px;'
      };
      
      btn.style.cssText = `
        position: absolute;
        width: 60px;
        height: 60px;
        font-size: 24px;
        border-radius: 8px;
        border: 1px solid #aaa;
        background: #f0f0f0;
        ${positions[dir]}
      `;
      
      touchControls.appendChild(btn);
    });
  }

  // ========== ASSEMBLE CONTAINER ==========
  container.appendChild(progressDiv);
  container.appendChild(dataEntryScreen);
  container.appendChild(instructionScreen);
  container.appendChild(stimulusScreen);
  container.appendChild(feedbackScreen);
  container.appendChild(touchControls);

  // Add container to body
  document.body.appendChild(container);

  // ========== STATE MANAGEMENT ==========
  const state = {
    participantInfo: {},
    isPractice: false,
    currentBlock: 0,
    currentTrial: 0,
    currentBlockStimuli: [],
    usedStimuliTracker: {},
    currentStimulus: null,
    currentNavType: null,
    currentDifficulty: null,
    stimulusOnsetTime: null,
    responseTimeout: null,
    onKeyHandler: null,
    allData: [],
    blockData: []
  };

  // ========== INSTRUCTIONS TEXT ==========
  const INSTRUCTIONS = {
    full: {
      egocentric: `
        In this task, you will move from the gray player to the red stop sign while avoiding blue walls.
        The gray triangle shows which way the player is facing.
        Your job is to choose the first step the player should take. Make your choice as if you are the player.<br><br>
        Use these keys:<br>
        • UP arrow: Move forward (in the direction the player is facing)<br>
        • DOWN arrow: Move backward<br>
        • LEFT arrow: Move to the player's left<br>
        • RIGHT arrow: Move to the player's right<br><br>
        Example: UP moves you forward in whatever direction you're facing.<br>
        Choose the first step needed to reach the stop sign. Try to respond quickly and correctly.
      `,
      allocentric: `
        In this task, you will move from the gray player to the red stop sign while avoiding blue walls.
        Your job is to choose the first step the player should take using screen directions (like a map).<br><br>
        Use these keys:<br>
        • UP arrow: Toward the top of the screen<br>
        • DOWN arrow: Toward the bottom of the screen<br>
        • LEFT arrow: Toward the left side of the screen<br>
        • RIGHT arrow: Toward the right side of the screen<br><br>
        No matter which way the player is facing, pressing UP always moves toward the top of the screen.<br>
        Choose the first step needed to reach the target. Try to respond quickly and correctly.
      `,
      control: `
        In this task, you will see arrows showing the path from the player to the target.
        Your job is to follow the first arrow from the player's position.<br><br>
        Use these keys:<br>
        • UP arrow: When the first arrow points up<br>
        • DOWN arrow: When the first arrow points down<br>
        • LEFT arrow: When the first arrow points left<br>
        • RIGHT arrow: When the first arrow points right<br><br>
        Example: Press the RIGHT arrow key if the first arrow points right.<br>
        Try to respond quickly and correctly.
      `
    },
    brief: {
      egocentric: `
        PLAYER VIEW:<br>
        UP = forward (direction you're facing)<br>
        DOWN = backward<br>
        LEFT = to your left<br>
        RIGHT = to your right
      `,
      allocentric: `
        MAP VIEW:<br>
        UP = toward the top of the screen<br>
        DOWN = toward the bottom of the screen<br>
        LEFT = toward the left of the screen<br>
        RIGHT = toward the right of the screen
      `,
      control: `
        ARROW FOLLOWING:<br>
        Press the arrow matching the FIRST arrow from the player.<br>
        UP / DOWN / LEFT / RIGHT
      `
    }
  };

  // ========== HELPER FUNCTIONS ==========
  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => {
      s.style.display = 'none';
      s.classList.remove('active');
    });
    
    if (id === 'data-entry') {
      dataEntryScreen.style.display = 'block';
      dataEntryScreen.classList.add('active');
    } else if (id === 'instruction') {
      instructionScreen.style.display = 'block';
      instructionScreen.classList.add('active');
    } else if (id === 'stimulus') {
      stimulusScreen.style.display = 'block';
      stimulusScreen.classList.add('active');
    } else if (id === 'feedback') {
      feedbackScreen.style.display = 'block';
      feedbackScreen.classList.add('active');
    }
  }

  function setInstructionContinue(handler) {
    const btn = document.getElementById('instruction-continue');
    btn.onclick = handler;
    btn.style.display = 'inline-block';
  }

  function hideInstructionContinue() {
    document.getElementById('instruction-continue').style.display = 'none';
  }

  function updateProgress() {
    const el = document.getElementById('progress');
    if (state.isPractice) {
      el.textContent = `Practice ${state.currentTrial + 1}/${CFG.PRACTICE_TRIALS}`;
    } else {
      const totalBlocks = state.blocks?.length || 1;
      el.textContent = `Block ${state.currentBlock + 1}/${totalBlocks} | Trial ${state.currentTrial + 1}/${CFG.TRIALS_PER_BLOCK}`;
    }
  }

  function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  function notifyParentIfEmbedded(message) {
    if (isEmbedded) {
      try {
        window.parent.postMessage({
          type: 'task-complete',
          taskCode: 'SN',
          ...message
        }, '*');
      } catch(e) {
        console.log('Could not communicate with parent:', e);
      }
    }
  }

  // ========== RNG CLASS ==========
  class RNG {
    constructor(seed) { this.seed = seed; }
    random() {
      let t = this.seed += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
    shuffle(arr) {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(this.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    }
  }

  function rngFromId(id) {
    const base = String(id).split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const jitter = Date.now() % 1000;
    return new RNG(base * 1000 + jitter);
  }

  function determineCounterbalance(participantId) {
    const m = String(participantId).match(/\d+/);
    const n = m ? parseInt(m[0], 10) : [...String(participantId)].reduce((a, c) => a + c.charCodeAt(0), 0);
    return (n % 4) + 1;
  }

  function createBlockSequence(counterbalance) {
    const latin = [
      [['egocentric','easy'], ['egocentric','hard'], ['allocentric','easy'], ['allocentric','hard']],
      [['egocentric','hard'], ['allocentric','hard'], ['egocentric','easy'], ['allocentric','easy']],
      [['allocentric','easy'], ['egocentric','easy'], ['allocentric','hard'], ['egocentric','hard']],
      [['allocentric','hard'], ['allocentric','easy'], ['egocentric','hard'], ['egocentric','easy']]
    ];
    const base = latin[counterbalance - 1];
    const seq = [];
    for (let r = 0; r < CFG.REPETITIONS; r++) {
      base.forEach(([n, d]) => seq.push({navType: n, difficulty: d}));
    }
    seq.splice(4, 0, {navType: 'control', difficulty: 'control'});
    return seq;
  }

  function ensureEnough(stimuli, need, rng) {
    if (stimuli.length === 0) return [];
    let pool = [...stimuli];
    if (pool.length < need) {
      const reps = Math.ceil(need / pool.length);
      pool = Array.from({length: reps}, () => rng.shuffle(stimuli)).flat();
    }
    pool = rng.shuffle(pool);
    return pool.slice(0, need);
  }

  function prepareBlockStimuli(navType, difficulty, blockIndex, rng, count) {
    const bucket = stimulusMapping && stimulusMapping[difficulty];
    if (!bucket || !bucket.length) return [];
    const key = navType + '_' + difficulty;
    if (!state.usedStimuliTracker[key]) state.usedStimuliTracker[key] = new Set();

    const unused = bucket.filter(s => !state.usedStimuliTracker[key].has(s.id));
    const used = bucket.filter(s => state.usedStimuliTracker[key].has(s.id));
    let pool = [...unused, ...used];
    for (let i = 0; i < 2; i++) pool = rng.shuffle(pool);

    const chosen = ensureEnough(pool, count, rng);
    chosen.forEach(s => state.usedStimuliTracker[key].add(s.id));
    return chosen;
  }

  async function preloadImages(stimuli) {
    await Promise.all(stimuli.map(s => new Promise(res => {
      const img = new Image();
      img.onload = res;
      img.onerror = res;
      img.src = s.file;
    })));
  }

  async function saveToGoogleSheet(payload) {
    try {
      const body = { action: 'saveTrial', ...payload, user_agent: navigator.userAgent };
      await fetch(CFG.SHEETS_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(body)
      });
    } catch(e) { /* silent */ }
  }

  // ========== FORM VALIDATION ==========
  function onGroupChange() {
    const group = document.getElementById('participant-group').value;
    const desc = document.getElementById('group-desc');
    const GROUP_DESCRIPTIONS = {
      DF: 'Deaf individuals who are fluent in sign language',
      HF: 'Hearing individuals who are fluent in sign language',
      DNF: 'Deaf individuals who are not fluent in sign language',
      HNF: 'Hearing individuals who are not fluent in sign language',
      HNS: 'Hearing individuals who do not know sign language'
    };
    desc.textContent = group ? (GROUP_DESCRIPTIONS[group] || '') : '';
    maybeEnableStart();
  }

  function maybeEnableStart() {
    const group = document.getElementById('participant-group').value;
    const age = document.getElementById('age').value;
    const gender = document.getElementById('gender').value;
    const handedness = document.getElementById('handedness').value;
    const startBtn = document.getElementById('start-button');
    const ready = group && age && gender && handedness;
    startBtn.disabled = !ready;
    startBtn.textContent = ready ? 'Start Experiment' : 'Please select your group first';
    startBtn.style.opacity = ready ? '1' : '0.5';
    startBtn.style.cursor = ready ? 'pointer' : 'not-allowed';
  }

  // ========== START EXPERIMENT ==========
  async function startExperiment() {
    const group = document.getElementById('participant-group').value;
    const age = document.getElementById('age').value;
    const gender = document.getElementById('gender').value;
    const handedness = document.getElementById('handedness').value;
    
    if (!group || !age || !gender || !handedness) {
      return alert('Please fill in all required fields (Age, Gender, Handedness)');
    }

    const btn = document.getElementById('start-button');
    btn.disabled = true;
    btn.textContent = 'Assigning ID...';

    // Try server → fallback locally
    let assignedId;
    try {
      const res = await fetch(CFG.SHEETS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'nextIdLocked', groupCode: group })
      });
      const data = await res.json();
      if (!data.ok || !data.id) throw new Error('Bad response');
      assignedId = data.id;
    } catch {
      const bytes = new Uint8Array(8);
      crypto.getRandomValues(bytes);
      const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 8);
      assignedId = `${group}-tmp-${Date.now().toString(36)}-${hex}`;
    }

    state.participantInfo = {
      id: assignedId,
      group,
      age,
      gender,
      handedness,
      timestamp: new Date().toISOString()
    };

    // Position d-pad based on handedness (mobile only)
    if (isMobile && touchControls) {
      touchControls.style.right = handedness === 'left' ? 'auto' : '20px';
      touchControls.style.left = handedness === 'left' ? '20px' : 'auto';
    }

    const cb = determineCounterbalance(assignedId);
    state.blocks = createBlockSequence(cb);
    state.usedStimuliTracker = {};

    // Practice intro
    const txt = document.getElementById('instruction-text');
    const head = document.getElementById('nav-type-indicator');
    head.className = '';
    head.textContent = '';
    
    const controlInfo = isMobile
      ? '<p>You will use the on-screen arrow buttons to respond.</p>'
      : '<p>You will use your keyboard arrow keys to respond.</p>';
    
    txt.innerHTML = `
      <h3>Practice Phase</h3>
      <p>You will practice two quick examples of each navigation type.</p>
      <p><strong>PLAYER VIEW</strong>: act as if you are the player (UP=forward, DOWN=backward, LEFT/RIGHT=turn)</p>
      <p><strong>MAP VIEW</strong>: use map directions (UP=top, DOWN=bottom, LEFT=west, RIGHT=east)</p>
      ${controlInfo}
      <p>Press Continue when you're ready to start practice.</p>`;
    
    setInstructionContinue(() => {
      state.isPractice = true;
      state.currentTrial = 0;
      runPracticeTrial();
    });
    
    showScreen('instruction');
    btn.disabled = false;
    btn.textContent = 'Start Experiment';
  }

  // ========== PRACTICE HELPERS ==========
  function setPracticeBadgeAndLegend(navType) {
    if (!state.isPractice) {
      practiceBanner.style.display = 'none';
      practiceHelper.style.display = 'none';
      return;
    }

    const colors = {
      egocentric: '#4CAF50',
      allocentric: '#9C27B0'
    };

    practiceBanner.style.background = colors[navType];
    practiceBanner.textContent = (navType === 'egocentric' ? 'PLAYER VIEW' : 'MAP VIEW') + ' practice';
    practiceBanner.style.display = 'inline-block';

    practiceHelper.style.display = 'block';
    practiceHelper.innerHTML = (navType === 'egocentric')
      ? 'Legend (practice only): UP=forward · DOWN=backward · LEFT=turn left · RIGHT=turn right'
      : 'Legend (practice only): UP=top · DOWN=bottom · LEFT=left · RIGHT=right';
  }

  async function showPracticeTypeBanner(navType, thenStartFn) {
    const head = document.getElementById('nav-type-indicator');
    const txt = document.getElementById('instruction-text');

    const colors = {
      egocentric: '#4CAF50',
      allocentric: '#9C27B0'
    };

    head.style.cssText = `
      display: inline-block;
      padding: 8px 16px;
      border-radius: 6px;
      color: #fff;
      font-weight: bold;
      margin: 10px 0 16px;
      background: ${colors[navType]};
    `;
    head.textContent = navType === 'egocentric' ? 'PLAYER VIEW' : 'MAP VIEW';

    const blurb = (navType === 'egocentric')
      ? 'UP=forward · DOWN=backward · LEFT=turn left · RIGHT=turn right'
      : 'UP=top · DOWN=bottom · LEFT=left · RIGHT=right';

    hideInstructionContinue();
    showScreen('instruction');

    for (let i = 3; i >= 1; i--) {
      txt.innerHTML = `
        <p><strong>${head.textContent}</strong> practice (2 quick questions)</p>
        <p>${blurb}</p>
        <p>Starting in ${i}...</p>`;
      await sleep(1000);
    }
    thenStartFn();
  }

  // ========== PRACTICE FLOW ==========
  function runPracticeTrial() {
    if (!state.isPractice) return;

    if (state.currentTrial >= CFG.PRACTICE_TRIALS) {
      state.isPractice = false;
      state.currentBlock = 0;
      state.currentTrial = 0;

      const txt = document.getElementById('instruction-text');
      const head = document.getElementById('nav-type-indicator');
      head.className = '';
      head.textContent = '';
      txt.innerHTML = `
        <h3>Practice Complete</h3>
        <p>The main task will begin next.</p>
        <p>You can take a short break now. Press <strong>Continue</strong> when ready.</p>`;
      setInstructionContinue(showBlockInstructions);
      showScreen('instruction');
      return;
    }

    const navType = state.currentTrial < 2 ? 'egocentric' : 'allocentric';

    if (state.currentTrial === 0 || state.currentTrial === 2) {
      return showPracticeTypeBanner(navType, () => {
        setPracticeBadgeAndLegend(navType);
        const stim = stimulusMapping.easy[state.currentTrial % stimulusMapping.easy.length];
        presentStimulus(stim, navType, 'practice');
        updateProgress();
      });
    }

    setPracticeBadgeAndLegend(navType);
    const stim = stimulusMapping.easy[state.currentTrial % stimulusMapping.easy.length];
    presentStimulus(stim, navType, 'practice');
    updateProgress();
  }

  // ========== MAIN BLOCKS ==========
  function showBlockInstructions() {
    const block = state.blocks[state.currentBlock];
    const head = document.getElementById('nav-type-indicator');
    const txt = document.getElementById('instruction-text');

    const name = block.navType === 'egocentric' ? 'PLAYER VIEW' :
                 block.navType === 'allocentric' ? 'MAP VIEW' :
                 'ARROW FOLLOWING';

    const colors = {
      egocentric: '#4CAF50',
      allocentric: '#9C27B0',
      control: '#FF9800'
    };

    head.style.cssText = `
      display: inline-block;
      padding: 8px 16px;
      border-radius: 6px;
      color: #fff;
      font-weight: bold;
      margin: 10px 0 16px;
      background: ${colors[block.navType]};
    `;
    head.textContent = name;

    const controlMethod = isMobile ? 'on-screen arrow buttons' : 'arrow keys';

    const msg = {
      egocentric: `Navigate from the gray player to the red stop sign.<br><br>
                   Use ${controlMethod} as if YOU are the player:<br>
                   UP=forward, DOWN=backward, LEFT=turn left, RIGHT=turn right`,
      allocentric: `Navigate from the gray player to the red stop sign.<br><br>
                    Use ${controlMethod} as map directions:<br>
                    UP=top, DOWN=bottom, LEFT=west, RIGHT=east`,
      control: `Follow the arrows shown.<br><br>
                Press the ${controlMethod === 'arrow keys' ? 'arrow key' : 'arrow button'} matching the FIRST arrow from the player.`
    };

    txt.innerHTML = msg[block.navType];
    setInstructionContinue(startBlock);
    updateProgress();
    showScreen('instruction');
  }

  async function startBlock() {
    const block = state.blocks[state.currentBlock];
    const rng = rngFromId(state.participantInfo.id + '_b' + state.currentBlock);
    state.currentBlockStimuli = prepareBlockStimuli(block.navType, block.difficulty, state.currentBlock, rng, CFG.TRIALS_PER_BLOCK);
    state.currentTrial = 0;
    state.blockData = [];

    practiceBanner.style.display = 'none';
    practiceHelper.style.display = 'none';

    await preloadImages(state.currentBlockStimuli);
    nextTrial();
  }

  function nextTrial() {
    if (state.isPractice) return;

    if (state.currentTrial >= CFG.TRIALS_PER_BLOCK) {
      state.allData.push(...state.blockData);
      state.currentBlock++;
      if (state.currentBlock >= state.blocks.length) {
        showCompletion();
      } else {
        showBlockInstructions();
      }
      return;
    }

    const block = state.blocks[state.currentBlock];
    const stim = state.currentBlockStimuli[state.currentTrial];
    if (!stim) {
      state.currentTrial++;
      return nextTrial();
    }

    presentStimulus(stim, block.navType, block.difficulty);
    updateProgress();
  }

  // ========== STIMULUS PRESENTATION ==========
  function presentStimulus(stimulus, navType, difficulty) {
    state.currentStimulus = stimulus;
    state.currentNavType = navType;
    state.currentDifficulty = difficulty;

    if (state.isPractice) setPracticeBadgeAndLegend(navType);

    window.focus();
    stimulusImage.style.display = 'none';
    fixation.style.display = 'block';
    touchControls.style.display = 'none';
    showScreen('stimulus');

    setTimeout(() => {
      fixation.style.display = 'none';
      stimulusImage.src = stimulus.file;
      stimulusImage.style.display = 'block';
      state.stimulusOnsetTime = performance.now();

      if (isMobile) {
        touchControls.style.display = 'block';
      }

      state.onKeyHandler = (e) => {
        if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) e.preventDefault();
        handleResponse(e);
      };
      document.addEventListener('keydown', state.onKeyHandler, { once: true, passive: false });

      state.responseTimeout = setTimeout(() => {
        if (state.onKeyHandler) {
          document.removeEventListener('keydown', state.onKeyHandler);
          state.onKeyHandler = null;
        }
        handleResponse({ key: 'timeout' });
      }, CFG.MAX_RESPONSE_TIME);

    }, CFG.FIXATION_DURATION);
  }

  function handleResponse(event) {
    const valid = ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','timeout'];
    const key = event.key || event;
    if (!valid.includes(key)) {
      document.addEventListener('keydown', state.onKeyHandler = (e) => {
        if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) e.preventDefault();
        handleResponse(e);
      }, { once: true, passive: false });
      return;
    }

    clearTimeout(state.responseTimeout);
    if (state.onKeyHandler) {
      document.removeEventListener('keydown', state.onKeyHandler);
      state.onKeyHandler = null;
    }

    touchControls.style.display = 'none';

    const map = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', timeout: 'none' };
    const response = map[key];
    const tooSlow = (key === 'timeout');
    const rt = tooSlow ? null : Math.round(performance.now() - state.stimulusOnsetTime);

    let correct;
    if (state.currentNavType === 'egocentric')
      correct = state.currentStimulus.egocentric_correct;
    else if (state.currentNavType === 'allocentric')
      correct = state.currentStimulus.allocentric_correct;
    else
      correct = state.currentStimulus.egocentric_correct ?? state.currentStimulus.allocentric_correct;

    const accuracy = (!tooSlow && response === correct) ? 1 : 0;

    const common = {
      participant_id: state.participantInfo.id,
      participant_group: state.participantInfo.group,
      age: state.participantInfo.age,
      gender: state.participantInfo.gender,
      handedness: state.participantInfo.handedness,
      navigation_type: state.currentNavType,
      difficulty: state.currentDifficulty,
      stimulus_id: state.currentStimulus.id,
      response,
      correct_response: correct,
      accuracy,
      rt_ms: rt,
      timestamp: new Date().toISOString(),
      device_type: isMobile ? 'mobile/tablet' : 'desktop'
    };

    if (state.isPractice) {
      saveToGoogleSheet({ ...common, block: 'practice', trial: state.currentTrial + 1 });
      showPracticeFeedback(accuracy, tooSlow);
    } else {
      const trialNum = state.currentTrial + 1;
      state.blockData.push({ ...common, block: state.currentBlock + 1, trial: trialNum });
      saveToGoogleSheet({ ...common, block: state.currentBlock + 1, trial: trialNum });
      state.currentTrial += 1;
      setTimeout(() => nextTrial(), CFG.ITI_DURATION);
    }
  }

  function showPracticeFeedback(ok, tooSlow) {
    const txt = document.getElementById('feedback-text');
    txt.textContent = tooSlow ? 'Too slow' : (ok ? 'Correct!' : 'Incorrect');
    txt.style.color = tooSlow ? '#e67e22' : (ok ? 'green' : 'red');
    showScreen('feedback');

    const blockKeys = (e) => e.stopPropagation();
    document.addEventListener('keydown', blockKeys, true);

    setTimeout(() => {
      document.removeEventListener('keydown', blockKeys, true);
      showScreen('stimulus');
      state.currentTrial += 1;
      runPracticeTrial();
    }, 1200);
  }

  // ========== COMPLETION ==========
  async function showCompletion() {
    const totalCorrect = state.allData.filter(d => d.accuracy === 1).length;
    const acc = state.allData.length ? (totalCorrect / state.allData.length * 100).toFixed(1) : '—';
    const meanRt = (state.allData.reduce((s, d) => s + (d.rt_ms || 0), 0) /
                   Math.max(1, state.allData.filter(d => d.rt_ms != null).length)).toFixed(0);

    const summary = {
      participant_id: state.participantInfo.id,
      participant_group: state.participantInfo.group,
      age: state.participantInfo.age,
      gender: state.participantInfo.gender,
      handedness: state.participantInfo.handedness,
      total_trials: state.allData.length,
      total_correct: totalCorrect,
      overall_accuracy: acc,
      mean_rt: meanRt,
      completion_time: new Date().toISOString(),
      trial: 'SUMMARY',
      block: 'SUMMARY',
      navigation_type: 'SUMMARY',
      difficulty: 'SUMMARY',
      device_type: isMobile ? 'mobile/tablet' : 'desktop'
    };
    
    await saveToGoogleSheet(summary);

    notifyParentIfEmbedded({ completed: true });

    const txt = document.getElementById('feedback-text');
    const dl = document.getElementById('download-data');
    txt.innerHTML = `
      <h2>Experiment Complete!</h2>
      <p>Thank you for participating.</p>
      <p>Your data has been saved.</p>
      <p>Overall accuracy: ${acc}%</p>
      <p>Participant ID: ${state.participantInfo.id}</p>
      <hr style="margin: 20px 0;">
      <p style="font-size: 14px; color: #666;">Optional: Download a backup copy of your data below</p>`;
    txt.style.color = '#333';
    dl.style.display = 'inline-block';
    dl.onclick = downloadData;
    showScreen('feedback');
  }

  function downloadData() {
    if (!state.allData.length) return alert('No data to download');
    const headers = Object.keys(state.allData[0]);
    const csv = [
      headers.join(','),
      ...state.allData.map(r =>
        headers.map(h => {
          const v = r[h];
          if (typeof v === 'string' && v.includes(',')) return `"${v.replace(/"/g, '""')}"`;
          return v ?? '';
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spatial_nav_${state.participantInfo.id}_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ========== TOUCH CONTROLS ==========
  function setupTouchControls() {
    touchControls.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        handleResponse({ key: btn.dataset.key });
      }, { passive: false });
      
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        handleResponse({ key: btn.dataset.key });
      });
    });
  }

  // ========== INITIALIZATION ==========
  // Prevent page scroll on arrow keys
  window.addEventListener('keydown', (e) => {
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) e.preventDefault();
  }, { passive: false });

  // Set up form listeners
  document.getElementById('participant-group').addEventListener('change', onGroupChange);
  document.getElementById('age').addEventListener('input', maybeEnableStart);
  document.getElementById('gender').addEventListener('change', maybeEnableStart);
  document.getElementById('handedness').addEventListener('change', maybeEnableStart);
  document.getElementById('start-button').addEventListener('click', startExperiment);

  // Setup touch controls if mobile
  if (isMobile) {
    setupTouchControls();
    console.log('Mobile/tablet device detected - D-pad controls enabled');
  }

  // Initialize
  maybeEnableStart();
  updateProgress();

})();
