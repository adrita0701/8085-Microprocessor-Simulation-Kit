/**
 * TrainerKit8085 Controller
 * Emulates the physical 8085 Microprocessor Trainer Kit hardware interface:
 * 6-digit red 7-segment LED display (4 address + 2 data digits),
 * status LEDs, and authentic 28-key tactile keyboard matrix.
 * Includes Web Audio API retro acoustic click sound synthesis.
 */

class TrainerKit8085 {
    constructor(cpu, assembler, onStateChange) {
        this.cpu = cpu;
        this.assembler = assembler;
        this.onStateChange = onStateChange || (() => {});

        // Trainer Kit Operational Modes:
        // 'IDLE', 'ADDR_ENTRY', 'DATA_ENTRY', 'REG_EXAM', 'GO_ENTRY', 'RUNNING'
        this.mode = 'IDLE';

        // Display state
        this.currentAddress = 0x2000;
        this.currentRegIndex = 0; // 0: A, 1: B, 2: C, 3: D, 4: E, 5: H, 6: L, 7: M, 8: SP, 9: PC, 10: F
        this.regNames = ['A', 'B', 'C', 'D', 'E', 'H', 'L', 'M', 'SP', 'PC', 'F'];

        // Input buffer for hex keystrokes
        this.inputBuffer = "";

        // Audio synthesizer settings
        this.soundEnabled = true;
        this.audioCtx = null;

        // Auto-run timer
        this.runTimer = null;
    }

