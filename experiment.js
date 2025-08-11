// ============================================
// SPATIAL NAVIGATION TASK - ENHANCED MOBILE VERSION
// ============================================

// Enhanced Configuration
const CONFIG = {
    trialsPerBlock: 15,
    maxResponseTime: 3000,
    fixationDuration: 800,
    itiDuration: 400,
    practiceTrials: 7,  // Increased for better training
    catchTrialsPerBlock: 1,  // Attention check trials
    buttonFamiliarization: true,  // Pre-practice button training
    hapticFeedback: true,
    responseLockout: 500,  // ms after response
    minTouchDuration: 50,  // ms to register valid touch
    maxDoubleTapInterval: 300,  // prevent double-tap
    repetitions: 2,
    navigationTypes: ['egocentric', 'allocentric'],
    difficultyLevels: ['easy', 'hard']
};

// Group descriptions
const GROUP_DESCRIPTIONS = {
    DF: 'Deaf individuals who are fluent in sign language',
    HF: 'Hearing individuals who are fluent in sign language',
    DNF: 'Deaf individuals who are not fluent in sign language',
    HNF: 'Hearing individuals who are not fluent in sign language',
    HNS: 'Hearing individuals who do not know sign language'
};

// Global state
const state = {
    participantInfo: {},
    isPractice: false,
    isCatchTrial: false,
    isButtonTraining: false,
    currentBlock: 0,
    currentTrial: 0,
    currentBlockStimuli: [],
    usedStimuliTracker: {},
    currentStimulus: null,
    currentNavType: null,
    currentDifficulty: null,
    stimulusOnsetTime: null,
    touchStartTime: null,
    responseTimeout: null,
    buttonsEnabled: false,
    lastTouchEnd: 0,
    trainingTargets: ['up', 'down', 'left', 'right'],
    trainingIndex: 0,
    allData: [],
    blockData: [],
    blocks: [],
    deviceInfo: {
        type: null,
        screenSize: null,
        touchCapable: null
    }
};

// Instructions text
const INSTRUCTIONS = {
    egocentric: {
        title: 'PLAYER VIEW',
        text: `Navigate as if YOU are the player in the maze.<br><br>
               <strong>↑ UP</strong> = Move forward (direction you're facing)<br>
               <strong>↓ DOWN</strong> = Move backward<br>
               <strong>← LEFT</strong> = Turn to your left<br>
               <strong>→ RIGHT</strong> = Turn to your right<br><br>
               Choose the FIRST step to reach the red target.`
    },
    allocentric: {
        title: 'MAP VIEW',
        text: `Navigate using compass/map directions.<br><br>
               <strong>↑ UP</strong> = Move toward top of screen<br>
               <strong>↓ DOWN</strong> = Move toward bottom<br>
               <strong>← LEFT</strong> = Move toward left side<br>
               <strong>→ RIGHT</strong> = Move toward right side<br><br>
               Choose the FIRST step to reach the red target.`
    },
    control: {
        title: 'ARROW FOLLOWING',
        text: `Follow the arrows shown in the maze.<br><br>
               Press the button matching the FIRST arrow from the player's position.<br><br>
               <strong>Example:</strong> If the first arrow points right, press →`
    }
};

// Catch trial stimuli (obvious correct answers for attention checks)
const CATCH_TRIALS = [
    { id: "catch_01", instruction: "Press UP ↑", correct: "up" },
    { id: "catch_02", instruction: "Press DOWN ↓", correct: "down" },
    { id: "catch_03", instruction: "Press LEFT ←", correct: "left" },
    { id: "catch_04", instruction: "Press RIGHT →", correct: "right" }
];

// ============================================
// DEVICE DETECTION
// ============================================

