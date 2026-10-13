/**
 * 8085 Assembler and Disassembler
 * Full two-pass assembler supporting labels, comments, hex/dec constants,
 * data directives, operand validation, and friendly beginner error diagnostics.
 */

class Assembler8085 {
    constructor() {
        this.initOpcodeTables();
    }

    initOpcodeTables() {
        // Table of base instructions and their opcode patterns
        this.regMap = { 'B': 0, 'C': 1, 'D': 2, 'E': 3, 'H': 4, 'L': 5, 'M': 6, 'A': 7 };
        this.rpMap = { 'B': 0, 'D': 1, 'H': 2, 'SP': 3 };
        this.pushPopRpMap = { 'B': 0, 'D': 1, 'H': 2, 'PSW': 3 };

        // Simple 1-byte instructions
        this.simpleInstructions = {
            'NOP': 0x00, 'RLC': 0x07, 'RRC': 0x0F, 'RAL': 0x17, 'RAR': 0x1F,
            'DAA': 0x27, 'CMA': 0x2F, 'STC': 0x37, 'CMC': 0x3F, 'HLT': 0x76,
            'RET': 0xC9, 'RNZ': 0xC0, 'RZ': 0xC8, 'RNC': 0xD0, 'RC': 0xD8,
            'RPO': 0xE0, 'RPE': 0xE8, 'RP': 0xF0, 'RM': 0xF8,
            'XCHG': 0xEB, 'XTHL': 0xE3, 'SPHL': 0xF9, 'PCHL': 0xE9,
            'EI': 0xFB, 'DI': 0xF3
        };

        // 3-byte Branch instructions (opcode, length=3)
        this.jumpCallInstructions = {
            'JMP': 0xC3, 'JNZ': 0xC2, 'JZ': 0xCA, 'JNC': 0xD2, 'JC': 0xDA,
            'JPO': 0xE2, 'JPE': 0xEA, 'JP': 0xF2, 'JM': 0xFA,
            'CALL': 0xCD, 'CNZ': 0xC4, 'CZ': 0xCC, 'CNC': 0xD4, 'CC': 0xDC,
            'CPO': 0xE4, 'CPE': 0xEC, 'CP': 0xF4, 'CM': 0xFC
        };

        // 3-byte Direct memory instructions
        this.directMemInstructions = {
            'STA': 0x32, 'LDA': 0x3A, 'SHLD': 0x22, 'LHLD': 0x2A
        };

        // 2-byte Immediate instructions with Accumulator
        this.immediate8Instructions = {
            'ADI': 0xC6, 'ACI': 0xCE, 'SUI': 0xD6, 'SBI': 0xDE,
            'ANI': 0xE6, 'XRI': 0xEE, 'ORI': 0xF6, 'CPI': 0xFE
        };

        // Arithmetic/Logical with single register/memory operand
        this.aluRegInstructions = {
            'ADD': 0x80, 'ADC': 0x88, 'SUB': 0x90, 'SBB': 0x98,
            'ANA': 0xA0, 'XRA': 0xA8, 'ORA': 0xB0, 'CMP': 0xB8
        };

        // Complete 256-opcode lookup table for disassembly
        this.disasmTable = new Array(256);
        this.buildDisasmTable();
    }

