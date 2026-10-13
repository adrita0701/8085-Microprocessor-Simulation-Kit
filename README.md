# 8085 Microprocessor Simulator

A web-based simulation of the Intel 8085 microprocessor, designed to recreate the experience of using a physical microprocessor trainer kit. It provides an interactive environment for writing assembly programs, entering machine code, executing instructions, and observing changes in registers, flags, and memory.

The interface features a retro-style trainer board with a hexadecimal keypad, seven-segment display, and execution status indicators.

## Features

- 8085 CPU simulation with registers, flags, 64 KB memory, and instruction execution.
- Assembly mode for writing programs, using labels, and assembling code into machine code.
- Machine code mode for entering hexadecimal opcodes through the virtual trainer keypad.
- Step-by-step execution to observe instruction execution and changes to registers and flags.
- Memory inspector for viewing and modifying memory locations in hexadecimal.
- Instruction support for data transfer, arithmetic, logical, branching, stack, and control operations.
- Interactive trainer board with a retro PCB interface, display, status LEDs, and keypad sounds.
- Practice programs for addition, subtraction, sorting, searching, and other common 8085 operations.
- Built-in diagnostic tests for checking core instructions and CPU operations.

## Getting Started

No installation or server is required.

1. Clone or download this repository.
2. Open `index.html` in Google Chrome or Microsoft Edge.
3. Start using the simulator directly in your browser.

The simulator runs locally and can be used offline.

## Project Structure

8085-microprocessor-simulator/
├── index.html       # Main interface
├── style.css        # Styling and trainer board design
├── app.js           # Main application logic
├── assembler.js     # Assembly and machine code handling
├── cpu.js           # 8085 CPU emulation
├── diagnostics.js   # CPU diagnostic tests
├── system.js        # System-level operations
├── trainerkit.js    # Trainer kit interface and controls
└── README.md        # Project documentation
```

## Technologies Used

- HTML
- CSS
- JavaScript
- Web Audio API

## Purpose

This project simulates the operation of an 8085 microprocessor trainer kit, providing a convenient way to explore assembly language programming, understand instruction execution, and experiment with memory and registers without requiring physical hardware.

## Note

This is a software simulation. Its instruction support and hardware behaviour depend on the implemented features and may differ from a physical 8085 trainer kit.