/**
 * Main Application Coordinator for 8085 Trainer Kit Simulator
 * Connects CPU, Assembler, Trainer Kit Controller, Memory Inspector,
 * Exam System, and Diagnostics into a cohesive, responsive web app.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Instantiate Core Engines
    const cpu = new CPU8085();
    const assembler = new Assembler8085();
    let currentExamQIndex = 0;

    // Trainer Kit Controller with callback for UI updates
    const trainer = new TrainerKit8085(cpu, assembler, (displayState, extra) => {
        updateTrainerUI(displayState, extra);
    });

    const evaluator = new ExamEvaluator(cpu, assembler);

    // ==========================================================================
    // DOM Elements Cache
    // ==========================================================================
    const segAddress = document.getElementById('segAddress');
    const segData = document.getElementById('segData');
    const keypadModeBadge = document.getElementById('keypadModeBadge');

    const ledPower = document.getElementById('ledPower');
    const ledRun = document.getElementById('ledRun');
    const ledHalt = document.getElementById('ledHalt');
    const ledStep = document.getElementById('ledStep');
    const ledAddr = document.getElementById('ledAddr');
    const ledData = document.getElementById('ledData');
    const ledReg = document.getElementById('ledReg');

    const stepInstrName = document.getElementById('stepInstrName');
    const stepOpcodeInfo = document.getElementById('stepOpcodeInfo');
    const stepDescText = document.getElementById('stepDescText');
    const stepChangesText = document.getElementById('stepChangesText');
    const stepStatusTag = document.getElementById('stepStatusTag');

    const valRegA = document.getElementById('valRegA');
    const valRegB = document.getElementById('valRegB');
    const valRegC = document.getElementById('valRegC');
    const valRegD = document.getElementById('valRegD');
    const valRegE = document.getElementById('valRegE');
    const valRegH = document.getElementById('valRegH');
    const valRegL = document.getElementById('valRegL');
    const valRegM = document.getElementById('valRegM');
    const valRegPC = document.getElementById('valRegPC');
    const valRegSP = document.getElementById('valRegSP');
    const valRegHL = document.getElementById('valRegHL');

    const boxRegA = document.getElementById('boxRegA');
    const boxRegB = document.getElementById('boxRegB');
    const boxRegC = document.getElementById('boxRegC');
    const boxRegD = document.getElementById('boxRegD');
    const boxRegE = document.getElementById('boxRegE');
    const boxRegH = document.getElementById('boxRegH');
    const boxRegL = document.getElementById('boxRegL');
    const boxRegM = document.getElementById('boxRegM');
    const boxRegPC = document.getElementById('boxRegPC');
    const boxRegSP = document.getElementById('boxRegSP');
    const boxRegHL = document.getElementById('boxRegHL');

    const valFlagS = document.getElementById('valFlagS');
    const valFlagZ = document.getElementById('valFlagZ');
    const valFlagAC = document.getElementById('valFlagAC');
    const valFlagP = document.getElementById('valFlagP');
    const valFlagCY = document.getElementById('valFlagCY');
    const pswHexValue = document.getElementById('pswHexValue');

    const boxFlagS = document.getElementById('boxFlagS');
    const boxFlagZ = document.getElementById('boxFlagZ');
    const boxFlagAC = document.getElementById('boxFlagAC');
    const boxFlagP = document.getElementById('boxFlagP');
    const boxFlagCY = document.getElementById('boxFlagCY');

    // Assembly Editor Elements
    const asmSourceInput = document.getElementById('asmSourceInput');
    const asmStartAddr = document.getElementById('asmStartAddr');
    const btnAssembleCode = document.getElementById('btnAssembleCode');
    const btnRunFromEditor = document.getElementById('btnRunFromEditor');
    const btnStepFromEditor = document.getElementById('btnStepFromEditor');
    const btnLoadSampleProg = document.getElementById('btnLoadSampleProg');
    const btnClearEditor = document.getElementById('btnClearEditor');
    const asmStatusBox = document.getElementById('asmStatusBox');
    const machineCodeTableBody = document.getElementById('machineCodeTableBody');
    const btnDisassembleMem = document.getElementById('btnDisassembleMem');

    // Memory Inspector Elements
    const memGridTableBody = document.getElementById('memGridTableBody');
    const memJumpInput = document.getElementById('memJumpInput');
    const btnMemJump = document.getElementById('btnMemJump');
    const btnClearAllMem = document.getElementById('btnClearAllMem');

    // Sound Toggle
    const btnSoundToggle = document.getElementById('btnSoundToggle');
    const soundIcon = document.getElementById('soundIcon');
    const soundLabel = document.getElementById('soundLabel');

    // ==========================================================================
    // TAB NAVIGATION
    // ==========================================================================
    const navTabs = document.querySelectorAll('.nav-tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    function switchTab(tabId) {
        navTabs.forEach(b => b.classList.toggle('active', b.dataset.tab === tabId));
        tabPanes.forEach(p => p.classList.toggle('active', p.id === tabId));

        if (tabId === 'tab-memory') {
            renderMemoryGrid(cpu.PC);
        } else if (tabId === 'tab-tests') {
            runDiagnosticsUI();
        }
    }

    navTabs.forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Sound Toggle Handler
    btnSoundToggle.addEventListener('click', () => {
        trainer.soundEnabled = !trainer.soundEnabled;
        btnSoundToggle.classList.toggle('active', trainer.soundEnabled);
        soundIcon.textContent = trainer.soundEnabled ? '🔊' : '🔇';
        soundLabel.textContent = trainer.soundEnabled ? 'Sound ON' : 'Sound Muted';
    });

    // ==========================================================================
    // KEYPAD EVENT LISTENERS
    // ==========================================================================
    document.querySelectorAll('.key-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const key = btn.dataset.key;
            if (key === 'EXAM_LAB') {
                switchTab('tab-exam');
            } else {
                trainer.handleKey(key);
            }
        });
    });

    // Quick control buttons on PCB display
    document.getElementById('btnQuickStep').addEventListener('click', () => trainer.handleKey('STEP'));
    document.getElementById('btnQuickRun').addEventListener('click', () => trainer.handleKey('EXEC'));
    document.getElementById('btnQuickReset').addEventListener('click', () => trainer.handleKey('RESET'));

    // Global Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
        // Skip if typing in an input or textarea
        if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
            return;
        }

        const key = e.key;
        if (key === ' ') {
            e.preventDefault();
            trainer.handleKey('STEP');
        } else if (key === 'Enter') {
            e.preventDefault();
            trainer.handleKey('EXEC');
        } else if (key === 'Escape' || key === 'r' || key === 'R') {
            trainer.handleKey('RESET');
        } else if (/^[0-9a-fA-F]$/.test(key)) {
            trainer.handleKey(key.toUpperCase());
        } else if (key === '+' || key === 'ArrowDown') {
            trainer.handleKey('NEXT');
        } else if (key === '-' || key === 'ArrowUp') {
            trainer.handleKey('PREV');
        } else if (key === 'Backspace') {
            trainer.handleKey('CLEAR');
        }
    });

    // ==========================================================================
    // UI REFRESH LOGIC
    // ==========================================================================
    function updateTrainerUI(displayState, extra = {}) {
        if (!displayState) displayState = trainer.getDisplayState();

        // 1. Update 7-Segment Displays
        segAddress.textContent = displayState.addressText;
        segData.textContent = displayState.dataText;

        // 2. Mode Badge
        keypadModeBadge.textContent = `MODE: ${displayState.mode.replace('_', ' ')}`;

        // 3. Status LEDs
        ledRun.classList.toggle('on', displayState.mode === 'RUNNING');
        ledHalt.classList.toggle('on', cpu.isHalted);
        ledStep.classList.toggle('on', displayState.mode === 'IDLE' && !cpu.isHalted);
        ledAddr.classList.toggle('on', displayState.mode === 'ADDR_ENTRY');
        ledData.classList.toggle('on', displayState.mode === 'DATA_ENTRY');
        ledReg.classList.toggle('on', displayState.mode === 'REG_EXAM');

        // 4. Update Registers
        const toHex2 = v => (v & 0xFF).toString(16).toUpperCase().padStart(2, '0') + 'H';
        const toHex4 = v => (v & 0xFFFF).toString(16).toUpperCase().padStart(4, '0') + 'H';

        valRegA.textContent = toHex2(cpu.A);
        valRegB.textContent = toHex2(cpu.B);
        valRegC.textContent = toHex2(cpu.C);
        valRegD.textContent = toHex2(cpu.D);
        valRegE.textContent = toHex2(cpu.E);
        valRegH.textContent = toHex2(cpu.H);
        valRegL.textContent = toHex2(cpu.L);
        valRegM.textContent = toHex2(cpu.getM());

        valRegPC.textContent = toHex4(cpu.PC);
        valRegSP.textContent = toHex4(cpu.SP);
        valRegHL.textContent = toHex4(cpu.getHL());

        // 5. Update Flags
        valFlagS.textContent = cpu.flags.S;
        valFlagZ.textContent = cpu.flags.Z;
        valFlagAC.textContent = cpu.flags.AC;
        valFlagP.textContent = cpu.flags.P;
        valFlagCY.textContent = cpu.flags.CY;

        boxFlagS.classList.toggle('active', cpu.flags.S === 1);
        boxFlagZ.classList.toggle('active', cpu.flags.Z === 1);
        boxFlagAC.classList.toggle('active', cpu.flags.AC === 1);
        boxFlagP.classList.toggle('active', cpu.flags.P === 1);
        boxFlagCY.classList.toggle('active', cpu.flags.CY === 1);

        const flagByte = (cpu.flags.S << 7) | (cpu.flags.Z << 6) | (cpu.flags.AC << 4) | (cpu.flags.P << 2) | 2 | cpu.flags.CY;
        pswHexValue.textContent = `PSW = ${toHex2(flagByte)}`;

        // Highlight changes if step occurred
        if (extra && extra.stepResult) {
            const step = extra.stepResult;
            stepInstrName.textContent = step.mnemonic;
            stepOpcodeInfo.textContent = `(Opcode: ${step.opcodeHex}, Bytes: ${step.bytes.length}, Cycles: ${step.cycles})`;
            stepDescText.textContent = step.description;
            stepChangesText.textContent = step.regChanges.length > 0 ? step.regChanges.join(' | ') : "No registers modified";
            stepStatusTag.textContent = cpu.isHalted ? "SYSTEM HALTED" : `NEXT PC: ${toHex4(cpu.PC)}`;

            // Highlight changed register cards
            ['A', 'B', 'C', 'D', 'E', 'H', 'L'].forEach(r => {
                const box = document.getElementById(`boxReg${r}`);
                if (box) {
                    box.classList.toggle('changed', step.before[r] !== step.after[r]);
                }
            });
            boxRegPC.classList.add('changed');
            setTimeout(() => {
                document.querySelectorAll('.reg-box, .special-reg-box').forEach(b => b.classList.remove('changed'));
            }, 800);
        } else if (extra && extra.message) {
            stepDescText.textContent = extra.message;
        }

        // Highlight active instruction in machine code table if visible
        highlightActiveInstructionRow(cpu.PC);
    }

    // ==========================================================================
    // PRELOADED SAMPLE PROGRAM
    // ==========================================================================
    const DEFAULT_SAMPLE_PROGRAM = `; College Exam Practical Example:
; Add two 8-bit numbers stored in memory
; Input: 2050H = 25H, 2051H = 15H
; Output: 2052H = 3AH

ORG 2000H
LDA 2050H      ; Load 1st number from 2050H into A
MOV B, A       ; Save 1st number in register B
LDA 2051H      ; Load 2nd number from 2051H into A
ADD B          ; Add: A = A + B (25H + 15H = 3AH)
STA 2052H      ; Store result 3AH at 2052H
HLT            ; Halt microprocessor
`;

    function loadInitialProgram() {
        asmSourceInput.value = DEFAULT_SAMPLE_PROGRAM;

        // Initialize sample inputs in memory
        cpu.writeByte(0x2050, 0x25);
        cpu.writeByte(0x2051, 0x15);
        cpu.writeByte(0x2052, 0x00);

        // Assemble and load into memory
        assembleCurrentCode(false);

        // Set PC to 2000H
        cpu.PC = 0x2000;
        trainer.currentAddress = 0x2000;
        updateTrainerUI();
    }

    // ==========================================================================
    // ASSEMBLY IDE HANDLERS
    // ==========================================================================
    function assembleCurrentCode(showMessage = true) {
        const source = asmSourceInput.value;
        const startAddrNum = assembler.parseNumber(asmStartAddr.value) || 0x2000;

        const result = assembler.assemble(source, startAddrNum);

        if (!result.success) {
            asmStatusBox.className = "asm-status-box error";
            asmStatusBox.innerHTML = `<b>Assembly Failed:</b><br>` + result.errors.map(e => `Line ${e.line}: ${e.message}`).join('<br>');
            return false;
        }

        // Write assembled machine code into CPU memory
        for (const [addr, byte] of Object.entries(result.machineCode)) {
            cpu.writeByte(parseInt(addr, 10), byte);
        }

        cpu.PC = result.startAddress;
        cpu.isHalted = false;
        trainer.currentAddress = result.startAddress;

        // Render Machine Code Table
        renderMachineCodeTable(result.listing);

        if (showMessage) {
            asmStatusBox.className = "asm-status-box success";
            asmStatusBox.innerHTML = `✅ <b>Assembled Successfully!</b> Program loaded from ${result.startAddress.toString(16).toUpperCase().padStart(4, '0')}H. Program Counter (PC) set to starting address.`;
            trainer.playBeep('success');
        }

        updateTrainerUI();
        return true;
    }

    btnAssembleCode.addEventListener('click', () => assembleCurrentCode(true));

    btnRunFromEditor.addEventListener('click', () => {
        if (assembleCurrentCode(false)) {
            trainer.handleKey('EXEC');
        }
    });

    btnStepFromEditor.addEventListener('click', () => {
        trainer.handleKey('STEP');
    });

    btnLoadSampleProg.addEventListener('click', () => {
        asmSourceInput.value = DEFAULT_SAMPLE_PROGRAM;
        assembleCurrentCode(true);
    });

    btnClearEditor.addEventListener('click', () => {
        asmSourceInput.value = "ORG 2000H\n\nHLT\n";
    });

    btnDisassembleMem.addEventListener('click', () => {
        const start = cpu.PC;
        const listing = assembler.disassembleRange(start, start + 32, cpu.memory);
        renderDisassembledTable(listing);
    });

    function renderMachineCodeTable(listing) {
        machineCodeTableBody.innerHTML = '';
        listing.forEach(item => {
            const tr = document.createElement('tr');
            tr.dataset.addr = item.address;
            tr.innerHTML = `
                <td class="addr-col">${item.addressHex}</td>
                <td class="hex-col">${item.opcodesHex}</td>
                <td class="instr-col"><b>${item.mnemonic}</b> ${item.operand || ''}</td>
                <td style="color:#8b949e; font-size:11px;">Line ${item.lineNum}</td>
            `;
            machineCodeTableBody.appendChild(tr);
        });
        highlightActiveInstructionRow(cpu.PC);
    }

    function renderDisassembledTable(listing) {
        machineCodeTableBody.innerHTML = '';
        listing.forEach(item => {
            const tr = document.createElement('tr');
            tr.dataset.addr = item.address;
            tr.innerHTML = `
                <td class="addr-col">${item.addressHex}</td>
                <td class="hex-col">${item.bytesHex}</td>
                <td class="instr-col"><b>${item.mnemonic}</b></td>
                <td style="color:#8b949e; font-size:11px;">Memory Disasm</td>
            `;
            machineCodeTableBody.appendChild(tr);
        });
        highlightActiveInstructionRow(cpu.PC);
    }

    function highlightActiveInstructionRow(currentPC) {
        const rows = machineCodeTableBody.querySelectorAll('tr');
        rows.forEach(r => {
            const addr = parseInt(r.dataset.addr, 10);
            r.classList.toggle('active-instruction', addr === currentPC);
        });
    }

    // ==========================================================================
    // MEMORY INSPECTOR & CELL EDITOR
    // ==========================================================================
    let currentMemBaseAddr = 0x2000;

    function renderMemoryGrid(baseAddr = 0x2000) {
        baseAddr = baseAddr & 0xFFF0; // Align to 16 bytes
        currentMemBaseAddr = baseAddr;
        memGridTableBody.innerHTML = '';

        // Display 16 rows (256 bytes total)
        for (let row = 0; row < 16; row++) {
            const rowAddr = (baseAddr + row * 16) & 0xFFFF;
            const tr = document.createElement('tr');

            let rowHtml = `<td class="mem-addr-cell">${rowAddr.toString(16).toUpperCase().padStart(4, '0')}H</td>`;

            for (let col = 0; col < 16; col++) {
                const cellAddr = (rowAddr + col) & 0xFFFF;
                const byteVal = cpu.readByte(cellAddr);
                const hexStr = byteVal.toString(16).toUpperCase().padStart(2, '0');
                const hasData = byteVal !== 0;
                const isPC = cellAddr === cpu.PC;

                rowHtml += `
                    <td>
                        <input type="text" class="mem-byte-input ${hasData ? 'has-data' : ''} ${isPC ? 'active-pc' : ''}" 
                               data-addr="${cellAddr}" value="${hexStr}" maxlength="2">
                    </td>
                `;
            }

            tr.innerHTML = rowHtml;
            memGridTableBody.appendChild(tr);
        }

        // Attach change listeners to cells
        memGridTableBody.querySelectorAll('.mem-byte-input').forEach(inp => {
            inp.addEventListener('change', (e) => {
                const addr = parseInt(e.target.dataset.addr, 10);
                const val = parseInt(e.target.value, 16);
                if (!isNaN(val)) {
                    cpu.writeByte(addr, val);
                    e.target.value = (val & 0xFF).toString(16).toUpperCase().padStart(2, '0');
                    e.target.classList.toggle('has-data', (val & 0xFF) !== 0);
                    trainer.notify();
                } else {
                    e.target.value = cpu.readByte(addr).toString(16).toUpperCase().padStart(2, '0');
                }
            });
        });
    }

    btnMemJump.addEventListener('click', () => {
        const addr = assembler.parseNumber(memJumpInput.value) || 0x2000;
        renderMemoryGrid(addr);
    });

    document.querySelectorAll('.jump-tag').forEach(tag => {
        tag.addEventListener('click', () => {
            const addr = parseInt(tag.dataset.addr, 16);
            memJumpInput.value = tag.dataset.addr + 'H';
            renderMemoryGrid(addr);
        });
    });

    btnClearAllMem.addEventListener('click', () => {
        if (confirm("Clear all 64KB memory to 00H?")) {
            cpu.clearMemory();
            renderMemoryGrid(currentMemBaseAddr);
            trainer.notify();
        }
    });

    // ==========================================================================
    // EXAM PRACTICE LAB
    // ==========================================================================
    const examQuestionsList = document.getElementById('examQuestionsList');
    const examQTitle = document.getElementById('examQTitle');
    const examQDesc = document.getElementById('examQDesc');
    const examQInputsList = document.getElementById('examQInputsList');
    const examQOutputsList = document.getElementById('examQOutputsList');
    const examCodeInput = document.getElementById('examCodeInput');
    const btnLoadExamInputs = document.getElementById('btnLoadExamInputs');
    const btnLoadStarterTemplate = document.getElementById('btnLoadStarterTemplate');
    const btnToggleHint = document.getElementById('btnToggleHint');
    const btnToggleSolution = document.getElementById('btnToggleSolution');
    const examHintBox = document.getElementById('examHintBox');
    const examHintText = document.getElementById('examHintText');
    const examSolutionBox = document.getElementById('examSolutionBox');
    const examSolutionText = document.getElementById('examSolutionText');
    const btnCopySolutionToEditor = document.getElementById('btnCopySolutionToEditor');
    const btnEvaluateExam = document.getElementById('btnEvaluateExam');
    const btnSendToTrainer = document.getElementById('btnSendToTrainer');
    const examEvalResult = document.getElementById('examEvalResult');

    function populateExamQuestions() {
        examQuestionsList.innerHTML = '';
        let currentCategory = '';

        EXAM_QUESTIONS.forEach((q, index) => {
            if (q.category !== currentCategory) {
                currentCategory = q.category;
                const catHeader = document.createElement('div');
                catHeader.className = 'exam-category-header';
                catHeader.textContent = currentCategory;
                examQuestionsList.appendChild(catHeader);
            }

            const item = document.createElement('div');
            item.className = `exam-question-item ${index === 0 ? 'active' : ''}`;
            item.textContent = q.title;
            item.dataset.index = index;
            item.addEventListener('click', () => loadExamQuestion(index));
            examQuestionsList.appendChild(item);
        });

        loadExamQuestion(0);
    }

    function loadExamQuestion(index) {
        currentExamQIndex = index;
        const q = EXAM_QUESTIONS[index];

        document.querySelectorAll('.exam-question-item').forEach((el, idx) => {
            el.classList.toggle('active', idx === index);
        });

        examQTitle.textContent = q.title;
        examQDesc.textContent = q.description;

        examQInputsList.innerHTML = q.inputs.map(i => `<b>${i.address.toString(16).toUpperCase().padStart(4, '0')}H:</b> ${i.value.toString(16).toUpperCase().padStart(2, '0')}H (${i.label})`).join('<br>');
        examQOutputsList.innerHTML = q.outputs.map(o => `<b>${o.address.toString(16).toUpperCase().padStart(4, '0')}H:</b> ${o.label}`).join('<br>');

        examCodeInput.value = q.starterCode;
        examHintText.textContent = q.hint;
        examSolutionText.textContent = q.solution;

        examHintBox.style.display = 'none';
        examSolutionBox.style.display = 'none';
        examEvalResult.style.display = 'none';
    }

    btnLoadExamInputs.addEventListener('click', () => {
        const q = EXAM_QUESTIONS[currentExamQIndex];
        q.inputs.forEach(i => {
            cpu.writeByte(i.address, i.value);
        });
        trainer.playBeep('success');
        alert(`Inputs loaded into memory! Check locations ${q.inputs.map(i => i.address.toString(16).toUpperCase() + 'H').join(', ')}.`);
        updateTrainerUI();
    });

    btnLoadStarterTemplate.addEventListener('click', () => {
        const q = EXAM_QUESTIONS[currentExamQIndex];
        examCodeInput.value = q.starterCode;
    });

    btnToggleHint.addEventListener('click', () => {
        const isHidden = examHintBox.style.display === 'none';
        examHintBox.style.display = isHidden ? 'block' : 'none';
        btnToggleHint.textContent = isHidden ? 'Hide Hint' : '💡 Show Hint';
    });

    btnToggleSolution.addEventListener('click', () => {
        const isHidden = examSolutionBox.style.display === 'none';
        examSolutionBox.style.display = isHidden ? 'block' : 'none';
        btnToggleSolution.textContent = isHidden ? 'Hide Solution' : '🔑 Show Solution';
    });

    btnCopySolutionToEditor.addEventListener('click', () => {
        const q = EXAM_QUESTIONS[currentExamQIndex];
        examCodeInput.value = q.solution;
        alert("Solution code copied into your program editor!");
    });

    btnEvaluateExam.addEventListener('click', () => {
        const q = EXAM_QUESTIONS[currentExamQIndex];
        const studentCode = examCodeInput.value;

        const report = evaluator.evaluate(q, studentCode);

        examEvalResult.style.display = 'block';
        if (report.passed) {
            examEvalResult.className = 'eval-result-card passed';
            examEvalResult.innerHTML = `
                <div style="font-size:16px; font-weight:800; margin-bottom:6px;">${report.message}</div>
                <div style="font-size:13px;">Your program compiled correctly, executed cleanly to HLT, and satisfied all required memory test conditions!</div>
            `;
            trainer.playBeep('success');
        } else {
            examEvalResult.className = 'eval-result-card failed';
            let detailsHtml = "";
            if (report.type === 'SYNTAX_ERROR') {
                detailsHtml = `<b>Assembly Errors:</b><br>` + report.details.join('<br>');
            } else {
                detailsHtml = `<b>Verification Mismatch:</b><br>` + report.testResults.map(tr => {
                    if (tr.reason) return `Test Case ${tr.testCaseIndex}: ${tr.reason}`;
                    if (tr.mismatches) {
                        return `Test Case ${tr.testCaseIndex}: ` + tr.mismatches.map(m => `At ${m.address}: expected ${m.expected}, got ${m.actual}`).join(', ');
                    }
                    return `Test Case ${tr.testCaseIndex}: Passed`;
                }).join('<br>');
            }

            examEvalResult.innerHTML = `
                <div style="font-size:16px; font-weight:800; margin-bottom:6px;">❌ Test Not Passed</div>
                <div style="font-size:13px; line-height:1.6;">${detailsHtml}</div>
            `;
            trainer.playBeep('error');
        }
    });

    btnSendToTrainer.addEventListener('click', () => {
        const code = examCodeInput.value;
        asmSourceInput.value = code;
        if (assembleCurrentCode(true)) {
            // Also preload inputs for this question into memory
            const q = EXAM_QUESTIONS[currentExamQIndex];
            q.inputs.forEach(i => cpu.writeByte(i.address, i.value));
            switchTab('tab-trainer');
        }
    });

    // ==========================================================================
    // DIAGNOSTICS & BUILT-IN VERIFICATION RUNNER
    // ==========================================================================
    const diagnosticsResultsContainer = document.getElementById('diagnosticsResultsContainer');
    const btnReRunDiagnostics = document.getElementById('btnReRunDiagnostics');

    function runDiagnosticsUI() {
        const diag = Diagnostics8085.runAllTests(CPU8085, Assembler8085);
        diagnosticsResultsContainer.innerHTML = '';

        diag.results.forEach(res => {
            const row = document.createElement('div');
            row.className = 'test-item-row';
            row.innerHTML = `
                <div>
                    <div class="test-name">TEST ${res.testNumber}: ${res.name}</div>
                    <div class="test-details">${res.details || res.error}</div>
                </div>
                <div>
                    <span class="test-badge ${res.passed ? 'pass' : 'fail'}">
                        ${res.passed ? '✔ PASSED' : '✖ FAILED'}
                    </span>
                </div>
            `;
            diagnosticsResultsContainer.appendChild(row);
        });
    }

    btnReRunDiagnostics.addEventListener('click', () => {
        runDiagnosticsUI();
        trainer.playBeep('success');
    });

    // ==========================================================================
    // STARTUP INITIALIZATION
    // ==========================================================================
    populateExamQuestions();
    loadInitialProgram();
    runDiagnosticsUI();
});