    /**
     * Builds the reverse lookup table for 8085 disassembly
     */
    buildDisasmTable() {
        for (let i = 0; i < 256; i++) {
            this.disasmTable[i] = { mnemonic: `DB ${i.toString(16).toUpperCase().padStart(2, '0')}H`, bytes: 1 };
        }

        // Fill simple instructions
        for (const [m, op] of Object.entries(this.simpleInstructions)) {
            this.disasmTable[op] = { mnemonic: m, bytes: 1 };
        }

        // MOV r, r'
        const regs = ['B', 'C', 'D', 'E', 'H', 'L', 'M', 'A'];
        for (let d = 0; d < 8; d++) {
            for (let s = 0; s < 8; s++) {
                const op = 0x40 | (d << 3) | s;
                if (op === 0x76) continue; // HLT
                this.disasmTable[op] = { mnemonic: `MOV ${regs[d]}, ${regs[s]}`, bytes: 1 };
            }
        }

        // MVI r, d8
        for (let r = 0; r < 8; r++) {
            const op = 0x06 | (r << 3);
            this.disasmTable[op] = { mnemonic: `MVI ${regs[r]}, {d8}`, bytes: 2 };
        }

        // LXI rp, d16
        this.disasmTable[0x01] = { mnemonic: `LXI B, {d16}`, bytes: 3 };
        this.disasmTable[0x11] = { mnemonic: `LXI D, {d16}`, bytes: 3 };
        this.disasmTable[0x21] = { mnemonic: `LXI H, {d16}`, bytes: 3 };
        this.disasmTable[0x31] = { mnemonic: `LXI SP, {d16}`, bytes: 3 };

        // LDAX / STAX
        this.disasmTable[0x0A] = { mnemonic: "LDAX B", bytes: 1 };
        this.disasmTable[0x1A] = { mnemonic: "LDAX D", bytes: 1 };
        this.disasmTable[0x02] = { mnemonic: "STAX B", bytes: 1 };
        this.disasmTable[0x12] = { mnemonic: "STAX D", bytes: 1 };

        // Direct memory
        for (const [m, op] of Object.entries(this.directMemInstructions)) {
            this.disasmTable[op] = { mnemonic: `${m} {d16}`, bytes: 3 };
        }

        // ALU reg
        for (const [m, base] of Object.entries(this.aluRegInstructions)) {
            for (let r = 0; r < 8; r++) {
                this.disasmTable[base | r] = { mnemonic: `${m} ${regs[r]}`, bytes: 1 };
            }
        }

        // ALU immediate
        for (const [m, op] of Object.entries(this.immediate8Instructions)) {
            this.disasmTable[op] = { mnemonic: `${m} {d8}`, bytes: 2 };
        }

        // INR / DCR
        for (let r = 0; r < 8; r++) {
            this.disasmTable[0x04 | (r << 3)] = { mnemonic: `INR ${regs[r]}`, bytes: 1 };
            this.disasmTable[0x05 | (r << 3)] = { mnemonic: `DCR ${regs[r]}`, bytes: 1 };
        }

        // INX / DCX / DAD
        const rps = ['B', 'D', 'H', 'SP'];
        for (let r = 0; r < 4; r++) {
            this.disasmTable[0x03 | (r << 4)] = { mnemonic: `INX ${rps[r]}`, bytes: 1 };
            this.disasmTable[0x0B | (r << 4)] = { mnemonic: `DCX ${rps[r]}`, bytes: 1 };
            this.disasmTable[0x09 | (r << 4)] = { mnemonic: `DAD ${rps[r]}`, bytes: 1 };
        }

        // Jumps and Calls
        for (const [m, op] of Object.entries(this.jumpCallInstructions)) {
            this.disasmTable[op] = { mnemonic: `${m} {d16}`, bytes: 3 };
        }

        // PUSH / POP
        const pushRps = ['B', 'D', 'H', 'PSW'];
        for (let r = 0; r < 4; r++) {
            this.disasmTable[0xC5 | (r << 4)] = { mnemonic: `PUSH ${pushRps[r]}`, bytes: 1 };
            this.disasmTable[0xC1 | (r << 4)] = { mnemonic: `POP ${pushRps[r]}`, bytes: 1 };
        }

        // I/O
        this.disasmTable[0xDB] = { mnemonic: `IN {d8}`, bytes: 2 };
        this.disasmTable[0xD3] = { mnemonic: `OUT {d8}`, bytes: 2 };
    }