    /**
     * Initializes Web Audio Context for retro tactile key clicks
     */
    initAudio() {
        if (!this.audioCtx && typeof window !== 'undefined') {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                this.audioCtx = new AudioContext();
            }
        }
    }

    /**
     * Plays authentic retro tactile click/beep sound
     */
    playBeep(type = 'click') {
        if (!this.soundEnabled) return;
        try {
            this.initAudio();
            if (!this.audioCtx) return;
            if (this.audioCtx.state === 'suspended') {
                this.audioCtx.resume();
            }

            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            osc.connect(gain);
            gain.connect(this.audioCtx.destination);

            const now = this.audioCtx.currentTime;

            if (type === 'click') {
                // Short crisp tactile click
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(800, now);
                osc.frequency.exponentialRampToValueAtTime(120, now + 0.025);
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);
                osc.start(now);
                osc.stop(now + 0.025);
            } else if (type === 'success') {
                // Dual tone beep for execution completion
                osc.type = 'sine';
                osc.frequency.setValueAtTime(1200, now);
                gain.gain.setValueAtTime(0.15, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
                osc.start(now);
                osc.stop(now + 0.08);
            } else if (type === 'error') {
                // Low buzz for invalid action
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(150, now);
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
                osc.start(now);
                osc.stop(now + 0.12);
            }
        } catch (e) {
            // Audio policy or unsupported fallback
        }
    }

    /**
     * Handle physical/virtual button clicks on the trainer keypad
     */
    handleKey(key) {
        this.playBeep('click');

        switch (key) {
            // Function Keys
            case 'RESET':
                this.resetKit();
                break;

            case 'ADDR':
            case 'SUBST_MEM':
                this.mode = 'ADDR_ENTRY';
                this.inputBuffer = "";
                this.notify();
                break;

            case 'DATA':
                this.mode = 'DATA_ENTRY';
                this.inputBuffer = "";
                this.notify();
                break;

            case 'REG':
            case 'EXAM_REG':
                this.mode = 'REG_EXAM';
                this.inputBuffer = "";
                this.notify();
                break;

            case 'NEXT':
            case '+':
                this.handleNext();
                break;

            case 'PREV':
            case '-':
                this.handlePrev();
                break;

            case 'GO':
            case 'RUN':
                this.mode = 'GO_ENTRY';
                this.inputBuffer = "";
                this.notify();
                break;

            case 'STEP':
                this.handleStep();
                break;

            case 'EXEC':
                this.handleExec();
                break;

            case 'CLEAR':
                this.inputBuffer = "";
                this.notify();
                break;

            default:
                // Hex Keys (0-9, A-F)
                if (/^[0-9A-F]$/i.test(key)) {
                    this.handleHexDigit(key.toUpperCase());
                }
                break;
        }
    }

    /**
     * Handles entering a hex digit into the active mode buffer
     */
    handleHexDigit(digit) {
        if (this.mode === 'ADDR_ENTRY' || this.mode === 'GO_ENTRY') {
            // Up to 4 hex digits for 16-bit address
            if (this.inputBuffer.length < 4) {
                this.inputBuffer += digit;
                if (this.inputBuffer.length === 4) {
                    this.currentAddress = parseInt(this.inputBuffer, 16);
                }
            } else {
                // Reset buffer on overflow
                this.inputBuffer = digit;
            }
            this.notify();
        } else if (this.mode === 'DATA_ENTRY') {
            // Up to 2 hex digits for 8-bit memory byte
            if (this.inputBuffer.length < 2) {
                this.inputBuffer += digit;
                if (this.inputBuffer.length === 2) {
                    const byteVal = parseInt(this.inputBuffer, 16);
                    this.cpu.writeByte(this.currentAddress, byteVal);
                }
            } else {
                this.inputBuffer = digit;
            }
            this.notify();
        } else if (this.mode === 'REG_EXAM') {
            // 2 hex digits for 8-bit register modification (or 4 for 16-bit SP/PC)
            const reg = this.regNames[this.currentRegIndex];
            const maxLen = (reg === 'SP' || reg === 'PC') ? 4 : 2;
            if (this.inputBuffer.length < maxLen) {
                this.inputBuffer += digit;
                if (this.inputBuffer.length === maxLen) {
                    this.applyRegisterEdit();
                }
            } else {
                this.inputBuffer = digit;
            }
            this.notify();
        } else {
            // If in IDLE, pressing hex automatically starts ADDR entry
            this.mode = 'ADDR_ENTRY';
            this.inputBuffer = digit;
            this.notify();
        }
    }

    /**
     * Commits any pending input buffer in DATA mode and advances to NEXT location
     */
    handleNext() {
        if (this.mode === 'DATA_ENTRY') {
            if (this.inputBuffer.length > 0) {
                const byteVal = parseInt(this.inputBuffer, 16);
                this.cpu.writeByte(this.currentAddress, byteVal);
                this.inputBuffer = "";
            }
            this.currentAddress = (this.currentAddress + 1) & 0xFFFF;
            this.notify();
        } else if (this.mode === 'ADDR_ENTRY') {
            if (this.inputBuffer.length > 0) {
                this.currentAddress = parseInt(this.inputBuffer, 16);
                this.inputBuffer = "";
            }
            // Switch to DATA mode for this address
            this.mode = 'DATA_ENTRY';
            this.notify();
        } else if (this.mode === 'REG_EXAM') {
            this.applyRegisterEdit();
            this.inputBuffer = "";
            this.currentRegIndex = (this.currentRegIndex + 1) % this.regNames.length;
            this.notify();
        } else {
            // Default: advance current address
            this.currentAddress = (this.currentAddress + 1) & 0xFFFF;
            this.notify();
        }
    }

    /**
     * Moves to PREVIOUS memory location or register
     */
    handlePrev() {
        if (this.mode === 'DATA_ENTRY') {
            if (this.inputBuffer.length > 0) {
                const byteVal = parseInt(this.inputBuffer, 16);
                this.cpu.writeByte(this.currentAddress, byteVal);
                this.inputBuffer = "";
            }
            this.currentAddress = (this.currentAddress - 1 + 0x10000) & 0xFFFF;
            this.notify();
        } else if (this.mode === 'REG_EXAM') {
            this.applyRegisterEdit();
            this.inputBuffer = "";
            this.currentRegIndex = (this.currentRegIndex - 1 + this.regNames.length) % this.regNames.length;
            this.notify();
        } else {
            this.currentAddress = (this.currentAddress - 1 + 0x10000) & 0xFFFF;
            this.notify();
        }
    }

    /**
     * Executes Single Step on CPU
     */
    handleStep() {
        if (this.cpu.isHalted) {
            this.playBeep('error');
            this.notify({ message: "CPU is HALTED. Press RESET or change PC to continue." });
            return;
        }

        const stepResult = this.cpu.step();
        this.currentAddress = this.cpu.PC;
        this.mode = 'IDLE';
        this.inputBuffer = "";
        this.playBeep('click');
        this.notify({ stepResult });
    }

    /**
     * Executes Full Program Run starting from designated address
     */
    handleExec() {
        if (this.mode === 'GO_ENTRY') {
            if (this.inputBuffer.length > 0) {
                this.currentAddress = parseInt(this.inputBuffer, 16);
                this.cpu.PC = this.currentAddress;
            } else {
                this.cpu.PC = this.currentAddress;
            }
            this.inputBuffer = "";
        }

        this.cpu.isHalted = false;
        this.mode = 'RUNNING';
        this.notify({ running: true });

        // Run until HLT with safe asynchronous step animation or fast execution
        const maxSteps = 50000;
        let count = 0;
        const startTime = performance.now();

        while (!this.cpu.isHalted && count < maxSteps) {
            this.cpu.step();
            count++;
        }

        const elapsed = (performance.now() - startTime).toFixed(1);
        this.mode = 'IDLE';
        this.currentAddress = this.cpu.PC;

        if (this.cpu.isHalted) {
            this.playBeep('success');
            this.notify({
                message: `Program execution finished (HLT reached in ${count} instructions, ${this.cpu.cycles} cycles, ${elapsed} ms).`,
                runComplete: true
            });
        } else {
            this.playBeep('error');
            this.notify({
                message: `Execution paused: reached step limit (${maxSteps} steps). Program may contain infinite loop.`,
                runComplete: true,
                warning: true
            });
        }
    }

    /**
     * Resets the entire trainer kit to initial power-on state
     */
    resetKit(startAddress = 0x2000) {
        this.cpu.reset(startAddress);
        this.currentAddress = startAddress;
        this.mode = 'IDLE';
        this.inputBuffer = "";
        this.currentRegIndex = 0;
        this.playBeep('click');
        this.notify({ reset: true, message: "System Reset. Trainer kit initialized at 2000H." });
    }

    /**
     * Applies value in inputBuffer to currently examined register
     */
    applyRegisterEdit() {
        if (!this.inputBuffer) return;
        const reg = this.regNames[this.currentRegIndex];
        const val = parseInt(this.inputBuffer, 16);
        if (isNaN(val)) return;

        switch (reg) {
            case 'A': this.cpu.A = val & 0xFF; break;
            case 'B': this.cpu.B = val & 0xFF; break;
            case 'C': this.cpu.C = val & 0xFF; break;
            case 'D': this.cpu.D = val & 0xFF; break;
            case 'E': this.cpu.E = val & 0xFF; break;
            case 'H': this.cpu.H = val & 0xFF; break;
            case 'L': this.cpu.L = val & 0xFF; break;
            case 'M': this.cpu.setM(val & 0xFF); break;
            case 'SP': this.cpu.SP = val & 0xFFFF; break;
            case 'PC': this.cpu.PC = val & 0xFFFF; break;
            case 'F':
                this.cpu.flags.S = (val >> 7) & 1;
                this.cpu.flags.Z = (val >> 6) & 1;
                this.cpu.flags.AC = (val >> 4) & 1;
                this.cpu.flags.P = (val >> 2) & 1;
                this.cpu.flags.CY = val & 1;
                break;
        }
        this.inputBuffer = "";
    }

    /**
     * Generates 6-character 7-segment display content:
     * 4 characters for ADDRESS + 2 characters for DATA
     */
    getDisplayState() {
        let addrStr = "----";
        let dataStr = "--";
        let subModeLabel = this.mode;

        if (this.mode === 'IDLE') {
            if (this.cpu.isHalted) {
                addrStr = "EHLT"; // End / Halt
                dataStr = this.cpu.readByte(this.currentAddress).toString(16).toUpperCase().padStart(2, '0');
            } else {
                addrStr = this.currentAddress.toString(16).toUpperCase().padStart(4, '0');
                dataStr = this.cpu.readByte(this.currentAddress).toString(16).toUpperCase().padStart(2, '0');
            }
        } else if (this.mode === 'ADDR_ENTRY') {
            addrStr = this.inputBuffer.padEnd(4, '-');
            dataStr = "  ";
        } else if (this.mode === 'DATA_ENTRY') {
            addrStr = this.currentAddress.toString(16).toUpperCase().padStart(4, '0');
            if (this.inputBuffer.length > 0) {
                dataStr = this.inputBuffer.padEnd(2, '-');
            } else {
                dataStr = this.cpu.readByte(this.currentAddress).toString(16).toUpperCase().padStart(2, '0');
            }
        } else if (this.mode === 'REG_EXAM') {
            const reg = this.regNames[this.currentRegIndex];
            addrStr = `rE-${reg.padStart(2, ' ')}`;
            let regVal = 0;
            switch (reg) {
                case 'A': regVal = this.cpu.A; break;
                case 'B': regVal = this.cpu.B; break;
                case 'C': regVal = this.cpu.C; break;
                case 'D': regVal = this.cpu.D; break;
                case 'E': regVal = this.cpu.E; break;
                case 'H': regVal = this.cpu.H; break;
                case 'L': regVal = this.cpu.L; break;
                case 'M': regVal = this.cpu.getM(); break;
                case 'SP': regVal = this.cpu.SP; break;
                case 'PC': regVal = this.cpu.PC; break;
                case 'F':
                    regVal = (this.cpu.flags.S << 7) | (this.cpu.flags.Z << 6) | (this.cpu.flags.AC << 4) | (this.cpu.flags.P << 2) | this.cpu.flags.CY;
                    break;
            }
            if (this.inputBuffer.length > 0) {
                dataStr = this.inputBuffer.padEnd(2, '-');
            } else {
                dataStr = (reg === 'SP' || reg === 'PC')
                    ? regVal.toString(16).toUpperCase().padStart(4, '0').slice(-2)
                    : regVal.toString(16).toUpperCase().padStart(2, '0');
            }
        } else if (this.mode === 'GO_ENTRY') {
            addrStr = this.inputBuffer.length > 0 ? this.inputBuffer.padEnd(4, '-') : this.currentAddress.toString(16).toUpperCase().padStart(4, '0');
            dataStr = "GO";
        } else if (this.mode === 'RUNNING') {
            addrStr = "RUN-";
            dataStr = "..";
        }

        return {
            addressText: addrStr,
            dataText: dataStr,
            mode: this.mode,
            isHalted: this.cpu.isHalted
        };
    }

    /**
     * Notify parent UI of state updates
     */
    notify(extra = {}) {
        this.onStateChange(this.getDisplayState(), extra);
    }
}

// Export for browser or node
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TrainerKit8085;
}
