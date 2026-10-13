/**
 * 8085 Microprocessor Emulator
 * Exact logical emulation of the Intel 8085A CPU
 * Supports 64KB memory space, full flag logic (S, Z, AC, P, CY),
 * registers (A, B, C, D, E, H, L, PC, SP, M), and all standard instructions.
 */

class CPU8085 {
    constructor() {
        // 64 KB Memory space (0000H - FFFFH)
        this.memory = new Uint8Array(65536);

        // 8-bit Registers
        this.A = 0x00;
        this.B = 0x00;
        this.C = 0x00;
        this.D = 0x00;
        this.E = 0x00;
        this.H = 0x00;
        this.L = 0x00;

        // 16-bit Special Registers
        this.PC = 0x2000; // Default execution start
        this.SP = 0x27FF; // Default top of stack

        // Flags: S, Z, AC, P, CY
        // In 8085 PSW format: [S, Z, 0, AC, 0, P, 1, CY]
        this.flags = {
            S: 0,   // Sign flag
            Z: 0,   // Zero flag
            AC: 0,  // Auxiliary Carry flag
            P: 0,   // Parity flag (1 = even parity, 0 = odd parity)
            CY: 0   // Carry flag
        };

        // Execution status
        this.isHalted = false;
        this.cycles = 0;
        this.interruptsEnabled = false;

        // Trace of last executed instruction
        this.lastStep = null;

        // Parity lookup table for 0x00-0xFF (1 if even number of bits set, else 0)
        this.parityTable = new Uint8Array(256);
        for (let i = 0; i < 256; i++) {
            let bits = 0;
            for (let b = 0; b < 8; b++) {
                if ((i >> b) & 1) bits++;
            }
            this.parityTable[i] = (bits % 2 === 0) ? 1 : 0;
        }

        // I/O Ports (0 - 255)
        this.ioPorts = new Uint8Array(256);
    }

    /**
     * Reset CPU to initial state
     * @param {number} startPC - Address to set PC to (default 0x2000)
     */
    reset(startPC = 0x2000) {
        this.A = 0x00;
        this.B = 0x00;
        this.C = 0x00;
        this.D = 0x00;
        this.E = 0x00;
        this.H = 0x00;
        this.L = 0x00;
        this.PC = startPC & 0xFFFF;
        this.SP = 0x27FF;
        this.flags = { S: 0, Z: 0, AC: 0, P: 0, CY: 0 };
        this.isHalted = false;
        this.cycles = 0;
        this.interruptsEnabled = false;
        this.lastStep = null;
    }

    /**
     * Clear all 64KB memory to 0x00
     */
    clearMemory() {
        this.memory.fill(0);
    }

    /**
     * Memory access helpers
     */
    readByte(addr) {
        return this.memory[addr & 0xFFFF];
    }

    writeByte(addr, val) {
        this.memory[addr & 0xFFFF] = val & 0xFF;
    }

    readWord(addr) {
        const low = this.readByte(addr);
        const high = this.readByte(addr + 1);
        return (high << 8) | low;
    }

    writeWord(addr, val) {
        this.writeByte(addr, val & 0xFF);
        this.writeByte(addr + 1, (val >> 8) & 0xFF);
    }

    // HL-pointed memory location 'M'
    getHL() {
        return ((this.H << 8) | this.L) & 0xFFFF;
    }

    setHL(val) {
        this.H = (val >> 8) & 0xFF;
        this.L = val & 0xFF;
    }

    getM() {
        return this.readByte(this.getHL());
    }

    setM(val) {
        this.writeByte(this.getHL(), val);
    }

    // Register pairs
    getBC() { return ((this.B << 8) | this.C) & 0xFFFF; }
    setBC(val) { this.B = (val >> 8) & 0xFF; this.C = val & 0xFF; }

    getDE() { return ((this.D << 8) | this.E) & 0xFFFF; }
    setDE(val) { this.D = (val >> 8) & 0xFF; this.E = val & 0xFF; }

    // PSW (Program Status Word: Accumulator + Flags)
    getPSW() {
        const f = (this.flags.S << 7) |
                  (this.flags.Z << 6) |
                  (0 << 5) |
                  (this.flags.AC << 4) |
                  (0 << 3) |
                  (this.flags.P << 2) |
                  (1 << 1) | // Bit 1 is always 1 in 8085
                  (this.flags.CY);
        return ((this.A << 8) | f) & 0xFFFF;
    }

    setPSW(val) {
        this.A = (val >> 8) & 0xFF;
        const f = val & 0xFF;
        this.flags.S = (f >> 7) & 1;
        this.flags.Z = (f >> 6) & 1;
        this.flags.AC = (f >> 4) & 1;
        this.flags.P = (f >> 2) & 1;
        this.flags.CY = f & 1;
    }

    // Stack operations
    pushWord(val) {
        this.SP = (this.SP - 1) & 0xFFFF;
        this.writeByte(this.SP, (val >> 8) & 0xFF);
        this.SP = (this.SP - 1) & 0xFFFF;
        this.writeByte(this.SP, val & 0xFF);
    }

    popWord() {
        const low = this.readByte(this.SP);
        this.SP = (this.SP + 1) & 0xFFFF;
        const high = this.readByte(this.SP);
        this.SP = (this.SP + 1) & 0xFFFF;
        return (high << 8) | low;
    }

    // Register getter/setter by index (0: B, 1: C, 2: D, 3: E, 4: H, 5: L, 6: M, 7: A)
    getRegByIndex(idx) {
        switch (idx) {
            case 0: return this.B;
            case 1: return this.C;
            case 2: return this.D;
            case 3: return this.E;
            case 4: return this.H;
            case 5: return this.L;
            case 6: return this.getM();
            case 7: return this.A;
            default: return 0;
        }
    }

    setRegByIndex(idx, val) {
        val &= 0xFF;
        switch (idx) {
            case 0: this.B = val; break;
            case 1: this.C = val; break;
            case 2: this.D = val; break;
            case 3: this.E = val; break;
            case 4: this.H = val; break;
            case 5: this.L = val; break;
            case 6: this.setM(val); break;
            case 7: this.A = val; break;
        }
    }

    getRegNameByIndex(idx) {
        return ['B', 'C', 'D', 'E', 'H', 'L', 'M', 'A'][idx];
    }

