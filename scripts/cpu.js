// 4k RAM 0x000 to 0xFFF
// Intepreter is from 0x000 to 0x1FF
// Most of Programs starts from 0x200 but for ETI 660 computer it is  0x600 

// 16 general purpose 8-bit register Vx; x = 0 to F
// 16-bit register called I; used to store addresses so only lowest 12 bits are used
// VF is used as a flag by some instructions
// 2 special purpose register for delay and sound timers. When these are non-zero and decremented at a rate of 60Hz
// pseudo reg are not accessable
// PC sould be 16 bit and is used to store the currently executing address.
// SP can be 8-bit used to point to the topmost level of stack
// Stack is an array of 16 16-bit values.

class CPU {
    constructor(display, keyboard){
        this.memory = new Uint8Array(4096);

        this.register = new Uint8Array(16);

        this.idx_register = 0;
        this.pc = 0x200;
        this.sp = 0;

        this.stack = new Array();

        this.delay = 0;
        this.sound = 0;

        this.opcode = 0;

        this.rng = Math.floor(Math.random()*255);
        this.speed = 10;
        this.paused = false;

        this.display = display;
        this.keypad = keyboard;
    }

    storeSpritesInMemory(){
        const sprites = [
            0xF0, 0x90, 0x90, 0x90, 0xF0, // 0
            0x20, 0x60, 0x20, 0x20, 0x70, // 1
            0xF0, 0x10, 0xF0, 0x80, 0xF0, // 2
            0xF0, 0x10, 0xF0, 0x10, 0xF0, // 3
            0x90, 0x90, 0xF0, 0x10, 0x10, // 4
            0xF0, 0x80, 0xF0, 0x10, 0xF0, // 5
            0xF0, 0x80, 0xF0, 0x90, 0xF0, // 6
            0xF0, 0x10, 0x20, 0x40, 0x40, // 7
            0xF0, 0x90, 0xF0, 0x90, 0xF0, // 8
            0xF0, 0x90, 0xF0, 0x10, 0xF0, // 9
            0xF0, 0x90, 0xF0, 0x90, 0x90, // A
            0xE0, 0x90, 0xE0, 0x90, 0xE0, // B
            0xF0, 0x80, 0x80, 0x80, 0xF0, // C
            0xE0, 0x90, 0x90, 0x90, 0xE0, // D
            0xF0, 0x80, 0xF0, 0x80, 0xF0, // E
            0xF0, 0x80, 0xF0, 0x80, 0x80  // F
        ];

        for(let i=0; i<sprites.length; i++){
            this.memory[80+i] = sprites[i];
        }
    }

    loadRom(romName) {
        var request = new XMLHttpRequest;
        var self = this;

        request.onload = function() {
            if (request.response) {
                let program = new Uint8Array(request.response);
                self.loadRomInMemory(program);
            }
        }

        request.open('GET', '/' + romName);
        request.responseType = 'arraybuffer';

        request.send();
    }

    loadRomInMemory(rom){
        // Program starts from 0x200 (512)
        // Moving ROM to Memoey Array starting from index 0x200 (512)
        for(let i=0; i < rom.length; i++){
            this.memory[512+i] = rom[i];
        }
    }

    cycle(){
        for (let i = 0; i < this.speed; i++) {
            if (!this.paused) {
                let opcode = (this.memory[this.pc] << 8 | this.memory[this.pc + 1]);
                this.pc += 2;
                this.execute(opcode);
            }
        }

        if (!this.paused) {
            if (this.delay > 0) {
                this.delay -= 1;
            }
        
            if (this.sound > 0) {
                this.sound -= 1;
            }
        }

        this.display.render();
    }

