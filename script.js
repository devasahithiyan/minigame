/*******************************************************
 * DOM ELEMENTS
 *******************************************************/
console.log("Script loaded...");

const userFaceContainer = document.getElementById('userFaceContainer');
const userFace = document.getElementById('userFace');
const heartsContainer = document.getElementById('heartsContainer');
const gfFace = document.getElementById('gfFace');
const slider = document.getElementById('slider');
const sliderValue = document.getElementById('sliderValue');
const scoreBoard = document.getElementById('scoreBoard');
const livesBoard = document.getElementById('livesBoard');
const gameStatus = document.getElementById('gameStatus');

// Web-hosted sounds from CodePen
const bgMusic   = document.getElementById('bgMusic');
const catchSound= document.getElementById('catchSound');
const missSound = document.getElementById('missSound');

/*******************************************************
 * GAME VARIABLES
 *******************************************************/
// GAME_DURATION: 20 seconds as requested
let score = 0;
let lives = 5;
let gameActive = true;
const GAME_DURATION = 15000; // 20 seconds
let startTime = null;

// Face auto-movement
let userFaceX = 0;
let userFaceSpeed = 4;
let userFaceDirection = 1; // 1 = move right, -1 = move left

// Heart dropping
let HEART_DROP_INTERVAL = 1200;
let heartDropTimer = null;

// requestAnimationFrame
let lastTimestamp = 0;

/*******************************************************
 * POWER HEART CHANCE
 *******************************************************/
function isPowerHeart() {
  // 20% chance to produce a power heart
  return Math.random() < 0.3;
}

/*******************************************************
 * INIT GAME
 *******************************************************/
function initGame() {
  console.log("Initializing game...");
  userFaceX = 0;
  userFaceContainer.style.left = '0px';

  // Center gf face horizontally
  gfFace.style.left = `${(window.innerWidth - gfFace.offsetWidth) / 2}px`;

  // Reset score & lives
  score = 0;
  lives = 5;
  updateScore();
  updateLives();

  gameStatus.textContent = "";

  // Start background music
  if(bgMusic) {
    bgMusic.volume = 0.4;
    bgMusic.currentTime = 0;
    bgMusic.play().catch(err => {
      console.warn("Autoplay might be blocked:", err);
    });
  }

  // Mark the start time
  startTime = performance.now();

  // Start the main loop
  requestAnimationFrame((timestamp) => {
    lastTimestamp = timestamp;
    gameLoop(timestamp);
  });

  // Start dropping hearts
  heartDropTimer = setInterval(() => {
    if(!gameActive) return;
    dropHeart();
  }, HEART_DROP_INTERVAL);
}

/*******************************************************
 * MAIN GAME LOOP
 *******************************************************/
function gameLoop(timestamp) {
  if(!gameActive) return;

  const deltaTime = timestamp - lastTimestamp;
  lastTimestamp = timestamp;

  // Move your face
  moveUserFace(deltaTime);

  // Check the timer
  const elapsed = timestamp - startTime;
  const timeLeft = GAME_DURATION - elapsed;
  if(timeLeft <= 0) {
    endGame();
    return;
  } else {
    const secondsLeft = Math.ceil(timeLeft / 1000);
    gameStatus.textContent = `Time left: ${secondsLeft}s`;
  }

  // Optional difficulty bump after 10s or 15s, etc. (Up to you)
  // Example: after 10s, drop frequency becomes 1000ms
  // if(elapsed > 10000 && HEART_DROP_INTERVAL !== 1000) { ... }

  requestAnimationFrame(gameLoop);
}

/*******************************************************
 * MOVE YOUR FACE
 *******************************************************/
function moveUserFace(deltaTime) {
  // scale movement by frame time (~16.67ms at 60fps)
  const moveAmount = userFaceSpeed * (deltaTime / 16.67) * userFaceDirection;
  userFaceX += moveAmount;

  const faceWidth = userFace.offsetWidth;
  const maxRight = window.innerWidth - faceWidth;

  if(userFaceX < 0) {
    userFaceX = 0;
    userFaceDirection = 1;
  }
  else if(userFaceX > maxRight) {
    userFaceX = maxRight;
    userFaceDirection = -1;
  }

  userFaceContainer.style.left = `${userFaceX}px`;
}

/*******************************************************
 * DROP HEART
 *******************************************************/