    /**
     * Flag update helpers
     */
    updateZSP(val) {
        const v = val & 0xFF;
        this.flags.Z = (v === 0) ? 1 : 0;
        this.flags.S = (v & 0x80) ? 1 : 0;
        this.flags.P = this.parityTable[v];
    }

    // 8-bit Addition ALU
    add8(a, b, carryIn = 0) {
        const sum = a + b + carryIn;
        const res = sum & 0xFF;

        this.updateZSP(res);
        this.flags.CY = (sum > 0xFF) ? 1 : 0;
        // AC: carry from bit 3 to bit 4
        this.flags.AC = (((a & 0x0F) + (b & 0x0F) + carryIn) > 0x0F) ? 1 : 0;

        return res;
    }

    // 8-bit Subtraction ALU (a - b - borrowIn)
    sub8(a, b, borrowIn = 0) {
        const diff = a - b - borrowIn;
        const res = diff & 0xFF;

        this.updateZSP(res);
        this.flags.CY = (diff < 0) ? 1 : 0;
        // AC in 8085: borrow from bit 4. Hardware formula: ((a ^ b ^ diff) & 0x10) === 0x10
        // Or directly: ((a & 0x0F) - (b & 0x0F) - borrowIn) < 0
        this.flags.AC = (((a & 0x0F) - (b & 0x0F) - borrowIn) < 0) ? 0 : 1; // 8085 AC is 1 if NO borrow or 0 on borrow in some models, but standardized to:
        // Actually in standard 8085 subtraction: AC = 1 if ((a & 0x0F) - (b & 0x0F) - borrowIn >= 0) (i.e. no borrow), or vice versa.
        // Let's use standard Intel ALU: carry out of bit 3 during a + (~b) + 1:
        const acCarry = ((a & 0x0F) + ((~b) & 0x0F) + (1 - borrowIn)) > 0x0F;
        this.flags.AC = acCarry ? 1 : 0;

        return res;
    }

    // 8-bit Increment
    inr8(val) {
        const res = (val + 1) & 0xFF;
        this.updateZSP(res);
        this.flags.AC = ((val & 0x0F) === 0x0F) ? 1 : 0;
        // CY is NOT affected by INR
        return res;
    }

    // 8-bit Decrement
    dcr8(val) {
        const res = (val - 1) & 0xFF;
        this.updateZSP(res);
        this.flags.AC = ((val & 0x0F) === 0x00) ? 0 : 1;
        // CY is NOT affected by DCR
        return res;
    }