    /**
     * Parses numeric constants (e.g. 2050H, 05H, 0x2050, 255)
     */
    parseNumber(str) {
        if (!str) return NaN;
        str = str.trim();
        // Hex with H suffix (e.g. 2050H, 05h)
        if (/^[0-9a-fA-F]+[hH]$/.test(str)) {
            return parseInt(str.slice(0, -1), 16);
        }
        // Hex with 0x prefix (e.g. 0x2050)
        if (/^0x[0-9a-fA-F]+$/i.test(str)) {
            return parseInt(str.slice(2), 16);
        }
        // Pure hex or decimal: if string contains a-f, must be hex
        if (/[a-fA-F]/.test(str)) {
            return parseInt(str, 16);
        }
        // Otherwise parse as decimal or hex depending on context
        // In microprocessor college labs, unadorned 4-digit numbers like 2050 are often written without H
        if (str.length === 4 && /^[0-9]{4}$/.test(str)) {
            return parseInt(str, 16); // e.g. 2000 is hex 2000H in 8085 labs
        }
        return parseInt(str, 10);
    }

    /**
     * Disassemble single instruction from memory array or function
     * @param {number} address - Memory address
     * @param {Uint8Array|Function} memorySource - Memory array or readByte function
     * @returns {Object} { mnemonic, bytes, bytesHex, length }
     */
    disassembleOne(address, memorySource) {
        const read = (typeof memorySource === 'function') ? memorySource : (addr => memorySource[addr & 0xFFFF]);
        const opcode = read(address);
        const info = this.disasmTable[opcode] || { mnemonic: `DB ${opcode.toString(16).toUpperCase().padStart(2, '0')}H`, bytes: 1 };

        let mnemonic = info.mnemonic;
        const bytes = [opcode];

        if (info.bytes === 2) {
            const d8 = read(address + 1);
            bytes.push(d8);
            const d8Hex = d8.toString(16).toUpperCase().padStart(2, '0') + 'H';
            mnemonic = mnemonic.replace('{d8}', d8Hex);
        } else if (info.bytes === 3) {
            const lo = read(address + 1);
            const hi = read(address + 2);
            bytes.push(lo, hi);
            const d16 = (hi << 8) | lo;
            const d16Hex = d16.toString(16).toUpperCase().padStart(4, '0') + 'H';
            mnemonic = mnemonic.replace('{d16}', d16Hex);
        }

        return {
            address,
            addressHex: address.toString(16).toUpperCase().padStart(4, '0') + 'H',
            opcode,
            bytes,
            bytesHex: bytes.map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(' '),
            mnemonic,
            length: info.bytes
        };
    }

    /**
     * Disassemble memory range into an array of instructions
     */
    disassembleRange(startAddr, endAddr, memorySource) {
        const result = [];
        let cur = startAddr;
        while (cur <= endAddr) {
            const instr = this.disassembleOne(cur, memorySource);
            result.push(instr);
            cur += instr.length;
            if (instr.opcode === 0x76 && cur > endAddr) break; // HLT reached
        }
        return result;
    }