function dropHeart() {
  if(!gameActive) return;

  const heart = document.createElement('div');
  const isPower = isPowerHeart();
  heart.classList.add('heart', isPower ? 'power' : 'normal');

  // Position the heart under your face
  const faceRect = userFaceContainer.getBoundingClientRect();
  const heartSize = 30;
  heart.style.left = `${
    faceRect.left + (faceRect.width/2) - (heartSize/2)
  }px`;
  heart.style.top = `${faceRect.bottom}px`;

  heartsContainer.appendChild(heart);

  // Animate falling
  const fallSpeed = 2;
  const fallInterval = setInterval(() => {
    if(!gameActive) {
      clearInterval(fallInterval);
      heart.remove();
      return;
    }

    let currentTop = parseFloat(heart.style.top);
    heart.style.top = `${currentTop + fallSpeed}px`;

    // Collision check
    const heartRect = heart.getBoundingClientRect();
    const gfRect = gfFace.getBoundingClientRect();

    if(
      heartRect.bottom >= gfRect.top &&
      heartRect.right >= gfRect.left &&
      heartRect.left <= gfRect.right
    ) {
      // Caught
      score += isPower ? 3 : 1;
      updateScore();

      if(catchSound) {
        catchSound.currentTime = 0;
        catchSound.play().catch(()=>{});
      }

      createParticles(
        heartRect.left + heartRect.width/2,
        heartRect.top + heartRect.height/2
      );

      clearInterval(fallInterval);
      heart.remove();
    }

    // Missed?
    if(currentTop > window.innerHeight) {
      clearInterval(fallInterval);
      heart.remove();
      loseLife();
    }
  }, 20);
}

/*******************************************************
 * PARTICLES
 *******************************************************/
function createParticles(x, y) {
  const numParticles = 10;
  for(let i=0; i<numParticles; i++) {
    const p = document.createElement('div');
    p.classList.add('particle');
    p.style.left = `${x}px`;
    p.style.top  = `${y}px`;
    p.style.backgroundColor = `hsl(${Math.random()*360},100%,50%)`;
    heartsContainer.appendChild(p);

    // random velocity
    const angle = Math.random()*Math.PI*2;
    const speed = Math.random()*4 + 1;
    let vx = Math.cos(angle)*speed;
    let vy = Math.sin(angle)*speed;

    let px = x, py = y;

    const partInterval = setInterval(() => {
      if(!gameActive) {
        clearInterval(partInterval);
        p.remove();
        return;
      }

      px += vx;
      py += vy;
      p.style.left = px + "px";
      p.style.top  = py + "px";

      let op = parseFloat(p.style.opacity || "1");
      op = Math.max(0, op - 0.02);
      p.style.opacity = op;

      let scale = parseFloat(
        (p.style.transform.match(/scale\\((.*?)\\)/) || [])[1] || "1"
      );
      scale = Math.max(0, scale - 0.02);
      p.style.transform = `scale(${scale})`;

      if(op <= 0 || px<0 || px>window.innerWidth || py>window.innerHeight) {
        clearInterval(partInterval);
        p.remove();
      }
    }, 20);
  }
}

/*******************************************************
 * SLIDER -> GF FACE
 *******************************************************/
slider.addEventListener('input', e => {
  const val = parseInt(e.target.value, 10);
  sliderValue.textContent = `${val}%`;
  moveGfFace(val);
});

function moveGfFace(val) {
  const gfWidth = gfFace.offsetWidth;
  const maxLeft = window.innerWidth - gfWidth;
  const newLeft = (val / 100) * maxLeft;
  gfFace.style.left = `${newLeft}px`;
}

/*******************************************************
 * SCORING & LIVES
 *******************************************************/
function updateScore() {
  scoreBoard.textContent = `Score: ${score}`;
}

function updateLives() {
  livesBoard.textContent = `Lives: ${lives}`;
}

function loseLife() {
  lives--;
  updateLives();

  if(missSound) {
    missSound.currentTime = 0;
    missSound.play().catch(()=>{});
  }

  if(lives <= 0) {
    endGame();
  }
}

/*******************************************************
 * COUPON CODE LOGIC
 *******************************************************/
/** 
 * Return explicit coupon codes based on final score.
 * Adjust as you prefer.
 *
 * 0-4  => "selfiewithme"
 * 5-9  => "coffeedatewithme"
 * 10-14 => "moviedatewithme"
 * 15+   => "secretgiftwithme"
 */
function getCouponCode(score) {
  if(score < 8) {
    return "selfiewithme";
  } else if(score < 15) {
    return "coffeedatewithme";
  } else if(score < 20) {
    return "moviedatewithme";
  } else {
    return "secretgiftwithme";
  }
}

/*******************************************************
 * END GAME
 *******************************************************/
function endGame() {
  console.log("Game Over");
  gameActive = false;

  if(bgMusic) {
    bgMusic.pause();
  }

  clearInterval(heartDropTimer);

  // Get coupon code based on final score
  const coupon = getCouponCode(score);

  // Show final message with coupon code
  gameStatus.innerHTML = `
    Game Over!<br>
    Final Score: ${score}<br><br>
    <strong>Coupon Code: ${coupon}</strong><br>
    <small style="font-size:14px;">
      Send this code to me on WhatsApp to claim it!
    </small>
    <br><br>
    <button id="restartBtn">Restart</button>
  `;

  const restartBtn = document.getElementById('restartBtn');
  restartBtn.addEventListener('click', () => {
    location.reload();
  });
}

/*******************************************************
 * START THE GAME
 *******************************************************/
initGame();