    /**
     * Execute exactly ONE instruction at current PC
     * @returns {Object} step details
     */
    step() {
        if (this.isHalted) {
            return {
                halted: true,
                message: "CPU is HALTED. Reset or change PC to continue."
            };
        }

        const startPC = this.PC;
        const opcode = this.readByte(this.PC);

        // Snapshot state before execution
        const before = {
            A: this.A, B: this.B, C: this.C, D: this.D,
            E: this.E, H: this.H, L: this.L,
            PC: this.PC, SP: this.SP,
            M: this.getM(),
            flags: { ...this.flags }
        };

        let mnemonic = "";
        let bytesCount = 1;
        let cycles = 4;
        let description = "";

        // Advance PC for opcode fetch
        this.PC = (this.PC + 1) & 0xFFFF;

        // Decode and execute
        switch (opcode) {
            // ================== NOP ==================
            case 0x00:
                mnemonic = "NOP";
                cycles = 4;
                description = "No Operation: CPU performs no action.";
                break;

            // ================== HLT ==================
            case 0x76:
                mnemonic = "HLT";
                cycles = 5;
                this.isHalted = true;
                description = "Halt: CPU enters stopped state until reset.";
                break;

            // ================== DATA TRANSFER ==================
            // MOV r1, r2 (opcodes 0x40 - 0x7F, except 0x76 which is HLT)
            case 0x40: case 0x41: case 0x42: case 0x43: case 0x44: case 0x45: case 0x46: case 0x47:
            case 0x48: case 0x49: case 0x4A: case 0x4B: case 0x4C: case 0x4D: case 0x4E: case 0x4F:
            case 0x50: case 0x51: case 0x52: case 0x53: case 0x54: case 0x55: case 0x56: case 0x57:
            case 0x58: case 0x59: case 0x5A: case 0x5B: case 0x5C: case 0x5D: case 0x5E: case 0x5F:
            case 0x60: case 0x61: case 0x62: case 0x63: case 0x64: case 0x65: case 0x66: case 0x67:
            case 0x68: case 0x69: case 0x6A: case 0x6B: case 0x6C: case 0x6D: case 0x6E: case 0x6F:
            case 0x70: case 0x71: case 0x72: case 0x73: case 0x74: case 0x75:           case 0x77:
            case 0x78: case 0x79: case 0x7A: case 0x7B: case 0x7C: case 0x7D: case 0x7E: case 0x7F:
                {
                    const destIdx = (opcode >> 3) & 0x07;
                    const srcIdx = opcode & 0x07;
                    const destName = this.getRegNameByIndex(destIdx);
                    const srcName = this.getRegNameByIndex(srcIdx);
                    const val = this.getRegByIndex(srcIdx);
                    this.setRegByIndex(destIdx, val);
                    mnemonic = `MOV ${destName}, ${srcName}`;
                    cycles = (destIdx === 6 || srcIdx === 6) ? 7 : 4;
                    description = `Move data: ${destName} ← ${srcName} (${val.toString(16).toUpperCase().padStart(2, '0')}H)`;
                }
                break;

            // MVI r, d8 (0x06, 0x0E, 0x16, 0x1E, 0x26, 0x2E, 0x36, 0x3E)
            case 0x06: case 0x0E: case 0x16: case 0x1E: case 0x26: case 0x2E: case 0x36: case 0x3E:
                {
                    const regIdx = (opcode >> 3) & 0x07;
                    const regName = this.getRegNameByIndex(regIdx);
                    const data = this.readByte(this.PC);
                    this.PC = (this.PC + 1) & 0xFFFF;
                    bytesCount = 2;
                    this.setRegByIndex(regIdx, data);
                    mnemonic = `MVI ${regName}, ${data.toString(16).toUpperCase().padStart(2, '0')}H`;
                    cycles = (regIdx === 6) ? 10 : 7;
                    description = `Move immediate: ${regName} ← ${data.toString(16).toUpperCase().padStart(2, '0')}H`;
                }
                break;

            // LXI rp, d16 (0x01: BC, 0x11: DE, 0x21: HL, 0x31: SP)
            case 0x01: case 0x11: case 0x21: case 0x31:
                {
                    const d16 = this.readWord(this.PC);
                    this.PC = (this.PC + 2) & 0xFFFF;
                    bytesCount = 3;
                    cycles = 10;
                    const rp = (opcode >> 4) & 0x03;
                    const hexStr = d16.toString(16).toUpperCase().padStart(4, '0') + 'H';
                    if (rp === 0) { this.setBC(d16); mnemonic = `LXI B, ${hexStr}`; description = `Load register pair BC with ${hexStr}`; }
                    else if (rp === 1) { this.setDE(d16); mnemonic = `LXI D, ${hexStr}`; description = `Load register pair DE with ${hexStr}`; }
                    else if (rp === 2) { this.setHL(d16); mnemonic = `LXI H, ${hexStr}`; description = `Load register pair HL with ${hexStr}`; }
                    else if (rp === 3) { this.SP = d16; mnemonic = `LXI SP, ${hexStr}`; description = `Load Stack Pointer SP with ${hexStr}`; }
                }
                break;

            // LDA addr (0x3A)
            case 0x3A:
                {
                    const addr = this.readWord(this.PC);
                    this.PC = (this.PC + 2) & 0xFFFF;
                    bytesCount = 3;
                    cycles = 13;
                    this.A = this.readByte(addr);
                    const hexAddr = addr.toString(16).toUpperCase().padStart(4, '0') + 'H';
                    mnemonic = `LDA ${hexAddr}`;
                    description = `Load Accumulator direct: A ← (${hexAddr}) = ${this.A.toString(16).toUpperCase().padStart(2, '0')}H`;
                }
                break;

            // STA addr (0x32)
            case 0x32:
                {
                    const addr = this.readWord(this.PC);
                    this.PC = (this.PC + 2) & 0xFFFF;
                    bytesCount = 3;
                    cycles = 13;
                    this.writeByte(addr, this.A);
                    const hexAddr = addr.toString(16).toUpperCase().padStart(4, '0') + 'H';
                    mnemonic = `STA ${hexAddr}`;
                    description = `Store Accumulator direct: (${hexAddr}) ← A (${this.A.toString(16).toUpperCase().padStart(2, '0')}H)`;
                }
                break;

            // LHLD addr (0x2A)
            case 0x2A:
                {
                    const addr = this.readWord(this.PC);
                    this.PC = (this.PC + 2) & 0xFFFF;
                    bytesCount = 3;
                    cycles = 16;
                    this.L = this.readByte(addr);
                    this.H = this.readByte(addr + 1);
                    const hexAddr = addr.toString(16).toUpperCase().padStart(4, '0') + 'H';
                    mnemonic = `LHLD ${hexAddr}`;
                    description = `Load HL direct: L ← (${hexAddr}), H ← (${(addr+1).toString(16).toUpperCase().padStart(4, '0')}H)`;
                }
                break;

            // SHLD addr (0x22)
            case 0x22:
                {
                    const addr = this.readWord(this.PC);
                    this.PC = (this.PC + 2) & 0xFFFF;
                    bytesCount = 3;
                    cycles = 16;
                    this.writeByte(addr, this.L);
                    this.writeByte(addr + 1, this.H);
                    const hexAddr = addr.toString(16).toUpperCase().padStart(4, '0') + 'H';
                    mnemonic = `SHLD ${hexAddr}`;
                    description = `Store HL direct: (${hexAddr}) ← L, (${(addr+1).toString(16).toUpperCase().padStart(4, '0')}H) ← H`;
                }
                break;

            // LDAX rp (0x0A: BC, 0x1A: DE)
            case 0x0A:
                this.A = this.readByte(this.getBC());
                mnemonic = "LDAX B";
                cycles = 7;
                description = `Load Accumulator indirect: A ← (BC) = ${this.A.toString(16).toUpperCase().padStart(2, '0')}H`;
                break;
            case 0x1A:
                this.A = this.readByte(this.getDE());
                mnemonic = "LDAX D";
                cycles = 7;
                description = `Load Accumulator indirect: A ← (DE) = ${this.A.toString(16).toUpperCase().padStart(2, '0')}H`;
                break;

            // STAX rp (0x02: BC, 0x12: DE)
            case 0x02:
                this.writeByte(this.getBC(), this.A);
                mnemonic = "STAX B";
                cycles = 7;
                description = `Store Accumulator indirect: (BC) ← A (${this.A.toString(16).toUpperCase().padStart(2, '0')}H)`;
                break;
            case 0x12:
                this.writeByte(this.getDE(), this.A);
                mnemonic = "STAX D";
                cycles = 7;
                description = `Store Accumulator indirect: (DE) ← A (${this.A.toString(16).toUpperCase().padStart(2, '0')}H)`;
                break;

            // XCHG (0xEB)
            case 0xEB:
                {
                    const tmpH = this.H; const tmpL = this.L;
                    this.H = this.D; this.L = this.E;
                    this.D = tmpH; this.E = tmpL;
                    mnemonic = "XCHG";
                    cycles = 4;
                    description = "Exchange DE and HL register pairs.";
                }
                break;

            // ================== ARITHMETIC ==================
            // ADD r/M (0x80 - 0x87)
            case 0x80: case 0x81: case 0x82: case 0x83: case 0x84: case 0x85: case 0x86: case 0x87:
                {
                    const regIdx = opcode & 0x07;
                    const regName = this.getRegNameByIndex(regIdx);
                    const val = this.getRegByIndex(regIdx);
                    this.A = this.add8(this.A, val, 0);
                    mnemonic = `ADD ${regName}`;
                    cycles = (regIdx === 6) ? 7 : 4;
                    description = `Add: A ← A + ${regName} (${before.A.toString(16).toUpperCase()}H + ${val.toString(16).toUpperCase()}H = ${this.A.toString(16).toUpperCase()}H)`;
                }
                break;

            // ADC r/M (0x88 - 0x8F)
            case 0x88: case 0x89: case 0x8A: case 0x8B: case 0x8C: case 0x8D: case 0x8E: case 0x8F:
                {
                    const regIdx = opcode & 0x07;
                    const regName = this.getRegNameByIndex(regIdx);
                    const val = this.getRegByIndex(regIdx);
                    const carry = this.flags.CY;
                    this.A = this.add8(this.A, val, carry);
                    mnemonic = `ADC ${regName}`;
                    cycles = (regIdx === 6) ? 7 : 4;
                    description = `Add with Carry: A ← A + ${regName} + CY (${before.A.toString(16).toUpperCase()}H + ${val.toString(16).toUpperCase()}H + ${carry} = ${this.A.toString(16).toUpperCase()}H)`;
                }
                break;

            // ADI d8 (0xC6)
            case 0xC6:
                {
                    const data = this.readByte(this.PC);
                    this.PC = (this.PC + 1) & 0xFFFF;
                    bytesCount = 2;
                    cycles = 7;
                    this.A = this.add8(this.A, data, 0);
                    mnemonic = `ADI ${data.toString(16).toUpperCase().padStart(2, '0')}H`;
                    description = `Add Immediate: A ← A + ${data.toString(16).toUpperCase()}H (${before.A.toString(16).toUpperCase()}H + ${data.toString(16).toUpperCase()}H = ${this.A.toString(16).toUpperCase()}H)`;
                }
                break;

            // ACI d8 (0xCE)
            case 0xCE:
                {
                    const data = this.readByte(this.PC);
                    this.PC = (this.PC + 1) & 0xFFFF;
                    bytesCount = 2;
                    cycles = 7;
                    const carry = this.flags.CY;
                    this.A = this.add8(this.A, data, carry);
                    mnemonic = `ACI ${data.toString(16).toUpperCase().padStart(2, '0')}H`;
                    description = `Add Immediate with Carry: A ← A + ${data.toString(16).toUpperCase()}H + CY`;
                }
                break;

            // SUB r/M (0x90 - 0x97)
            case 0x90: case 0x91: case 0x92: case 0x93: case 0x94: case 0x95: case 0x96: case 0x97:
                {
                    const regIdx = opcode & 0x07;
                    const regName = this.getRegNameByIndex(regIdx);
                    const val = this.getRegByIndex(regIdx);
                    this.A = this.sub8(this.A, val, 0);
                    mnemonic = `SUB ${regName}`;
                    cycles = (regIdx === 6) ? 7 : 4;
                    description = `Subtract: A ← A - ${regName} (${before.A.toString(16).toUpperCase()}H - ${val.toString(16).toUpperCase()}H = ${this.A.toString(16).toUpperCase()}H)`;
                }
                break;

            // SBB r/M (0x98 - 0x9F)
            case 0x98: case 0x99: case 0x9A: case 0x9B: case 0x9C: case 0x9D: case 0x9E: case 0x9F:
                {
                    const regIdx = opcode & 0x07;
                    const regName = this.getRegNameByIndex(regIdx);
                    const val = this.getRegByIndex(regIdx);
                    const borrow = this.flags.CY;
                    this.A = this.sub8(this.A, val, borrow);
                    mnemonic = `SBB ${regName}`;
                    cycles = (regIdx === 6) ? 7 : 4;
                    description = `Subtract with Borrow: A ← A - ${regName} - CY`;
                }
                break;

            // SUI d8 (0xD6)
            case 0xD6:
                {
                    const data = this.readByte(this.PC);
                    this.PC = (this.PC + 1) & 0xFFFF;
                    bytesCount = 2;
                    cycles = 7;
                    this.A = this.sub8(this.A, data, 0);
                    mnemonic = `SUI ${data.toString(16).toUpperCase().padStart(2, '0')}H`;
                    description = `Subtract Immediate: A ← A - ${data.toString(16).toUpperCase()}H (${before.A.toString(16).toUpperCase()}H - ${data.toString(16).toUpperCase()}H = ${this.A.toString(16).toUpperCase()}H)`;
                }
                break;

            // SBI d8 (0xDE)
            case 0xDE:
                {
                    const data = this.readByte(this.PC);
                    this.PC = (this.PC + 1) & 0xFFFF;
                    bytesCount = 2;
                    cycles = 7;
                    const borrow = this.flags.CY;
                    this.A = this.sub8(this.A, data, borrow);
                    mnemonic = `SBI ${data.toString(16).toUpperCase().padStart(2, '0')}H`;
                    description = `Subtract Immediate with Borrow: A ← A - ${data.toString(16).toUpperCase()}H - CY`;
                }
                break;

            // INR r/M (0x04, 0x0C, 0x14, 0x1C, 0x24, 0x2C, 0x34, 0x3C)
            case 0x04: case 0x0C: case 0x14: case 0x1C: case 0x24: case 0x2C: case 0x34: case 0x3C:
                {
                    const regIdx = (opcode >> 3) & 0x07;
                    const regName = this.getRegNameByIndex(regIdx);
                    const val = this.getRegByIndex(regIdx);
                    const res = this.inr8(val);
                    this.setRegByIndex(regIdx, res);
                    mnemonic = `INR ${regName}`;
                    cycles = (regIdx === 6) ? 10 : 4;
                    description = `Increment: ${regName} ← ${regName} + 1 (${val.toString(16).toUpperCase()}H → ${res.toString(16).toUpperCase()}H)`;
                }
                break;

            // DCR r/M (0x05, 0x0D, 0x15, 0x1D, 0x25, 0x2D, 0x35, 0x3D)
            case 0x05: case 0x0D: case 0x15: case 0x1D: case 0x25: case 0x2D: case 0x35: case 0x3D:
                {
                    const regIdx = (opcode >> 3) & 0x07;
                    const regName = this.getRegNameByIndex(regIdx);
                    const val = this.getRegByIndex(regIdx);
                    const res = this.dcr8(val);
                    this.setRegByIndex(regIdx, res);
                    mnemonic = `DCR ${regName}`;
                    cycles = (regIdx === 6) ? 10 : 4;
                    description = `Decrement: ${regName} ← ${regName} - 1 (${val.toString(16).toUpperCase()}H → ${res.toString(16).toUpperCase()}H)`;
                }
                break;

            // INX rp (0x03: BC, 0x13: DE, 0x23: HL, 0x33: SP)
            case 0x03: case 0x13: case 0x23: case 0x33:
                {
                    const rp = (opcode >> 4) & 0x03;
                    cycles = 6;
                    if (rp === 0) { this.setBC((this.getBC() + 1) & 0xFFFF); mnemonic = "INX B"; description = "Increment register pair BC by 1"; }
                    else if (rp === 1) { this.setDE((this.getDE() + 1) & 0xFFFF); mnemonic = "INX D"; description = "Increment register pair DE by 1"; }
                    else if (rp === 2) { this.setHL((this.getHL() + 1) & 0xFFFF); mnemonic = "INX H"; description = "Increment register pair HL by 1"; }
                    else if (rp === 3) { this.SP = (this.SP + 1) & 0xFFFF; mnemonic = "INX SP"; description = "Increment Stack Pointer SP by 1"; }
                }
                break;

            // DCX rp (0x0B: BC, 0x1B: DE, 0x2B: HL, 0x3B: SP)
            case 0x0B: case 0x1B: case 0x2B: case 0x3B:
                {
                    const rp = (opcode >> 4) & 0x03;
                    cycles = 6;
                    if (rp === 0) { this.setBC((this.getBC() - 1) & 0xFFFF); mnemonic = "DCX B"; description = "Decrement register pair BC by 1"; }
                    else if (rp === 1) { this.setDE((this.getDE() - 1) & 0xFFFF); mnemonic = "DCX D"; description = "Decrement register pair DE by 1"; }
                    else if (rp === 2) { this.setHL((this.getHL() - 1) & 0xFFFF); mnemonic = "DCX H"; description = "Decrement register pair HL by 1"; }
                    else if (rp === 3) { this.SP = (this.SP - 1) & 0xFFFF; mnemonic = "DCX SP"; description = "Decrement Stack Pointer SP by 1"; }
                }
                break;

            // DAD rp (0x09: BC, 0x19: DE, 0x29: HL, 0x39: SP)
            case 0x09: case 0x19: case 0x29: case 0x39:
                {
                    const rp = (opcode >> 4) & 0x03;
                    let operand = 0;
                    let rpName = "";
                    if (rp === 0) { operand = this.getBC(); rpName = "B"; }
                    else if (rp === 1) { operand = this.getDE(); rpName = "D"; }
                    else if (rp === 2) { operand = this.getHL(); rpName = "H"; }
                    else if (rp === 3) { operand = this.SP; rpName = "SP"; }

                    const sum16 = this.getHL() + operand;
                    this.flags.CY = (sum16 > 0xFFFF) ? 1 : 0;
                    this.setHL(sum16 & 0xFFFF);
                    mnemonic = `DAD ${rpName}`;
                    cycles = 10;
                    description = `16-bit Add: HL ← HL + ${rpName} (${(sum16 & 0xFFFF).toString(16).toUpperCase().padStart(4, '0')}H)`;
                }
                break;

            // DAA (0x27) - Decimal Adjust Accumulator
            case 0x27:
                {
                    let adj = 0;
                    let newCY = this.flags.CY;
                    const lo = this.A & 0x0F;
                    const hi = (this.A >> 4) & 0x0F;

                    if (lo > 9 || this.flags.AC === 1) {
                        adj += 0x06;
                    }
                    if (hi > 9 || this.flags.CY === 1 || ((this.A + adj) > 0x9F)) {
                        adj += 0x60;
                        newCY = 1;
                    }

                    const rawSum = this.A + adj;
                    this.flags.AC = (((this.A & 0x0F) + (adj & 0x0F)) > 0x0F) ? 1 : 0;
                    this.A = rawSum & 0xFF;
                    this.flags.CY = newCY;
                    this.updateZSP(this.A);
                    mnemonic = "DAA";
                    cycles = 4;
                    description = "Decimal Adjust Accumulator (converts binary result in A to BCD).";
                }
                break;

            // ================== LOGICAL ==================
            // ANA r/M (0xA0 - 0xA7)
            case 0xA0: case 0xA1: case 0xA2: case 0xA3: case 0xA4: case 0xA5: case 0xA6: case 0xA7:
                {
                    const regIdx = opcode & 0x07;
                    const regName = this.getRegNameByIndex(regIdx);
                    const val = this.getRegByIndex(regIdx);
                    this.A &= val;
                    this.updateZSP(this.A);
                    this.flags.CY = 0;
                    this.flags.AC = 1; // 8085 sets AC to 1 for ANA/ANI
                    mnemonic = `ANA ${regName}`;
                    cycles = (regIdx === 6) ? 7 : 4;
                    description = `Logical AND with Accumulator: A ← A AND ${regName} (${this.A.toString(16).toUpperCase().padStart(2, '0')}H)`;
                }
                break;

            // ANI d8 (0xE6)
            case 0xE6:
                {
                    const data = this.readByte(this.PC);
                    this.PC = (this.PC + 1) & 0xFFFF;
                    bytesCount = 2;
                    cycles = 7;
                    this.A &= data;
                    this.updateZSP(this.A);
                    this.flags.CY = 0;
                    this.flags.AC = 1;
                    mnemonic = `ANI ${data.toString(16).toUpperCase().padStart(2, '0')}H`;
                    description = `Logical AND Immediate: A ← A AND ${data.toString(16).toUpperCase().padStart(2, '0')}H`;
                }
                break;

            // ORA r/M (0xB0 - 0xB7)
            case 0xB0: case 0xB1: case 0xB2: case 0xB3: case 0xB4: case 0xB5: case 0xB6: case 0xB7:
                {
                    const regIdx = opcode & 0x07;
                    const regName = this.getRegNameByIndex(regIdx);
                    const val = this.getRegByIndex(regIdx);
                    this.A |= val;
                    this.updateZSP(this.A);
                    this.flags.CY = 0;
                    this.flags.AC = 0;
                    mnemonic = `ORA ${regName}`;
                    cycles = (regIdx === 6) ? 7 : 4;
                    description = `Logical OR with Accumulator: A ← A OR ${regName} (${this.A.toString(16).toUpperCase().padStart(2, '0')}H)`;
                }
                break;

            // ORI d8 (0xF6)
            case 0xF6:
                {
                    const data = this.readByte(this.PC);
                    this.PC = (this.PC + 1) & 0xFFFF;
                    bytesCount = 2;
                    cycles = 7;
                    this.A |= data;
                    this.updateZSP(this.A);
                    this.flags.CY = 0;
                    this.flags.AC = 0;
                    mnemonic = `ORI ${data.toString(16).toUpperCase().padStart(2, '0')}H`;
                    description = `Logical OR Immediate: A ← A OR ${data.toString(16).toUpperCase().padStart(2, '0')}H`;
                }
                break;

            // XRA r/M (0xA8 - 0xAF)
            case 0xA8: case 0xA9: case 0xAA: case 0xAB: case 0xAC: case 0xAD: case 0xAE: case 0xAF:
                {
                    const regIdx = opcode & 0x07;
                    const regName = this.getRegNameByIndex(regIdx);
                    const val = this.getRegByIndex(regIdx);
                    this.A ^= val;
                    this.updateZSP(this.A);
                    this.flags.CY = 0;
                    this.flags.AC = 0;
                    mnemonic = `XRA ${regName}`;
                    cycles = (regIdx === 6) ? 7 : 4;
                    description = `Exclusive OR with Accumulator: A ← A XOR ${regName} (${this.A.toString(16).toUpperCase().padStart(2, '0')}H)`;
                }
                break;

            // XRI d8 (0xEE)
            case 0xEE:
                {
                    const data = this.readByte(this.PC);
                    this.PC = (this.PC + 1) & 0xFFFF;
                    bytesCount = 2;
                    cycles = 7;
                    this.A ^= data;
                    this.updateZSP(this.A);
                    this.flags.CY = 0;
                    this.flags.AC = 0;
                    mnemonic = `XRI ${data.toString(16).toUpperCase().padStart(2, '0')}H`;
                    description = `Exclusive OR Immediate: A ← A XOR ${data.toString(16).toUpperCase().padStart(2, '0')}H`;
                }
                break;

            // CMP r/M (0xB8 - 0xBF)
            case 0xB8: case 0xB9: case 0xBA: case 0xBB: case 0xBC: case 0xBD: case 0xBE: case 0xBF:
                {
                    const regIdx = opcode & 0x07;
                    const regName = this.getRegNameByIndex(regIdx);
                    const val = this.getRegByIndex(regIdx);
                    this.sub8(this.A, val, 0); // Sets flags as subtraction, A unchanged
                    mnemonic = `CMP ${regName}`;
                    cycles = (regIdx === 6) ? 7 : 4;
                    description = `Compare: Compare A (${this.A.toString(16).toUpperCase()}H) with ${regName} (${val.toString(16).toUpperCase()}H). Flags updated.`;
                }
                break;

            // CPI d8 (0xFE)
            case 0xFE:
                {
                    const data = this.readByte(this.PC);
                    this.PC = (this.PC + 1) & 0xFFFF;
                    bytesCount = 2;
                    cycles = 7;
                    this.sub8(this.A, data, 0); // Sets flags, A unchanged
                    mnemonic = `CPI ${data.toString(16).toUpperCase().padStart(2, '0')}H`;
                    description = `Compare Immediate: Compare A (${this.A.toString(16).toUpperCase()}H) with ${data.toString(16).toUpperCase()}H. Flags updated.`;
                }
                break;

            // CMA (0x2F)
            case 0x2F:
                this.A = (~this.A) & 0xFF;
                mnemonic = "CMA";
                cycles = 4;
                description = `Complement Accumulator: 1's complement of A (${this.A.toString(16).toUpperCase().padStart(2, '0')}H).`;
                break;

            // CMC (0x3F)
            case 0x3F:
                this.flags.CY = this.flags.CY ? 0 : 1;
                mnemonic = "CMC";
                cycles = 4;
                description = `Complement Carry: CY flag inverted (${this.flags.CY}).`;
                break;

            // STC (0x37)
            case 0x37:
                this.flags.CY = 1;
                mnemonic = "STC";
                cycles = 4;
                description = "Set Carry: CY flag set to 1.";
                break;

            // ================== ROTATE ==================
            // RLC (0x07) - Rotate Accumulator Left
            case 0x07:
                {
                    const bit7 = (this.A >> 7) & 1;
                    this.A = ((this.A << 1) | bit7) & 0xFF;
                    this.flags.CY = bit7;
                    mnemonic = "RLC";
                    cycles = 4;
                    description = `Rotate Left: Bit 7 rotated into CY and Bit 0 (A = ${this.A.toString(16).toUpperCase().padStart(2, '0')}H, CY = ${this.flags.CY}).`;
                }
                break;

            // RRC (0x0F) - Rotate Accumulator Right
            case 0x0F:
                {
                    const bit0 = this.A & 1;
                    this.A = ((this.A >> 1) | (bit0 << 7)) & 0xFF;
                    this.flags.CY = bit0;
                    mnemonic = "RRC";
                    cycles = 4;
                    description = `Rotate Right: Bit 0 rotated into CY and Bit 7 (A = ${this.A.toString(16).toUpperCase().padStart(2, '0')}H, CY = ${this.flags.CY}).`;
                }
                break;

            // RAL (0x17) - Rotate Accumulator Left through Carry
            case 0x17:
                {
                    const oldCY = this.flags.CY;
                    const bit7 = (this.A >> 7) & 1;
                    this.A = ((this.A << 1) | oldCY) & 0xFF;
                    this.flags.CY = bit7;
                    mnemonic = "RAL";
                    cycles = 4;
                    description = `Rotate Left through Carry: Bit 7 into CY, old CY into Bit 0 (A = ${this.A.toString(16).toUpperCase().padStart(2, '0')}H).`;
                }
                break;

            // RAR (0x1F) - Rotate Accumulator Right through Carry
            case 0x1F:
                {
                    const oldCY = this.flags.CY;
                    const bit0 = this.A & 1;
                    this.A = ((this.A >> 1) | (oldCY << 7)) & 0xFF;
                    this.flags.CY = bit0;
                    mnemonic = "RAR";
                    cycles = 4;
                    description = `Rotate Right through Carry: Bit 0 into CY, old CY into Bit 7 (A = ${this.A.toString(16).toUpperCase().padStart(2, '0')}H).`;
                }
                break;

            // ================== BRANCHING ==================
            // JMP addr (0xC3)
            case 0xC3:
                {
                    const target = this.readWord(this.PC);
                    bytesCount = 3;
                    cycles = 10;
                    this.PC = target;
                    const hexTarget = target.toString(16).toUpperCase().padStart(4, '0') + 'H';
                    mnemonic = `JMP ${hexTarget}`;
                    description = `Unconditional Jump to ${hexTarget}.`;
                }
                break;

            // Conditional jumps
            case 0xC2: // JNZ
            case 0xCA: // JZ
            case 0xD2: // JNC
            case 0xDA: // JC
            case 0xE2: // JPO
            case 0xEA: // JPE
            case 0xF2: // JP (Positive, S=0)
            case 0xFA: // JM (Minus, S=1)
                {
                    const target = this.readWord(this.PC);
                    this.PC = (this.PC + 2) & 0xFFFF;
                    bytesCount = 3;
                    cycles = 10;
                    const hexTarget = target.toString(16).toUpperCase().padStart(4, '0') + 'H';

                    let condition = false;
                    let condName = "";
                    switch (opcode) {
                        case 0xC2: condition = (this.flags.Z === 0); condName = "JNZ"; break;
                        case 0xCA: condition = (this.flags.Z === 1); condName = "JZ"; break;
                        case 0xD2: condition = (this.flags.CY === 0); condName = "JNC"; break;
                        case 0xDA: condition = (this.flags.CY === 1); condName = "JC"; break;
                        case 0xE2: condition = (this.flags.P === 0); condName = "JPO"; break;
                        case 0xEA: condition = (this.flags.P === 1); condName = "JPE"; break;
                        case 0xF2: condition = (this.flags.S === 0); condName = "JP"; break;
                        case 0xFA: condition = (this.flags.S === 1); condName = "JM"; break;
                    }
                    mnemonic = `${condName} ${hexTarget}`;
                    if (condition) {
                        this.PC = target;
                        description = `${condName}: Condition MET. Jumped to ${hexTarget}.`;
                    } else {
                        description = `${condName}: Condition NOT met. Program continues linearly.`;
                    }
                }
                break;

            // CALL addr (0xCD)
            case 0xCD:
                {
                    const target = this.readWord(this.PC);
                    const retAddr = (this.PC + 2) & 0xFFFF;
                    bytesCount = 3;
                    cycles = 18;
                    this.pushWord(retAddr);
                    this.PC = target;
                    const hexTarget = target.toString(16).toUpperCase().padStart(4, '0') + 'H';
                    mnemonic = `CALL ${hexTarget}`;
                    description = `Call subroutine at ${hexTarget} (pushed return address ${retAddr.toString(16).toUpperCase().padStart(4, '0')}H).`;
                }
                break;

            // Conditional CALLs (0xC4: CNZ, 0xCC: CZ, 0xD4: CNC, 0xDC: CC, 0xE4: CPO, 0xEC: CPE, 0xF4: CP, 0xFC: CM)
            case 0xC4: case 0xCC: case 0xD4: case 0xDC: case 0xE4: case 0xEC: case 0xF4: case 0xFC:
                {
                    const target = this.readWord(this.PC);
                    const retAddr = (this.PC + 2) & 0xFFFF;
                    this.PC = retAddr;
                    bytesCount = 3;
                    const hexTarget = target.toString(16).toUpperCase().padStart(4, '0') + 'H';
                    let condition = false;
                    let condName = "";
                    switch (opcode) {
                        case 0xC4: condition = (this.flags.Z === 0); condName = "CNZ"; break;
                        case 0xCC: condition = (this.flags.Z === 1); condName = "CZ"; break;
                        case 0xD4: condition = (this.flags.CY === 0); condName = "CNC"; break;
                        case 0xDC: condition = (this.flags.CY === 1); condName = "CC"; break;
                        case 0xE4: condition = (this.flags.P === 0); condName = "CPO"; break;
                        case 0xEC: condition = (this.flags.P === 1); condName = "CPE"; break;
                        case 0xF4: condition = (this.flags.S === 0); condName = "CP"; break;
                        case 0xFC: condition = (this.flags.S === 1); condName = "CM"; break;
                    }
                    mnemonic = `${condName} ${hexTarget}`;
                    if (condition) {
                        this.pushWord(retAddr);
                        this.PC = target;
                        cycles = 18;
                        description = `${condName}: Condition MET. Called ${hexTarget}.`;
                    } else {
                        cycles = 9;
                        description = `${condName}: Condition NOT met. Program continues.`;
                    }
                }
                break;

            // RET (0xC9)
            case 0xC9:
                {
                    const retAddr = this.popWord();
                    this.PC = retAddr;
                    mnemonic = "RET";
                    cycles = 10;
                    description = `Return from subroutine to ${retAddr.toString(16).toUpperCase().padStart(4, '0')}H.`;
                }
                break;

            // Conditional RETs (0xC0: RNZ, 0xC8: RZ, 0xD0: RNC, 0xD8: RC, 0xE0: RPO, 0xE8: RPE, 0xF0: RP, 0xF8: RM)
            case 0xC0: case 0xC8: case 0xD0: case 0xD8: case 0xE0: case 0xE8: case 0xF0: case 0xF8:
                {
                    let condition = false;
                    let condName = "";
                    switch (opcode) {
                        case 0xC0: condition = (this.flags.Z === 0); condName = "RNZ"; break;
                        case 0xC8: condition = (this.flags.Z === 1); condName = "RZ"; break;
                        case 0xD0: condition = (this.flags.CY === 0); condName = "RNC"; break;
                        case 0xD8: condition = (this.flags.CY === 1); condName = "RC"; break;
                        case 0xE0: condition = (this.flags.P === 0); condName = "RPO"; break;
                        case 0xE8: condition = (this.flags.P === 1); condName = "RPE"; break;
                        case 0xF0: condition = (this.flags.S === 0); condName = "RP"; break;
                        case 0xF8: condition = (this.flags.S === 1); condName = "RM"; break;
                    }
                    mnemonic = condName;
                    if (condition) {
                        const retAddr = this.popWord();
                        this.PC = retAddr;
                        cycles = 12;
                        description = `${condName}: Condition MET. Returned to ${retAddr.toString(16).toUpperCase().padStart(4, '0')}H.`;
                    } else {
                        cycles = 6;
                        description = `${condName}: Condition NOT met. Return skipped.`;
                    }
                }
                break;

            // PCHL (0xE9)
            case 0xE9:
                this.PC = this.getHL();
                mnemonic = "PCHL";
                cycles = 6;
                description = `Load PC with HL: PC ← HL (${this.PC.toString(16).toUpperCase().padStart(4, '0')}H).`;
                break;

            // ================== STACK ==================
            // PUSH rp (0xC5: B, 0xD5: D, 0xE5: H, 0xF5: PSW)
            case 0xC5: case 0xD5: case 0xE5: case 0xF5:
                {
                    cycles = 12;
                    if (opcode === 0xC5) { this.pushWord(this.getBC()); mnemonic = "PUSH B"; description = "Push register pair BC onto stack."; }
                    else if (opcode === 0xD5) { this.pushWord(this.getDE()); mnemonic = "PUSH D"; description = "Push register pair DE onto stack."; }
                    else if (opcode === 0xE5) { this.pushWord(this.getHL()); mnemonic = "PUSH H"; description = "Push register pair HL onto stack."; }
                    else if (opcode === 0xF5) { this.pushWord(this.getPSW()); mnemonic = "PUSH PSW"; description = "Push Processor Status Word (A and Flags) onto stack."; }
                }
                break;

            // POP rp (0xC1: B, 0xD1: D, 0xE1: H, 0xF1: PSW)
            case 0xC1: case 0xD1: case 0xE1: case 0xF1:
                {
                    cycles = 10;
                    if (opcode === 0xC1) { this.setBC(this.popWord()); mnemonic = "POP B"; description = "Pop top of stack into register pair BC."; }
                    else if (opcode === 0xD1) { this.setDE(this.popWord()); mnemonic = "POP D"; description = "Pop top of stack into register pair DE."; }
                    else if (opcode === 0xE1) { this.setHL(this.popWord()); mnemonic = "POP H"; description = "Pop top of stack into register pair HL."; }
                    else if (opcode === 0xF1) { this.setPSW(this.popWord()); mnemonic = "POP PSW"; description = "Pop top of stack into Processor Status Word (A and Flags)."; }
                }
                break;

            // XTHL (0xE3) - Exchange top of stack with HL
            case 0xE3:
                {
                    const low = this.readByte(this.SP);
                    const high = this.readByte(this.SP + 1);
                    this.writeByte(this.SP, this.L);
                    this.writeByte(this.SP + 1, this.H);
                    this.L = low;
                    this.H = high;
                    mnemonic = "XTHL";
                    cycles = 16;
                    description = "Exchange top two bytes of stack with register pair HL.";
                }
                break;

            // SPHL (0xF9) - Load SP from HL
            case 0xF9:
                this.SP = this.getHL();
                mnemonic = "SPHL";
                cycles = 6;
                description = `Load SP with HL: SP ← HL (${this.SP.toString(16).toUpperCase().padStart(4, '0')}H).`;
                break;

            // ================== I/O & INTERRUPTS ==================
            // IN port (0xDB)
            case 0xDB:
                {
                    const port = this.readByte(this.PC);
                    this.PC = (this.PC + 1) & 0xFFFF;
                    bytesCount = 2;
                    cycles = 10;
                    this.A = this.ioPorts[port];
                    mnemonic = `IN ${port.toString(16).toUpperCase().padStart(2, '0')}H`;
                    description = `Input from port ${port.toString(16).toUpperCase()}H into Accumulator A.`;
                }
                break;

            // OUT port (0xD3)
            case 0xD3:
                {
                    const port = this.readByte(this.PC);
                    this.PC = (this.PC + 1) & 0xFFFF;
                    bytesCount = 2;
                    cycles = 10;
                    this.ioPorts[port] = this.A;
                    mnemonic = `OUT ${port.toString(16).toUpperCase().padStart(2, '0')}H`;
                    description = `Output Accumulator A (${this.A.toString(16).toUpperCase().padStart(2, '0')}H) to port ${port.toString(16).toUpperCase()}H.`;
                }
                break;

            // EI (0xFB)
            case 0xFB:
                this.interruptsEnabled = true;
                mnemonic = "EI";
                cycles = 4;
                description = "Enable Interrupts.";
                break;

            // DI (0xF3)
            case 0xF3:
                this.interruptsEnabled = false;
                mnemonic = "DI";
                cycles = 4;
                description = "Disable Interrupts.";
                break;

            default:
                mnemonic = `DB ${opcode.toString(16).toUpperCase().padStart(2, '0')}H (UNKNOWN)`;
                description = `Unknown/illegal opcode ${opcode.toString(16).toUpperCase().padStart(2, '0')}H. Execution stopped.`;
                this.isHalted = true;
                break;
        }

        this.cycles += cycles;

        // Collect bytes that made up this instruction
        const bytes = [];
        for (let i = 0; i < bytesCount; i++) {
            bytes.push(this.readByte(startPC + i));
        }

        // Snapshot state after execution
        const after = {
            A: this.A, B: this.B, C: this.C, D: this.D,
            E: this.E, H: this.H, L: this.L,
            PC: this.PC, SP: this.SP,
            M: this.getM(),
            flags: { ...this.flags }
        };

        // Determine register changes for the UI
        const regChanges = [];
        ['A', 'B', 'C', 'D', 'E', 'H', 'L'].forEach(r => {
            if (before[r] !== after[r]) {
                regChanges.push(`${r}: ${before[r].toString(16).toUpperCase().padStart(2, '0')}H → ${after[r].toString(16).toUpperCase().padStart(2, '0')}H`);
            }
        });
        if (before.PC !== after.PC) {
            regChanges.push(`PC: ${before.PC.toString(16).toUpperCase().padStart(4, '0')}H → ${after.PC.toString(16).toUpperCase().padStart(4, '0')}H`);
        }
        if (before.SP !== after.SP) {
            regChanges.push(`SP: ${before.SP.toString(16).toUpperCase().padStart(4, '0')}H → ${after.SP.toString(16).toUpperCase().padStart(4, '0')}H`);
        }
        if (before.M !== after.M) {
            regChanges.push(`M (${this.getHL().toString(16).toUpperCase().padStart(4, '0')}H): ${before.M.toString(16).toUpperCase().padStart(2, '0')}H → ${after.M.toString(16).toUpperCase().padStart(2, '0')}H`);
        }

        this.lastStep = {
            address: startPC,
            addressHex: startPC.toString(16).toUpperCase().padStart(4, '0') + 'H',
            opcodeHex: opcode.toString(16).toUpperCase().padStart(2, '0') + 'H',
            bytes,
            bytesHex: bytes.map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(' '),
            mnemonic,
            cycles,
            description,
            before,
            after,
            regChanges,
            isHalted: this.isHalted
        };

        return this.lastStep;
    }

    /**
     * Run until HLT or step limit reached
     * @param {number} maxSteps - Safeguard against infinite loops (default 50,000)
     * @returns {Object} result summary { stepsExecuted, halted, lastStep }
     */
    run(maxSteps = 50000) {
        let count = 0;
        while (!this.isHalted && count < maxSteps) {
            this.step();
            count++;
        }
        return {
            stepsExecuted: count,
            halted: this.isHalted,
            timeout: count >= maxSteps,
            lastStep: this.lastStep
        };
    }
}

// Export for browser or node
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CPU8085;
}