    /**
     * Assemble 8085 source code
     * @param {string} sourceCode - Multi-line assembly code
     * @param {number} defaultStart - Default starting address (e.g. 0x2000)
     * @returns {Object} { success, errors, warnings, listing, machineCode, startAddress }
     */
    assemble(sourceCode, defaultStart = 0x2000) {
        const lines = sourceCode.split(/\r?\n/);
        const errors = [];
        const warnings = [];
        const labels = {};
        const parsedLines = [];

        let currentAddress = defaultStart & 0xFFFF;
        let startAddress = defaultStart & 0xFFFF;
        let hasOrg = false;

        // ================= PASS 1: Parse structure, labels and calculate addresses =================
        for (let i = 0; i < lines.length; i++) {
            const originalLine = lines[i];
            const lineNum = i + 1;

            // Strip comments
            let code = originalLine;
            const commentIdx = code.search(/[;#]/);
            let comment = "";
            if (commentIdx !== -1) {
                comment = code.substring(commentIdx);
                code = code.substring(0, commentIdx);
            }
            code = code.trim();

            if (!code) {
                // Empty line or pure comment
                parsedLines.push({ lineNum, originalLine, isEmpty: true });
                continue;
            }

            // Check for labels (e.g. "LOOP:" or "START: MOV A, B")
            let label = null;
            const colonIdx = code.indexOf(':');
            if (colonIdx !== -1) {
                label = code.substring(0, colonIdx).trim().toUpperCase();
                code = code.substring(colonIdx + 1).trim();

                // Validate label
                if (!/^[A-Z_][A-Z0-9_]*$/.test(label)) {
                    errors.push({ line: lineNum, message: `Invalid label name '${label}'. Must start with letter or underscore.` });
                } else if (labels[label] !== undefined) {
                    errors.push({ line: lineNum, message: `Duplicate label '${label}'. Already defined at line ${labels[label].line}.` });
                } else {
                    labels[label] = { address: currentAddress, line: lineNum };
                }
            }

            if (!code) {
                // Line had only a label
                parsedLines.push({ lineNum, originalLine, label, isEmpty: false, address: currentAddress, isLabelOnly: true });
                continue;
            }

            // Split into mnemonic and operand part
            const spaceIdx = code.search(/\s/);
            let mnemonic = "";
            let operandStr = "";

            if (spaceIdx === -1) {
                mnemonic = code.toUpperCase();
            } else {
                mnemonic = code.substring(0, spaceIdx).trim().toUpperCase();
                operandStr = code.substring(spaceIdx + 1).trim();
            }

            // Handle Directives
            if (mnemonic === 'ORG') {
                const orgVal = this.parseNumber(operandStr);
                if (isNaN(orgVal) || orgVal < 0 || orgVal > 0xFFFF) {
                    errors.push({ line: lineNum, message: `Invalid ORG address '${operandStr}'. Must be 0000H - FFFFH.` });
                } else {
                    currentAddress = orgVal;
                    if (!hasOrg) {
                        startAddress = orgVal;
                        hasOrg = true;
                    }
                    if (label && labels[label]) {
                        labels[label].address = currentAddress;
                    }
                }
                parsedLines.push({ lineNum, originalLine, label, mnemonic, operandStr, address: currentAddress, isDirective: true, bytesLength: 0 });
                continue;
            }

            if (mnemonic === 'EQU') {
                const eqVal = this.parseNumber(operandStr);
                if (!label) {
                    errors.push({ line: lineNum, message: "EQU directive requires a label." });
                } else if (isNaN(eqVal)) {
                    errors.push({ line: lineNum, message: `Invalid EQU value '${operandStr}'.` });
                } else {
                    labels[label].address = eqVal;
                }
                parsedLines.push({ lineNum, originalLine, label, mnemonic, operandStr, address: currentAddress, isDirective: true, bytesLength: 0 });
                continue;
            }

            if (mnemonic === 'DB') {
                // Define bytes
                const parts = operandStr.split(',').map(s => s.trim());
                const bytesLength = parts.length;
                parsedLines.push({
                    lineNum, originalLine, label, mnemonic, operandStr,
                    address: currentAddress, isDB: true, parts, bytesLength
                });
                currentAddress = (currentAddress + bytesLength) & 0xFFFF;
                continue;
            }

            // Estimate instruction length
            const estLength = this.estimateInstructionLength(mnemonic, operandStr);
            if (estLength === -1) {
                errors.push({ line: lineNum, message: `Unrecognized 8085 instruction '${mnemonic}'.` });
                continue;
            }

            parsedLines.push({
                lineNum, originalLine, label, mnemonic, operandStr,
                address: currentAddress, bytesLength: estLength
            });

            currentAddress = (currentAddress + estLength) & 0xFFFF;
        }

        // ================= PASS 2: Encode machine code =================
        const listing = [];
        const machineCode = {};

        if (errors.length === 0) {
            for (const item of parsedLines) {
                if (item.isEmpty || item.isLabelOnly) continue;
                if (item.isDirective && item.mnemonic !== 'DB') continue;

                if (item.isDB) {
                    const bytes = [];
                    for (const p of item.parts) {
                        const val = this.parseNumber(p);
                        if (isNaN(val) || val < 0 || val > 0xFF) {
                            errors.push({ line: item.lineNum, message: `Invalid byte value '${p}' in DB directive.` });
                            bytes.push(0);
                        } else {
                            bytes.push(val & 0xFF);
                        }
                    }
                    bytes.forEach((b, idx) => {
                        machineCode[item.address + idx] = b;
                    });
                    listing.push({
                        address: item.address,
                        addressHex: item.address.toString(16).toUpperCase().padStart(4, '0') + 'H',
                        opcodes: bytes,
                        opcodesHex: bytes.map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(' '),
                        source: item.originalLine,
                        lineNum: item.lineNum,
                        label: item.label,
                        mnemonic: item.mnemonic,
                        operand: item.operandStr
                    });
                    continue;
                }

                // Encode 8085 instruction
                const encoded = this.encodeInstruction(item.mnemonic, item.operandStr, item.address, labels, item.lineNum);
                if (encoded.error) {
                    errors.push({ line: item.lineNum, message: encoded.error });
                } else {
                    encoded.bytes.forEach((b, idx) => {
                        machineCode[item.address + idx] = b;
                    });
                    listing.push({
                        address: item.address,
                        addressHex: item.address.toString(16).toUpperCase().padStart(4, '0') + 'H',
                        opcodes: encoded.bytes,
                        opcodesHex: encoded.bytes.map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(' '),
                        source: item.originalLine,
                        lineNum: item.lineNum,
                        label: item.label,
                        mnemonic: item.mnemonic,
                        operand: item.operandStr
                    });
                }
            }
        }

        return {
            success: errors.length === 0,
            errors,
            warnings,
            listing,
            machineCode,
            startAddress,
            labels
        };
    }

    /**
     * Estimates byte length of an instruction for Pass 1
     */
    estimateInstructionLength(mnemonic, operandStr) {
        if (this.simpleInstructions[mnemonic] !== undefined) return 1;
        if (mnemonic === 'MOV') return 1;
        if (mnemonic === 'MVI') return 2;
        if (mnemonic === 'LXI') return 3;
        if (mnemonic === 'LDA' || mnemonic === 'STA' || mnemonic === 'LHLD' || mnemonic === 'SHLD') return 3;
        if (mnemonic === 'LDAX' || mnemonic === 'STAX') return 1;
        if (mnemonic === 'ADD' || mnemonic === 'ADC' || mnemonic === 'SUB' || mnemonic === 'SBB') return 1;
        if (mnemonic === 'ANA' || mnemonic === 'XRA' || mnemonic === 'ORA' || mnemonic === 'CMP') return 1;
        if (this.immediate8Instructions[mnemonic] !== undefined) return 2;
        if (mnemonic === 'INR' || mnemonic === 'DCR') return 1;
        if (mnemonic === 'INX' || mnemonic === 'DCX' || mnemonic === 'DAD') return 1;
        if (this.jumpCallInstructions[mnemonic] !== undefined) return 3;
        if (mnemonic === 'PUSH' || mnemonic === 'POP') return 1;
        if (mnemonic === 'IN' || mnemonic === 'OUT') return 2;
        return -1;
    }

    /**
     * Encodes instruction mnemonic + operand into exact byte array
     */
    encodeInstruction(mnemonic, operandStr, currentAddress, labels, lineNum) {
        // Simple 1-byte instructions
        if (this.simpleInstructions[mnemonic] !== undefined) {
            if (operandStr) return { error: `'${mnemonic}' does not take operands.` };
            return { bytes: [this.simpleInstructions[mnemonic]] };
        }

        // MOV r1, r2
        if (mnemonic === 'MOV') {
            const parts = operandStr.split(',').map(s => s.trim().toUpperCase());
            if (parts.length !== 2) return { error: "MOV syntax: MOV destination, source (e.g. MOV A, B)" };
            const [dst, src] = parts;
            const dstIdx = this.regMap[dst];
            const srcIdx = this.regMap[src];
            if (dstIdx === undefined) return { error: `Invalid destination register '${dst}'. Allowed: A, B, C, D, E, H, L, M` };
            if (srcIdx === undefined) return { error: `Invalid source register '${src}'. Allowed: A, B, C, D, E, H, L, M` };
            if (dst === 'M' && src === 'M') return { error: "MOV M, M is invalid in 8085 (memory to memory transfer not supported)." };
            const op = 0x40 | (dstIdx << 3) | srcIdx;
            return { bytes: [op] };
        }

        // MVI r, d8
        if (mnemonic === 'MVI') {
            const parts = operandStr.split(',').map(s => s.trim());
            if (parts.length !== 2) return { error: "MVI syntax: MVI register, 8-bit data (e.g. MVI A, 05H)" };
            const reg = parts[0].toUpperCase();
            const regIdx = this.regMap[reg];
            if (regIdx === undefined) return { error: `Invalid register '${reg}' for MVI.` };
            const val = this.resolveValue(parts[1], labels);
            if (isNaN(val)) return { error: `Invalid 8-bit data '${parts[1]}' in MVI.` };
            if (val < -128 || val > 255) return { error: `Data value '${parts[1]}' out of 8-bit range (00H-FFH).` };
            const op = 0x06 | (regIdx << 3);
            return { bytes: [op, val & 0xFF] };
        }

        // LXI rp, d16
        if (mnemonic === 'LXI') {
            const parts = operandStr.split(',').map(s => s.trim());
            if (parts.length !== 2) return { error: "LXI syntax: LXI register-pair, 16-bit address/data (e.g. LXI H, 2050H)" };
            const rp = parts[0].toUpperCase();
            const rpIdx = this.rpMap[rp];
            if (rpIdx === undefined) return { error: `Invalid register pair '${rp}'. Allowed: B, D, H, SP` };
            const val = this.resolveValue(parts[1], labels);
            if (isNaN(val)) return { error: `Invalid 16-bit address/data '${parts[1]}' in LXI.` };
            if (val < 0 || val > 0xFFFF) return { error: `Value '${parts[1]}' out of 16-bit range (0000H-FFFFH).` };
            const op = 0x01 | (rpIdx << 4);
            return { bytes: [op, val & 0xFF, (val >> 8) & 0xFF] };
        }

        // LDA / STA / LHLD / SHLD
        if (this.directMemInstructions[mnemonic] !== undefined) {
            if (!operandStr) return { error: `${mnemonic} requires a 16-bit memory address (e.g. ${mnemonic} 2050H)` };
            const val = this.resolveValue(operandStr, labels);
            if (isNaN(val)) return { error: `Invalid address '${operandStr}' in ${mnemonic}.` };
            if (val < 0 || val > 0xFFFF) return { error: `Address '${operandStr}' out of range (0000H-FFFFH).` };
            const op = this.directMemInstructions[mnemonic];
            return { bytes: [op, val & 0xFF, (val >> 8) & 0xFF] };
        }

        // LDAX / STAX
        if (mnemonic === 'LDAX') {
            const rp = operandStr.trim().toUpperCase();
            if (rp === 'B') return { bytes: [0x0A] };
            if (rp === 'D') return { bytes: [0x1A] };
            return { error: "LDAX requires register pair B or D (e.g. LDAX B)." };
        }
        if (mnemonic === 'STAX') {
            const rp = operandStr.trim().toUpperCase();
            if (rp === 'B') return { bytes: [0x02] };
            if (rp === 'D') return { bytes: [0x12] };
            return { error: "STAX requires register pair B or D (e.g. STAX B)." };
        }

        // ALU Single Reg (ADD, ADC, SUB, SBB, ANA, XRA, ORA, CMP)
        if (this.aluRegInstructions[mnemonic] !== undefined) {
            const reg = operandStr.trim().toUpperCase();
            const regIdx = this.regMap[reg];
            if (regIdx === undefined) return { error: `${mnemonic} requires register or M (e.g. ${mnemonic} B or ${mnemonic} M).` };
            const op = this.aluRegInstructions[mnemonic] | regIdx;
            return { bytes: [op] };
        }

        // ALU Immediate (ADI, ACI, SUI, SBI, ANI, XRI, ORI, CPI)
        if (this.immediate8Instructions[mnemonic] !== undefined) {
            if (!operandStr) return { error: `${mnemonic} requires an 8-bit data value (e.g. ${mnemonic} 05H)` };
            const val = this.resolveValue(operandStr, labels);
            if (isNaN(val)) return { error: `Invalid 8-bit data '${operandStr}' in ${mnemonic}.` };
            if (val < -128 || val > 255) return { error: `Value '${operandStr}' out of 8-bit range (00H-FFH).` };
            const op = this.immediate8Instructions[mnemonic];
            return { bytes: [op, val & 0xFF] };
        }

        // INR / DCR
        if (mnemonic === 'INR' || mnemonic === 'DCR') {
            const reg = operandStr.trim().toUpperCase();
            const regIdx = this.regMap[reg];
            if (regIdx === undefined) return { error: `${mnemonic} requires register or M (e.g. ${mnemonic} A).` };
            const base = (mnemonic === 'INR') ? 0x04 : 0x05;
            const op = base | (regIdx << 3);
            return { bytes: [op] };
        }

        // INX / DCX / DAD
        if (mnemonic === 'INX' || mnemonic === 'DCX' || mnemonic === 'DAD') {
            const rp = operandStr.trim().toUpperCase();
            const rpIdx = this.rpMap[rp];
            if (rpIdx === undefined) return { error: `${mnemonic} requires register pair: B, D, H, or SP.` };
            let base = 0x03;
            if (mnemonic === 'DCX') base = 0x0B;
            if (mnemonic === 'DAD') base = 0x09;
            const op = base | (rpIdx << 4);
            return { bytes: [op] };
        }

        // Jumps and Calls
        if (this.jumpCallInstructions[mnemonic] !== undefined) {
            if (!operandStr) return { error: `${mnemonic} requires a target address or label (e.g. ${mnemonic} LOOP or ${mnemonic} 2000H).` };
            const val = this.resolveValue(operandStr, labels);
            if (isNaN(val)) return { error: `Unknown target label or invalid address '${operandStr}' in ${mnemonic}.` };
            if (val < 0 || val > 0xFFFF) return { error: `Target address '${operandStr}' out of 16-bit range.` };
            const op = this.jumpCallInstructions[mnemonic];
            return { bytes: [op, val & 0xFF, (val >> 8) & 0xFF] };
        }

        // PUSH / POP
        if (mnemonic === 'PUSH' || mnemonic === 'POP') {
            const rp = operandStr.trim().toUpperCase();
            const rpIdx = this.pushPopRpMap[rp];
            if (rpIdx === undefined) return { error: `${mnemonic} requires register pair B, D, H, or PSW (e.g. ${mnemonic} B).` };
            const base = (mnemonic === 'PUSH') ? 0xC5 : 0xC1;
            const op = base | (rpIdx << 4);
            return { bytes: [op] };
        }

        // IN / OUT
        if (mnemonic === 'IN' || mnemonic === 'OUT') {
            if (!operandStr) return { error: `${mnemonic} requires an 8-bit port address (e.g. ${mnemonic} 01H).` };
            const val = this.resolveValue(operandStr, labels);
            if (isNaN(val)) return { error: `Invalid port number '${operandStr}'.` };
            const op = (mnemonic === 'IN') ? 0xDB : 0xD3;
            return { bytes: [op, val & 0xFF] };
        }

        return { error: `Unsupported instruction '${mnemonic}'.` };
    }

    /**
     * Resolves value from operand string (checks labels first, then number parser)
     */
    resolveValue(token, labels) {
        if (!token) return NaN;
        token = token.trim();
        const upper = token.toUpperCase();
        if (labels && labels[upper] !== undefined) {
            return labels[upper].address;
        }
        return this.parseNumber(token);
    }
}

// Export for browser or node
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Assembler8085;
}
