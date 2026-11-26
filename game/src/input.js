// Ridgeline Run: keyboard and mouse.
// One clear job: turn keys and clicks into a clean input state.

export function makeInput() {
  return {
    keys: new Set(),
    pitch: 0,
    roll: 0,
    throttleDelta: 0,
    clicked: null,
    mouseX: 0,
    mouseY: 0,
  };
}

const KEYMAP = {
  ArrowUp: 'pitchUp',
  KeyW: 'throttleUp',
  ArrowDown: 'pitchDown',
  KeyS: 'throttleDown',
  ArrowLeft: 'rollLeft',
  KeyA: 'rollLeft',
  ArrowRight: 'rollRight',
  KeyD: 'rollRight',
  KeyG: 'gear',
  KeyP: 'pause',
  KeyM: 'mission',
  Enter: 'confirm',
  Space: 'confirm',
  Escape: 'back',
};

export function attachInput(input, canvas, handlers) {
  window.addEventListener('keydown', (event) => {
    const action = KEYMAP[event.code];
    if (!action) return;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
    if (event.repeat) return;
    input.keys.add(action);
    if (action === 'gear' && handlers.onGear) handlers.onGear();
    if (action === 'pause' && handlers.onPause) handlers.onPause();
    if (action === 'mission' && handlers.onMission) handlers.onMission();
    if (action === 'confirm' && handlers.onConfirm) handlers.onConfirm();
    if (action === 'back' && handlers.onBack) handlers.onBack();
  });
  window.addEventListener('keyup', (event) => {
    const action = KEYMAP[event.code];
    if (action) input.keys.delete(action);
  });
  canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    input.mouseX = event.clientX - rect.left;
    input.mouseY = event.clientY - rect.top;
  });
  canvas.addEventListener('mousedown', (event) => {
    const rect = canvas.getBoundingClientRect();
    input.mouseX = event.clientX - rect.left;
    input.mouseY = event.clientY - rect.top;
    input.clicked = { x: input.mouseX, y: input.mouseY };
    if (handlers.onClick) handlers.onClick(input.mouseX, input.mouseY);
  });
  window.addEventListener('blur', () => input.keys.clear());
}

// Resolve the held keys into this frame's stick deflection.
export function pollInput(input) {
  const k = input.keys;
  input.pitch = (k.has('pitchUp') ? 1 : 0) + (k.has('pitchDown') ? -1 : 0);
  input.roll = (k.has('rollLeft') ? -1 : 0) + (k.has('rollRight') ? 1 : 0);
  input.throttleDelta = (k.has('throttleUp') ? 1 : 0) + (k.has('throttleDown') ? -1 : 0);
  return input;
}