function detectDevice() {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isTablet = /iPad|Android/i.test(navigator.userAgent) && Math.min(window.screen.width, window.screen.height) >= 768;
    const touchCapable = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    state.deviceInfo = {
        type: isTablet ? 'tablet' : (isMobile ? 'mobile' : 'desktop'),
        screenSize: `${window.screen.width}x${window.screen.height}`,
        touchCapable: touchCapable
    };
    
    return state.deviceInfo;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function showScreen(screenId) {
    const screens = ['data-entry-screen', 'button-training-screen', 'instruction-screen', 'stimulus-screen', 'feedback-screen'];
    screens.forEach(id => {
        const screen = document.getElementById(id);
        if (screen) {
            screen.classList.toggle('active', id === screenId);
        }
    });
}

function updateProgress() {
    const progressText = document.getElementById('progress-text');
    const progressFill = document.getElementById('progress-fill');
    const practiceIndicator = document.getElementById('practice-indicator');
    
    if (state.isButtonTraining) {
        progressText.textContent = 'Button Training';
        progressFill.style.width = '5%';
        return;
    }
    
    if (state.isPractice) {
        progressText.textContent = `Practice ${state.currentTrial + 1}/${CONFIG.practiceTrials}`;
        progressFill.style.width = `${((state.currentTrial + 1) / CONFIG.practiceTrials) * 100}%`;
        practiceIndicator.classList.add('active');
    } else {
        const totalBlocks = state.blocks.length;
        const currentProgress = (state.currentBlock * CONFIG.trialsPerBlock + state.currentTrial + 1);
        const totalTrials = totalBlocks * CONFIG.trialsPerBlock;
        
        progressText.textContent = `Block ${state.currentBlock + 1}/${totalBlocks} - Trial ${state.currentTrial + 1}/${CONFIG.trialsPerBlock}`;
        progressFill.style.width = `${(currentProgress / totalTrials) * 100}%`;
        practiceIndicator.classList.remove('active');
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function provideHapticFeedback() {
    if (CONFIG.hapticFeedback && navigator.vibrate) {
        navigator.vibrate(10);
        const indicator = document.getElementById('haptic-indicator');
        if (indicator) {
            indicator.classList.add('show');
            setTimeout(() => indicator.classList.remove('show'), 300);
        }
    }
}

function showResponseFeedback(direction) {
    const feedback = document.getElementById('response-feedback');
    if (feedback) {
        feedback.textContent = direction === 'up' ? '↑' :
                               direction === 'down' ? '↓' :
                               direction === 'left' ? '←' : '→';
        feedback.classList.add('show');
        setTimeout(() => feedback.classList.remove('show'), 300);
    }
}

// ============================================
// RANDOM NUMBER GENERATOR
// ============================================

class RNG {
    constructor(seed) {
        this.seed = seed;
    }
    
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

function createRNG(participantId, suffix = '') {
    const base = String(participantId + suffix).split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const jitter = Date.now() % 1000;
    return new RNG(base * 1000 + jitter);
}

// ============================================
// COUNTERBALANCING
// ============================================

function determineCounterbalance(participantId) {
    const match = String(participantId).match(/\d+/);
    const num = match ? parseInt(match[0], 10) : 
                [...String(participantId)].reduce((a, c) => a + c.charCodeAt(0), 0);
    return (num % 4) + 1;
}

function createBlockSequence(counterbalance) {
    const latinSquare = [
        [['egocentric', 'easy'], ['egocentric', 'hard'], ['allocentric', 'easy'], ['allocentric', 'hard']],
        [['egocentric', 'hard'], ['allocentric', 'hard'], ['egocentric', 'easy'], ['allocentric', 'easy']],
        [['allocentric', 'easy'], ['egocentric', 'easy'], ['allocentric', 'hard'], ['egocentric', 'hard']],
        [['allocentric', 'hard'], ['allocentric', 'easy'], ['egocentric', 'hard'], ['egocentric', 'easy']]
    ];
    
    const baseSequence = latinSquare[counterbalance - 1];
    const blocks = [];
    
    // Add repetitions
    for (let rep = 0; rep < CONFIG.repetitions; rep++) {
        baseSequence.forEach(([navType, difficulty]) => {
            blocks.push({ navType, difficulty });
        });
    }
    
    // Insert control block in the middle
    blocks.splice(4, 0, { navType: 'control', difficulty: 'control' });
    
    return blocks;
}

// ============================================
// STIMULUS PREPARATION
// ============================================

function prepareBlockStimuli(navType, difficulty, blockIndex, rng) {
    const stimuliPool = stimulusMapping[difficulty];
    if (!stimuliPool || stimuliPool.length === 0) return [];
    
    const key = `${navType}_${difficulty}`;
    if (!state.usedStimuliTracker[key]) {
        state.usedStimuliTracker[key] = new Set();
    }
    
    // Get regular stimuli (leave room for catch trials)
    const regularTrials = CONFIG.trialsPerBlock - CONFIG.catchTrialsPerBlock;
    
    // Separate used and unused stimuli
    const unused = stimuliPool.filter(s => !state.usedStimuliTracker[key].has(s.id));
    const used = stimuliPool.filter(s => state.usedStimuliTracker[key].has(s.id));
    
    // Combine and shuffle
    let pool = [...unused, ...used];
    pool = rng.shuffle(pool);
    
    // Select stimuli for this block
    const selected = [];
    for (let i = 0; i < regularTrials && i < pool.length; i++) {
        selected.push(pool[i]);
        state.usedStimuliTracker[key].add(pool[i].id);
    }
    
    // If we need more stimuli, recycle
    if (selected.length < regularTrials) {
        const additional = regularTrials - selected.length;
        const recycled = rng.shuffle(stimuliPool).slice(0, additional);
        selected.push(...recycled);
    }
    
    // Insert catch trials at random positions
    const catchTrials = rng.shuffle(CATCH_TRIALS).slice(0, CONFIG.catchTrialsPerBlock);
    catchTrials.forEach(catchTrial => {
        const position = Math.floor(rng.random() * (selected.length + 1));
        selected.splice(position, 0, { ...catchTrial, isCatch: true });
    });
    
    return selected;
}

async function preloadImages(stimuli) {
    const promises = stimuli.map(stimulus => {
        if (stimulus.isCatch) return Promise.resolve(); // No image for catch trials
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = resolve;
            img.onerror = resolve; // Continue even if image fails
            img.src = stimulus.file;
        });
    });
    await Promise.all(promises);
}

// ============================================
// BUTTON TRAINING
// ============================================

function startButtonTraining() {
    state.isButtonTraining = true;
    state.trainingIndex = 0;
    state.trainingTargets = shuffleArray(['up', 'down', 'left', 'right', 'up', 'left', 'down', 'right']);
    
    // Reset all targets
    ['up', 'down', 'left', 'right'].forEach(dir => {
        const target = document.getElementById(`target-${dir}`);
        if (target) target.classList.remove('completed');
    });
    
    showNextTrainingTarget();
    showScreen('button-training-screen');
}

function showNextTrainingTarget() {
    if (state.trainingIndex >= state.trainingTargets.length) {
        completeButtonTraining();
        return;
    }
    
    const target = state.trainingTargets[state.trainingIndex];
    const arrows = { up: '↑', down: '↓', left: '←', right: '→' };
    
    document.getElementById('current-target').textContent = arrows[target];
}

function handleTrainingPress(direction) {
    const expected = state.trainingTargets[state.trainingIndex];
    
    if (direction === expected) {
        // Correct press
        provideHapticFeedback();
        
        // Visual feedback
        const btn = document.querySelector(`.dpad-btn.${direction}`);
        btn.classList.add('pressed');
        setTimeout(() => btn.classList.remove('pressed'), 200);
        
        // Mark as completed
        const targetDiv = document.getElementById(`target-${direction}`);
        if (targetDiv && state.trainingIndex < 4) { // Only first 4 are shown
            targetDiv.classList.add('completed');
        }
        
        state.trainingIndex++;
        
        if (state.trainingIndex >= state.trainingTargets.length) {
            setTimeout(completeButtonTraining, 500);
        } else {
            setTimeout(showNextTrainingTarget, 300);
        }
    } else {
        // Wrong press - provide feedback
        navigator.vibrate && navigator.vibrate([50, 50, 50]); // Different haptic pattern
    }
}

function completeButtonTraining() {
    state.isButtonTraining = false;
    
    // Show completion message
    document.getElementById('training-instruction').innerHTML = `
        <strong style="color: #4CAF50;">Great job!</strong><br>
        You're ready to start the practice trials.
    `;
    
    setTimeout(() => {
        showPracticeInstructions();
    }, 1500);
}

function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// ============================================
// FORM HANDLING
// ============================================

function onGroupChange() {
    const group = document.getElementById('participant-group').value;
    const desc = document.getElementById('group-desc');
    desc.textContent = group ? (GROUP_DESCRIPTIONS[group] || '') : '';
    checkFormReady();
}

function checkFormReady() {
    const group = document.getElementById('participant-group').value;
    const age = document.getElementById('age').value;
    const gender = document.getElementById('gender').value;
    const handedness = document.getElementById('handedness').value;
    const startBtn = document.getElementById('start-button');
    
    const ready = group && age && gender && handedness;
    startBtn.disabled = !ready;
    startBtn.textContent = ready ? 'Start Experiment' : 'Fill in all fields to continue';
}

// ============================================
// EXPERIMENT START
// ============================================

async function startExperiment() {
    // Collect participant info
    const group = document.getElementById('participant-group').value;
    const age = document.getElementById('age').value;
    const gender = document.getElementById('gender').value;
    const handedness = document.getElementById('handedness').value;
    
    if (!group || !age || !gender || !handedness) {
        alert('Please fill in all required fields');
        return;
    }
    
    // Detect device
    detectDevice();
    
    // Generate participant ID
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    const participantId = `${group}-${timestamp}-${random}`;
    
    // Store participant info
    state.participantInfo = {
        id: participantId,
        group,
        age,
        gender,
        handedness,
        device_type: state.deviceInfo.type,
        screen_size: state.deviceInfo.screenSize,
        touch_capable: state.deviceInfo.touchCapable,
        timestamp: new Date().toISOString()
    };
    
    // Setup counterbalancing
    const counterbalance = determineCounterbalance(participantId);
    state.blocks = createBlockSequence(counterbalance);
    
    // Start button training if enabled
    if (CONFIG.buttonFamiliarization) {
        startButtonTraining();
    } else {
        showPracticeInstructions();
    }
}

// ============================================
// PRACTICE PHASE
// ============================================

function showPracticeInstructions() {
    const instructionText = document.getElementById('instruction-text');
    const navIndicator = document.getElementById('nav-type-indicator');
    const continueBtn = document.getElementById('instruction-continue');
    
    navIndicator.className = '';
    navIndicator.textContent = '';
    
    instructionText.innerHTML = `
        <h3>Practice Phase</h3>
        <p>Let's practice with ${CONFIG.practiceTrials} trials to learn the task.</p>
        <p>You'll practice both navigation types:</p>
        <ul style="text-align: left; margin: 20px auto; max-width: 400px;">
            <li><strong>Player View:</strong> Navigate as the player</li>
            <li><strong>Map View:</strong> Use compass directions</li>
        </ul>
        <p>You'll receive feedback during practice.</p>
        <p style="margin-top: 20px; color: #666; font-size: 14px;">
            Remember: Respond as quickly and accurately as possible!
        </p>
    `;
    
    continueBtn.onclick = startPractice;
    showScreen('instruction-screen');
}

function startPractice() {
    state.isPractice = true;
    state.currentTrial = 0;
    runPracticeTrial();
}

function runPracticeTrial() {
    if (state.currentTrial >= CONFIG.practiceTrials) {
        endPractice();
        return;
    }
    
    // Alternate between navigation types for practice
    const navType = state.currentTrial < Math.floor(CONFIG.practiceTrials / 2) ? 'egocentric' : 'allocentric';
    
    // Show instruction for new navigation type
    if (state.currentTrial === 0 || state.currentTrial === Math.floor(CONFIG.practiceTrials / 2)) {
        showPracticeInstruction(navType);
    } else {
        // Use a practice stimulus
        const stimulusIndex = state.currentTrial % stimulusMapping.easy.length;
        const stimulus = stimulusMapping.easy[stimulusIndex];
        presentStimulus(stimulus, navType, 'practice');
    }
}

function showPracticeInstruction(navType) {
    const instructionText = document.getElementById('instruction-text');
    const navIndicator = document.getElementById('nav-type-indicator');
    const continueBtn = document.getElementById('instruction-continue');
    
    const instruction = INSTRUCTIONS[navType];
    
    navIndicator.className = `nav-type-header ${navType}-header`;
    navIndicator.textContent = instruction.title;
    
    instructionText.innerHTML = `
        <h4>Practice: ${instruction.title}</h4>
        ${instruction.text}
    `;
    
    continueBtn.onclick = () => {
        const stimulusIndex = state.currentTrial % stimulusMapping.easy.length;
        const stimulus = stimulusMapping.easy[stimulusIndex];
        presentStimulus(stimulus, navType, 'practice');
    };
    
    showScreen('instruction-screen');
}

function endPractice() {
    state.isPractice = false;
    state.currentBlock = 0;
    state.currentTrial = 0;
    
    const instructionText = document.getElementById('instruction-text');
    const navIndicator = document.getElementById('nav-type-indicator');
    const continueBtn = document.getElementById('instruction-continue');
    
    navIndicator.className = '';
    navIndicator.textContent = '';
    
    instructionText.innerHTML = `
        <h3>Practice Complete!</h3>
        <p>Excellent work! You're ready for the main experiment.</p>
        <p>Remember:</p>
        <ul style="text-align: left; margin: 20px auto; max-width: 400px;">
            <li>Respond as quickly and accurately as possible</li>
            <li>Choose the FIRST step to reach the target</li>
            <li>You have 3 seconds to respond</li>
            <li>There will be occasional attention checks</li>
        </ul>
        <p>Take a short break if needed.</p>
    `;
    
    continueBtn.onclick = showBlockInstructions;
    showScreen('instruction-screen');
}

// ============================================
// MAIN EXPERIMENT
// ============================================

function showBlockInstructions() {
    const block = state.blocks[state.currentBlock];
    const instructionText = document.getElementById('instruction-text');
    const navIndicator = document.getElementById('nav-type-indicator');
    const continueBtn = document.getElementById('instruction-continue');
    
    const instruction = INSTRUCTIONS[block.navType];
    
    navIndicator.className = `nav-type-header ${block.navType}-header`;
    navIndicator.textContent = instruction.title;
    
    instructionText.innerHTML = `
        <h4>Block ${state.currentBlock + 1} of ${state.blocks.length}</h4>
        ${instruction.text}
        <p style="margin-top: 20px;">Press Continue when ready.</p>
    `;
    
    continueBtn.onclick = startBlock;
    updateProgress();
    showScreen('instruction-screen');
}

async function startBlock() {
    const block = state.blocks[state.currentBlock];
    const rng = createRNG(state.participantInfo.id, `_block${state.currentBlock}`);
    
    // Prepare stimuli for this block (including catch trials)
    state.currentBlockStimuli = prepareBlockStimuli(
        block.navType,
        block.difficulty,
        state.currentBlock,
        rng
    );
    
    state.currentTrial = 0;
    state.blockData = [];
    
    // Preload images
    await preloadImages(state.currentBlockStimuli);
    
    // Start first trial
    nextTrial();
}

function nextTrial() {
    if (state.currentTrial >= state.currentBlockStimuli.length) {
        // Block complete
        state.allData.push(...state.blockData);
        state.currentBlock++;
        
        if (state.currentBlock >= state.blocks.length) {
            // Experiment complete
            showCompletion();
        } else {
            // Next block
            showBlockInstructions();
        }
        return;
    }
    
    const block = state.blocks[state.currentBlock];
    const stimulus = state.currentBlockStimuli[state.currentTrial];
    
    if (!stimulus) {
        console.error('No stimulus available for trial', state.currentTrial);
        state.currentTrial++;
        nextTrial();
        return;
    }
    
    // Check if this is a catch trial
    state.isCatchTrial = stimulus.isCatch || false;
    
    presentStimulus(stimulus, block.navType, block.difficulty);
    updateProgress();
}

// ============================================
// STIMULUS PRESENTATION
// ============================================

function presentStimulus(stimulus, navType, difficulty) {
    state.currentStimulus = stimulus;
    state.currentNavType = navType;
    state.currentDifficulty = difficulty;
    
    const img = document.getElementById('stimulus-image');
    const fixation = document.getElementById('fixation');
    const catchIndicator = document.getElementById('catch-indicator');
    const responseTimer = document.getElementById('response-timer');
    
    // Show/hide catch indicator
    if (catchIndicator) {
        catchIndicator.classList.toggle('active', state.isCatchTrial && !state.isPractice);
    }
    
    // Show fixation cross
    img.style.display = 'none';
    fixation.style.display = 'block';
    showScreen('stimulus-screen');
    
    // Disable buttons during fixation
    setButtonsEnabled(false);
    
    // After fixation duration, show stimulus
    setTimeout(() => {
        fixation.style.display = 'none';
        
        if (state.isCatchTrial) {
            // For catch trials, show instruction text instead of image
            const stage = document.querySelector('.stimulus-stage');
            stage.innerHTML = `
                <div style="font-size: 48px; font-weight: bold; color: #333;">
                    ${stimulus.instruction}
                </div>
            `;
        } else {
            // Regular trial - show image
            img.src = stimulus.file;
            img.style.display = 'block';
        }
        
        // Show response timer
        responseTimer.classList.add('active');
        const timerFill = responseTimer.querySelector('.response-timer-fill');
        timerFill.style.animation = 'none';
        void timerFill.offsetHeight; // Trigger reflow
        timerFill.style.animation = 'countdown 3s linear forwards';
        
        // Record stimulus onset time
        state.stimulusOnsetTime = performance.now();
        
        // Enable response buttons
        setButtonsEnabled(true);
        
        // Set response timeout
        state.responseTimeout = setTimeout(() => {
            handleResponse('timeout');
        }, CONFIG.maxResponseTime);
        
    }, CONFIG.fixationDuration);
}

function setButtonsEnabled(enabled) {
    state.buttonsEnabled = enabled;
    const buttons = document.querySelectorAll('.dpad-btn');
    buttons.forEach(btn => {
        btn.disabled = !enabled;
    });
}

// ============================================
// RESPONSE HANDLING
// ============================================

function handleButtonPress(direction) {
    if (!state.buttonsEnabled) return;
    
    // Record touch start time if not already recorded
    if (!state.touchStartTime) {
        state.touchStartTime = performance.now();
    }
    
    // Visual feedback
    const btn = document.querySelector(`.dpad-btn.${direction}`);
    btn.classList.add('pressed');
    setTimeout(() => btn.classList.remove('pressed'), 200);
    
    handleResponse(direction);
}

// Also handle keyboard responses for desktop
document.addEventListener('keydown', (e) => {
    if (!state.buttonsEnabled) return;
    
    const keyMap = {
        'ArrowUp': 'up',
        'ArrowDown': 'down',
        'ArrowLeft': 'left',
        'ArrowRight': 'right'
    };
    
    if (keyMap[e.key]) {
        e.preventDefault();
        handleResponse(keyMap[e.key]);
    }
});

function handleResponse(response) {
    // Clear timeout
    if (state.responseTimeout) {
        clearTimeout(state.responseTimeout);
        state.responseTimeout = null;
    }
    
    // Hide response timer
    const responseTimer = document.getElementById('response-timer');
    responseTimer.classList.remove('active');
    
    // Disable buttons
    setButtonsEnabled(false);
    
    // Calculate touch duration if applicable
    const touchDuration = state.touchStartTime ? 
                         performance.now() - state.touchStartTime : null;
    state.touchStartTime = null;
    
    // Haptic feedback (except for timeout)
    if (response !== 'timeout') {
        provideHapticFeedback();
        showResponseFeedback(response);
    }
    
    // Calculate RT
    const rt = response === 'timeout' ? null : 
               Math.round(performance.now() - state.stimulusOnsetTime);
    
    // Determine correct response
    let correctResponse;
    if (state.isCatchTrial) {
        correctResponse = state.currentStimulus.correct;
    } else if (state.currentNavType === 'egocentric') {
        correctResponse = state.currentStimulus.egocentric_correct;
    } else if (state.currentNavType === 'allocentric') {
        correctResponse = state.currentStimulus.allocentric_correct;
    } else {
        // Control condition
        correctResponse = state.currentStimulus.egocentric_correct || 
                         state.currentStimulus.allocentric_correct;
    }
    
    // Calculate accuracy
    const accuracy = (response !== 'timeout' && response === correctResponse) ? 1 : 0;
    
    // Create trial data with enhanced metrics
    const trialData = {
        participant_id: state.participantInfo.id,
        participant_group: state.participantInfo.group,
        age: state.participantInfo.age,
        gender: state.participantInfo.gender,
        handedness: state.participantInfo.handedness,
        device_type: state.deviceInfo.type,
        screen_size: state.deviceInfo.screenSize,
        block: state.isPractice ? 'practice' : state.currentBlock + 1,
        trial: state.currentTrial + 1,
        trial_type: state.isCatchTrial ? 'catch' : 'regular',
        navigation_type: state.currentNavType,
        difficulty: state.currentDifficulty,
        stimulus_id: state.currentStimulus.id,
        response: response === 'timeout' ? 'none' : response,
        correct_response: correctResponse,
        accuracy: accuracy,
        rt: rt,
        touch_duration: touchDuration,
        timestamp: new Date().toISOString()
    };
    
    // Store data (unless practice)
    if (!state.isPractice) {
        state.blockData.push(trialData);
    }
    
    // Reset stimulus stage if it was a catch trial
    if (state.isCatchTrial && !state.isPractice) {
        const stage = document.querySelector('.stimulus-stage');
        stage.innerHTML = `
            <img id="stimulus-image" src="" alt="Stimulus" style="display: none;">
            <div class="fixation" id="fixation" style="display: none;">
                <div></div>
            </div>
        `;
    }
    
    // Show feedback for practice trials
    if (state.isPractice) {
        showPracticeFeedback(accuracy, response === 'timeout', correctResponse, response);
    } else {
        // Continue to next trial after ITI with lockout
        setTimeout(() => {
            state.currentTrial++;
            nextTrial();
        }, Math.max(CONFIG.itiDuration, CONFIG.responseLockout));
    }
}

function showPracticeFeedback(accuracy, timeout, correct, given) {
    const feedbackText = document.getElementById('feedback-text');
    const feedbackDetails = document.getElementById('feedback-details');
    
    const arrows = { up: '↑', down: '↓', left: '←', right: '→', none: '✗' };
    
    if (timeout) {
        feedbackText.textContent = 'Too Slow!';
        feedbackText.style.color = '#FF9800';
        feedbackDetails.innerHTML = `
            <p>Try to respond within 3 seconds.</p>
            <p style="margin-top: 10px;">Correct answer was: <strong>${arrows[correct]}</strong></p>
        `;
    } else if (accuracy) {
        feedbackText.textContent = 'Correct!';
        feedbackText.style.color = '#4CAF50';
        feedbackDetails.innerHTML = 'Great job! Keep it up!';
    } else {
        feedbackText.textContent = 'Incorrect';
        feedbackText.style.color = '#f44336';
        feedbackDetails.innerHTML = `
            <p>You pressed: <strong>${arrows[given]}</strong></p>
            <p>Correct answer: <strong>${arrows[correct]}</strong></p>
            <p style="margin-top: 10px; font-size: 14px;">Remember to choose the first step to reach the target.</p>
        `;
    }
    
    showScreen('feedback-screen');
    
    // Continue after delay
    setTimeout(() => {
        state.currentTrial++;
        runPracticeTrial();
    }, 2000);
}

// ============================================
// COMPLETION
// ============================================

function showCompletion() {
    const feedbackText = document.getElementById('feedback-text');
    const feedbackDetails = document.getElementById('feedback-details');
    const downloadBtn = document.getElementById('download-button');
    
    // Calculate summary statistics
    const totalTrials = state.allData.filter(d => d.trial_type === 'regular').length;
    const catchTrials = state.allData.filter(d => d.trial_type === 'catch').length;
    const correctRegular = state.allData.filter(d => d.trial_type === 'regular' && d.accuracy === 1).length;
    const correctCatch = state.allData.filter(d => d.trial_type === 'catch' && d.accuracy === 1).length;
    
    const regularAccuracy = totalTrials > 0 ? ((correctRegular / totalTrials) * 100).toFixed(1) : 0;
    const catchAccuracy = catchTrials > 0 ? ((correctCatch / catchTrials) * 100).toFixed(1) : 100;
    
    const validRTs = state.allData.filter(d => d.rt !== null).map(d => d.rt);
    const meanRT = validRTs.length > 0 ? 
                   Math.round(validRTs.reduce((a, b) => a + b, 0) / validRTs.length) : 0;
    
    feedbackText.textContent = 'Experiment Complete!';
    feedbackText.style.color = '#333';
    
    feedbackDetails.innerHTML = `
        <h3>Thank you for participating!</h3>
        <p>Your results:</p>
        <ul style="text-align: left; margin: 20px auto; max-width: 350px;">
            <li>Overall Accuracy: ${regularAccuracy}%</li>
            <li>Attention Check Accuracy: ${catchAccuracy}%</li>
            <li>Average Response Time: ${meanRT}ms</li>
            <li>Total Trials Completed: ${state.allData.length}</li>
        </ul>
        <p style="margin-top: 20px;">Participant ID:<br><strong>${state.participantInfo.id}</strong></p>
        <p style="margin-top: 20px; font-size: 14px; color: #666;">
            Your data has been saved. Please download a copy for your records.
        </p>
    `;
    
    downloadBtn.style.display = 'inline-block';
    showScreen('feedback-screen');
}

// ============================================
// DATA EXPORT
// ============================================

function downloadData() {
    if (state.allData.length === 0) {
        alert('No data to download');
        return;
    }
    
    // Convert data to CSV
    const headers = Object.keys(state.allData[0]);
    const csv = [
        headers.join(','),
        ...state.allData.map(row => 
            headers.map(header => {
                const value = row[header];
                // Escape commas and quotes in string values
                if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return value !== null && value !== undefined ? value : '';
            }).join(',')
        )
    ].join('\n');
    
    // Create blob and download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `spatial_nav_${state.participantInfo.id}_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// ============================================
// TOUCH HANDLING AND PREVENTION
// ============================================

// Prevent double-tap zoom
let lastTouchEnd = 0;
document.addEventListener('touchend', (e) => {
    const now = Date.now();
    if (now - lastTouchEnd <= CONFIG.maxDoubleTapInterval) {
        e.preventDefault();
    }
    lastTouchEnd = now;
}, false);

// Prevent scrolling and zooming
document.addEventListener('touchmove', (e) => {
    if (e.target.closest('.controls-container, .dpad-container')) {
        e.preventDefault();
    }
}, { passive: false });

// Prevent pinch zoom
document.addEventListener('gesturestart', (e) => {
    e.preventDefault();
});

// Add touch feedback
document.addEventListener('touchstart', (e) => {
    if (e.target.classList.contains('dpad-btn')) {
        state.touchStartTime = performance.now();
    }
}, { passive: true });

// ============================================
// INITIALIZATION
// ============================================

// Initialize on load
window.addEventListener('DOMContentLoaded', () => {
    checkFormReady();
    detectDevice();
    
    // Log device info
    console.log('Device detected:', state.deviceInfo);
});
