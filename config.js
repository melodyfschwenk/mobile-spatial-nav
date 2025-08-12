// config.js for Spatial Navigation Task
window.SN_CONFIG = {
  SHEETS_URL: 'https://script.google.com/macros/s/AKfycbzw_gLBsA5hY1dU7xZ1Fp67FptHEC9veo95vyId0bBOfu_QLMNFm02Rg0iRzURzx2Cn/exec',
  
  // Task parameters
  TRIALS_PER_BLOCK: 15,
  PRACTICE_TRIALS: 4,
  MAX_RESPONSE_TIME: 3000,
  FIXATION_DURATION: 800,
  ITI_DURATION: 400,
  REPETITIONS: 2,
  
  // Navigation types
  NAVIGATION_TYPES: ['egocentric', 'allocentric'],
  DIFFICULTY_LEVELS: ['easy', 'hard'],
  
  // Groups
  PARTICIPANT_GROUPS: {
    DF: 'Deaf Fluent Signer',
    HF: 'Hearing Fluent Signer',
    DNF: 'Deaf Non-Fluent Signer',
    HNF: 'Hearing Non-Fluent Signer',
    HNS: 'Hearing Non-Signer'
  },
  
  // Version
  VERSION: 'sn-v1.0-embedded'
};