    execute(opcode){
        switch (opcode){
            case 0x00e0: 
                this.display.clear(); 
                break;

            case 0x00ee:
                this.pc = this.stack.pop();
                break;

            case 0x1000:
                this.pc = (opcode & 0x0fff);
                break;

            case 0x2000:
                this.stack.push(this.pc);
                this.pc = (opcode & 0x0fff);

            case 0x3000:
                var x = (opcode & 0x0f00) >> 8;
                var kk = (opcode & 0x00ff);
                if(this.register[x] == kk) this.pc += 2;
                break;

            case 0x4000:
                var x = (opcode & 0x0f00) >> 8;
                var kk = (opcode & 0x00ff);
                if(this.register[x] != kk) this.pc += 2;
                break;

            case 0x5000:
                var x = (opcode & 0x0f00) >> 8;
                var y = (opcode & 0x00f0) >> 4;
                if(this.register[x] == this.register[y]) this.pc += 2;
                break;

            case 0x6000:
                var x = (opcode & 0x0f00) >> 8;
                var kk = (opcode & 0x00ff);
                this.register[x] = kk;
                break;

            case 0x7000:
                var x = (opcode & 0x0f00) >> 8;
                var kk = (opcode & 0x00ff);
                this.register[x] += kk;
                break;
            
            case 0x8000:
                var x = (opcode & 0x0f00) >> 8;
                var y = (opcode & 0x00f0) >> 4;

                switch(opcode & 0x000f){
                    case 0x0:
                        this.register[x] = this.register[y];
                        break;

                    case 0x1:
                        this.register[x] |= this.register[y];
                        break;

                    case 0x2:
                        this.register[x] &= this.register[y];
                        break;

                    case 0x3:
                        this.register[x] ^= this.register[y];
                        break;

                    case 0x4:
                        var sum = this.register[x] + this.register[y];
                        if(sum > 255) 
                            this.register[15] = 1;
                        else 
                            this.register[15] = 0;
                        this.register[x] = sum & 0x00ff;
                        break;

                    case 0x5:
                        if(this.register[x] > this.register[y]) 
                            this.register[15] = 1;
                        else 
                            this.register[15] = 0;
                        this.register[x] -= this.register[y];
                        break;

                    case 0x6:
                        this.register[15] = (this.register[x] & 0x1);
                        this.register[x] >>= 1;
                        break;

                    case 0x7:
                        if(this.register[y] > this.register[x])
                            this.register[15] = 1;
                        else
                            this.register[15] = 0;
                        this.register[x] = this.register[y] - this.register[x];
                        break;

                    case 0xe:
                        this.register[15] = (this.register[x] & 0x8);
                        this.register[x] <<= 1;
                        break;
                }

            case 0x9000:
                var x = (opcode & 0x0f00) >> 8;
                var y = (opcode & 0x00f0) >> 4;
                if(this.register[x] !== this.register[y])
                    this.pc += 2;
                break;

            case 0xA000:
                this.i = (opcode & 0x0fff);
                break;
            
            case 0xB000:
                this.pc = (opcode & 0x0fff) + this.register[0];
                break;

            case 0xC000:
                var x = (opcode & 0x0f00) >> 8; 
                this.register[x] = this.rng & (opcode & 0x00ff);
                break;

            case 0xD000:
                var x = (opcode & 0x0f00) >> 8;
                var y = (opcode & 0x00f0) >> 4;
                var n = (opcode & 0x000f);

                for(var row = 0; row < n; row++){
                    var sprite = this.memory[this.i + row];

                    for(var col = 0; col < 8; col++){
                        if((sprite & 0x80) > 0){
                            if(this.display.setPixel(this.register[x] + col, this.register[y] + row))
                                this.v[15] = 1;
                        }

                        sprite <<= 1;
                    }
                }
                break;

            case 0x9E:
                var x = (opcode & 0x0f) >> 8;
                if(this.keypad.isKeyPressed(this.register[x])) 
                    this.pc += 2;
                break;

            case 0xA1:
                var x = (opcode & 0x0f) >> 8;
                if(!this.keypad.isKeyPressed(this.register[x]))
                    this.pc += 2;
                break;
            
            case 0x07:
                var x = (opcode & 0x0f) >> 8;
                this.register[x] = this.delay;
                break;
            
            case 0x0A:
                this.paused = true;

                this.keypad.onNextKeyPress = function(key){
                    this.register[x] = key;
                    this.paused = false;
                }.bind(this);
                break;

            case 0x15:
                var x = (opcode & 0x0f) >> 8;
                this.delay = this.register[x];
                break;

            case 0x18:
                var x = (opcode & 0x0f) >> 8;
                this.sound = this.register[x];
                break;
            
            case 0x1e:
                var x = (opcode & 0x0f) >> 8;
                this.i += this.register[x];
                break;

            case 0x29:
                var x = (opcode & 0x0f) >> 8;
                this.i = this.register[x] * 5;
                break;

            case 0x33:
                var x = (opcode & 0x0f) >> 8;
                var value = this.register[x];
                this.memory[this.i + 2] = parseInt(value % 10);
                value /= 10;
                this.memory[this.i + 1] = parseInt(this.reigster[x] % 10);
                value /= 10;
                this.memory[this.i] = parseInt(this.reigster[x] % 10);
                break;

            case 0x55:
                var x = (opcode & 0x0f) >> 8;
                for( let registerIdx = 0; registerIdx <= x; registeridx++)
                    this.memory[this.i + registerIdx] = this.register[registerIdx];
                break;

            case 0x65:
                var x = (opcode & 0x0f) >> 8;
                for( let registerIdx = 0; registerIdx <= x; registeridx++)
                    this.register[registerIdx] = this.memory[this.i + registerIdx];
                break;
        } 
    }
}


export default CPU;