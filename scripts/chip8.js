import CPU from './cpu.js';
import Display from './display.js';
import Keyboard from './keyboard.js';

const display = new Display(10);
const keyboard = new Keyboard();
const cpu = new CPU(display, keyboard);

let loop;

let fps = 60, fpsInterval, startTime, now, then, elapsed;

function init() {
    fpsInterval = 1000 / fps;
    then = Date.now();
    startTime = then;

    cpu.storeSpritesInMemory();
    cpu.loadRom('BLINKY');

    loop = requestAnimationFrame(step);
}

function step() {
    now = Date.now();
    elapsed = now - then;

    if (elapsed > fpsInterval) {
        cpu.cycle();
    }

    loop = requestAnimationFrame(step);
}

init();