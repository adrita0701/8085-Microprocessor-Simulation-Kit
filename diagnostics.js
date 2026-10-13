/**
 * 8085 Built-in Diagnostics & Self-Test Suite
 * Rigorously validates CPU emulator and Assembler against all 7 core college requirements:
 * TEST 1: Add two 8-bit numbers (including carry & zero flags)
 * TEST 2: Subtract two 8-bit numbers (including borrow)
 * TEST 3: Store accumulator to memory (STA)
 * TEST 4: Increment a register (INR and CY preservation)
 * TEST 5: Conditional jump (JNZ loop iteration)
 * TEST 6: 16-bit addition (DAD instruction)
 * TEST 7: Array / sum program (Multi-element memory loop)
 */

class Diagnostics8085 {
    static runAllTests(CPUClass, AssemblerClass) {
        const cpu = new CPUClass();
        const asm = new AssemblerClass();
        const results = [];

        // Helper to assemble and run
        const runProgram = (code, startAddr = 0x2000, initialMem = {}) => {
            cpu.reset(startAddr);
            cpu.clearMemory();
            for (const [addr, val] of Object.entries(initialMem)) {
                cpu.writeByte(parseInt(addr, 10), val);
            }
            const asmRes = asm.assemble(code, startAddr);
            if (!asmRes.success) {
                return { error: "Asm error: " + asmRes.errors.map(e => e.message).join(", ") };
            }
            for (const [addr, b] of Object.entries(asmRes.machineCode)) {
                cpu.writeByte(parseInt(addr, 10), b);
            }
            const execRes = cpu.run(10000);
            return { execRes, cpu };
        };

        // ================= TEST 1: Add two 8-bit numbers =================
        try {
            const code1 = `
                MVI A, 25H
                MVI B, 13H
                ADD B
                HLT
            `;
            const r1 = runProgram(code1);
            const pass1 = !r1.error && r1.cpu.A === 0x38 && r1.cpu.flags.CY === 0 && r1.cpu.flags.Z === 0;

            // Carry case
            const code1b = `
                MVI A, FFH
                MVI B, 01H
                ADD B
                HLT
            `;
            const r1b = runProgram(code1b);
            const pass1b = !r1b.error && r1b.cpu.A === 0x00 && r1b.cpu.flags.CY === 1 && r1b.cpu.flags.Z === 1;

            results.push({
                testNumber: 1,
                name: "Add two 8-bit numbers",
                passed: pass1 && pass1b,
                details: `25H + 13H = ${r1.cpu.A.toString(16).toUpperCase()}H (exp 38H). Carry test: FFH + 01H = ${r1b.cpu.A.toString(16).toUpperCase()}H, CY=${r1b.cpu.flags.CY}, Z=${r1b.cpu.flags.Z}`
            });
        } catch (e) {
            results.push({ testNumber: 1, name: "Add two 8-bit numbers", passed: false, error: e.message });
        }

        // ================= TEST 2: Subtract two 8-bit numbers =================
        try {
            const code2 = `
                MVI A, 48H
                MVI B, 22H
                SUB B
                HLT
            `;
            const r2 = runProgram(code2);
            const pass2 = !r2.error && r2.cpu.A === 0x26 && r2.cpu.flags.CY === 0;

            // Borrow case
            const code2b = `
                MVI A, 10H
                MVI B, 20H
                SUB B
                HLT
            `;
            const r2b = runProgram(code2b);
            const pass2b = !r2b.error && r2b.cpu.A === 0xF0 && r2b.cpu.flags.CY === 1 && r2b.cpu.flags.S === 1;

            results.push({
                testNumber: 2,
                name: "Subtract two 8-bit numbers",
                passed: pass2 && pass2b,
                details: `48H - 22H = ${r2.cpu.A.toString(16).toUpperCase()}H (exp 26H). Borrow test: 10H - 20H = ${r2b.cpu.A.toString(16).toUpperCase()}H, CY=${r2b.cpu.flags.CY}, S=${r2b.cpu.flags.S}`
            });
        } catch (e) {
            results.push({ testNumber: 2, name: "Subtract two 8-bit numbers", passed: false, error: e.message });
        }

        // ================= TEST 3: Store accumulator to memory =================
        try {
            const code3 = `
                MVI A, 42H
                STA 2050H
                HLT
            `;
            const r3 = runProgram(code3);
            const memVal = r3.cpu.readByte(0x2050);
            const pass3 = !r3.error && memVal === 0x42;
            results.push({
                testNumber: 3,
                name: "Store accumulator to memory",
                passed: pass3,
                details: `MVI A, 42H -> STA 2050H. Memory[2050H] = ${memVal.toString(16).toUpperCase().padStart(2, '0')}H (expected 42H)`
            });
        } catch (e) {
            results.push({ testNumber: 3, name: "Store accumulator to memory", passed: false, error: e.message });
        }

        // ================= TEST 4: Increment a register =================
        try {
            const code4 = `
                STC
                MVI B, 0FH
                INR B
                HLT
            `;
            const r4 = runProgram(code4);
            // In 8085, INR affects S, Z, AC, P but MUST preserve CY!
            const pass4 = !r4.error && r4.cpu.B === 0x10 && r4.cpu.flags.AC === 1 && r4.cpu.flags.CY === 1;
            results.push({
                testNumber: 4,
                name: "Increment a register",
                passed: pass4,
                details: `INR 0FH -> ${r4.cpu.B.toString(16).toUpperCase().padStart(2, '0')}H (exp 10H). AC=${r4.cpu.flags.AC}, CY preserved=${r4.cpu.flags.CY}`
            });
        } catch (e) {
            results.push({ testNumber: 4, name: "Increment a register", passed: false, error: e.message });
        }

        // ================= TEST 5: Conditional jump =================
        try {
            const code5 = `
                MVI C, 05H
                MVI A, 00H
                LOOP: INR A
                DCR C
                JNZ LOOP
                HLT
            `;
            const r5 = runProgram(code5);
            const pass5 = !r5.error && r5.cpu.A === 0x05 && r5.cpu.C === 0x00 && r5.cpu.flags.Z === 1;
            results.push({
                testNumber: 5,
                name: "Conditional jump",
                passed: pass5,
                details: `Loop 5 iterations: A=${r5.cpu.A.toString(16).toUpperCase()}H (exp 05H), C=${r5.cpu.C.toString(16).toUpperCase()}H (exp 00H), Z=${r5.cpu.flags.Z}`
            });
        } catch (e) {
            results.push({ testNumber: 5, name: "Conditional jump", passed: false, error: e.message });
        }

        // ================= TEST 6: 16-bit addition =================
        try {
            const code6 = `
                LXI H, 1234H
                LXI D, 5678H
                DAD D
                HLT
            `;
            const r6 = runProgram(code6);
            const hlVal = r6.cpu.getHL();
            const pass6 = !r6.error && hlVal === 0x68AC && r6.cpu.flags.CY === 0;

            // 16-bit Carry test
            const code6b = `
                LXI H, FFFFH
                LXI D, 0001H
                DAD D
                HLT
            `;
            const r6b = runProgram(code6b);
            const hlValB = r6b.cpu.getHL();
            const pass6b = !r6b.error && hlValB === 0x0000 && r6b.cpu.flags.CY === 1;

            results.push({
                testNumber: 6,
                name: "16-bit addition (DAD)",
                passed: pass6 && pass6b,
                details: `1234H + 5678H = ${hlVal.toString(16).toUpperCase()}H (exp 68ACH). Overflow: FFFFH + 0001H = ${hlValB.toString(16).toUpperCase()}H, CY=${r6b.cpu.flags.CY}`
            });
        } catch (e) {
            results.push({ testNumber: 6, name: "16-bit addition (DAD)", passed: false, error: e.message });
        }

        // ================= TEST 7: Array / sum program =================
        try {
            const initialMem7 = {
                0x2050: 0x03, // Count = 3
                0x2051: 0x10, // Val 1
                0x2052: 0x20, // Val 2
                0x2053: 0x30  // Val 3
            };
            const code7 = `
                LDA 2050H
                MOV C, A
                MVI A, 00H
                LXI H, 2051H
                LOOP: ADD M
                INX H
                DCR C
                JNZ LOOP
                STA 2060H
                HLT
            `;
            const r7 = runProgram(code7, 0x2000, initialMem7);
            const sumOut = r7.cpu.readByte(0x2060);
            const pass7 = !r7.error && sumOut === 0x60;
            results.push({
                testNumber: 7,
                name: "Array / sum program",
                passed: pass7,
                details: `Sum of [10H, 20H, 30H] = ${sumOut.toString(16).toUpperCase()}H (exp 60H at 2060H)`
            });
        } catch (e) {
            results.push({ testNumber: 7, name: "Array / sum program", passed: false, error: e.message });
        }

        const allPassed = results.every(r => r.passed);
        return {
            allPassed,
            results
        };
    }
}

// Export for browser or node
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Diagnostics8085;
}
