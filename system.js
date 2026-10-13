/**
 * 8085 Practical Exam System & Question Bank
 * Contains 18 standard university practical questions with:
 * - Clear problem statement
 * - Inputs, default test vectors, expected outputs
 * - Starter code templates
 * - Step-by-step hints and full verified solutions
 * - Smart evaluator: runs student code with test inputs and validates memory results!
 */

const EXAM_QUESTIONS = [
    {
        id: "exam_add_8bit",
        title: "1. Add Two 8-bit Numbers",
        category: "Arithmetic",
        description: "Write an 8085 assembly language program to add two 8-bit numbers stored at memory locations 2050H and 2051H. Store the 8-bit result at memory location 2052H and carry (if any) at 2053H.",
        startAddress: 0x2000,
        inputs: [
            { address: 0x2050, value: 0x25, label: "First 8-bit Number" },
            { address: 0x2051, value: 0x15, label: "Second 8-bit Number" }
        ],
        outputs: [
            { address: 0x2052, label: "Sum (8-bit)" },
            { address: 0x2053, label: "Carry (00H or 01H)" }
        ],
        starterCode: `; Experiment 1: Add Two 8-bit Numbers
; Inputs: 2050H, 2051H
; Outputs: 2052H (Sum), 2053H (Carry)

ORG 2000H
MVI C, 00H     ; Clear Carry register
LDA 2050H      ; Load 1st number into Accumulator
MOV B, A       ; Save in B
LDA 2051H      ; Load 2nd number into Accumulator
ADD B          ; A = A + B
JNC SKIP       ; Jump if no carry
INR C          ; Increment carry counter
SKIP: STA 2052H; Store Sum at 2052H
MOV A, C       ; Move carry into A
STA 2053H      ; Store Carry at 2053H
HLT            ; Stop execution
`,
        hint: "Load the first number into A using LDA 2050H. Save it in register B with MOV B, A. Load the second number using LDA 2051H. Add them with ADD B. If carry is generated (CY=1), increment register C. Store Sum with STA 2052H and Carry with STA 2053H.",
        solution: `ORG 2000H
MVI C, 00H
LDA 2050H
MOV B, A
LDA 2051H
ADD B
JNC NOCARRY
INR C
NOCARRY: STA 2052H
MOV A, C
STA 2053H
HLT`,
        testCases: [
            { inputs: { 0x2050: 0x25, 0x2051: 0x15 }, expected: { 0x2052: 0x3A, 0x2053: 0x00 } },
            { inputs: { 0x2050: 0xF5, 0x2051: 0x20 }, expected: { 0x2052: 0x15, 0x2053: 0x01 } }
        ]
    },
    {
        id: "exam_sub_8bit",
        title: "2. Subtract Two 8-bit Numbers",
        category: "Arithmetic",
        description: "Write an 8085 assembly language program to subtract the 8-bit number at 2051H from the 8-bit number at 2050H. Store the difference at 2052H and borrow at 2053H.",
        startAddress: 0x2000,
        inputs: [
            { address: 0x2050, value: 0x48, label: "Minuend (A)" },
            { address: 0x2051, value: 0x22, label: "Subtrahend (B)" }
        ],
        outputs: [
            { address: 0x2052, label: "Difference" },
            { address: 0x2053, label: "Borrow (00H or 01H)" }
        ],
        starterCode: `; Experiment 2: Subtract Two 8-bit Numbers
; Inputs: 2050H, 2051H
; Outputs: 2052H (Diff), 2053H (Borrow)

ORG 2000H
MVI C, 00H
LDA 2050H
MOV B, A
LDA 2051H
MOV E, A
MOV A, B
SUB E
JNC NOBORROW
INR C
NOBORROW: STA 2052H
MOV A, C
STA 2053H
HLT
`,
        hint: "Load minuend into A. Load subtrahend into another register. Use SUB instruction. Check CY flag with JNC to track borrow.",
        solution: `ORG 2000H
MVI C, 00H
LDA 2050H
LXI H, 2051H
SUB M
JNC NO_BORROW
INR C
NO_BORROW: STA 2052H
MOV A, C
STA 2053H
HLT`,
        testCases: [
            { inputs: { 0x2050: 0x48, 0x2051: 0x22 }, expected: { 0x2052: 0x26, 0x2053: 0x00 } },
            { inputs: { 0x2050: 0x10, 0x2051: 0x30 }, expected: { 0x2052: 0xE0, 0x2053: 0x01 } }
        ]
    },
    {
        id: "exam_add_16bit",
        title: "3. 16-bit Addition",
        category: "Arithmetic",
        description: "Write an 8085 program to perform 16-bit addition of two numbers located at 2050H (lower byte), 2051H (higher byte) and 2052H (lower byte), 2053H (higher byte). Store the 16-bit sum at 2054H and 2055H, and carry at 2056H.",
        startAddress: 0x2000,
        inputs: [
            { address: 0x2050, value: 0x34, label: "Num1 Lower (34H)" },
            { address: 0x2051, value: 0x12, label: "Num1 Higher (12H)" },
            { address: 0x2052, value: 0x78, label: "Num2 Lower (78H)" },
            { address: 0x2053, value: 0x56, label: "Num2 Higher (56H)" }
        ],
        outputs: [
            { address: 0x2054, label: "Sum Lower" },
            { address: 0x2055, label: "Sum Higher" },
            { address: 0x2056, label: "Carry" }
        ],
        starterCode: `; Experiment 3: 16-bit Addition using DAD
ORG 2000H
MVI C, 00H
LHLD 2050H     ; Load 1st 16-bit number into HL
XCHG           ; Move to DE
LHLD 2052H     ; Load 2nd 16-bit number into HL
DAD D          ; HL = HL + DE
JNC NOCY
INR C
NOCY: SHLD 2054H; Store 16-bit sum at 2054H and 2055H
MOV A, C
STA 2056H      ; Store carry at 2056H
HLT
`,
        hint: "Use LHLD to fetch 16-bit numbers directly into the HL register pair. Use XCHG to put one into DE. Add with DAD D. Check CY with JNC.",
        solution: `ORG 2000H
MVI C, 00H
LHLD 2050H
XCHG
LHLD 2052H
DAD D
JNC SKIP
INR C
SKIP: SHLD 2054H
MOV A, C
STA 2056H
HLT`,
        testCases: [
            { inputs: { 0x2050: 0x34, 0x2051: 0x12, 0x2052: 0x78, 0x2053: 0x56 }, expected: { 0x2054: 0xAC, 0x2055: 0x68, 0x2056: 0x00 } },
            { inputs: { 0x2050: 0x00, 0x2051: 0xFF, 0x2052: 0x00, 0x2053: 0x01 }, expected: { 0x2054: 0x00, 0x2055: 0x00, 0x2056: 0x01 } }
        ]
    },
    {
        id: "exam_largest_array",
        title: "4. Find Largest Number in an Array",
        category: "Arrays & Sorting",
        description: "An array of 8-bit numbers is stored starting from 2051H. The length of the array is given at memory location 2050H. Write an 8085 program to find the largest number and store it at 2060H.",
        startAddress: 0x2000,
        inputs: [
            { address: 0x2050, value: 0x05, label: "Array Length (Count = 5)" },
            { address: 0x2051, value: 0x23, label: "Element 1" },
            { address: 0x2052, value: 0x89, label: "Element 2" },
            { address: 0x2053, value: 0x45, label: "Element 3" },
            { address: 0x2054, value: 0x9B, label: "Element 4 (Largest)" },
            { address: 0x2055, value: 0x12, label: "Element 5" }
        ],
        outputs: [
            { address: 0x2060, label: "Largest Number (Expected 9BH)" }
        ],
        starterCode: `; Experiment 4: Find Largest Number in an Array
ORG 2000H
LDA 2050H      ; Load array count
MOV C, A       ; C = counter
DCR C          ; Comparisons needed = count - 1
LXI H, 2051H   ; HL points to first element
MOV A, M       ; A holds current maximum
LOOP: INX H    ; Move to next element
CMP M          ; Compare current max (A) with next element (M)
JNC AHEAD      ; If A >= M, no change
MOV A, M       ; Else, new max is in M, copy to A
AHEAD: DCR C   ; Decrement loop counter
JNZ LOOP       ; Continue until all elements compared
STA 2060H      ; Store largest element at 2060H
HLT
`,
        hint: "Initialize count in register C. Load the first array element into the Accumulator. Compare with subsequent elements using CMP M. If A < M (Carry flag is set), update A with the new larger number. Repeat until counter C reaches 0.",
        solution: `ORG 2000H
LDA 2050H
MOV C, A
DCR C
LXI H, 2051H
MOV A, M
LOOP: INX H
CMP M
JNC AHEAD
MOV A, M
AHEAD: DCR C
JNZ LOOP
STA 2060H
HLT`,
        testCases: [
            { inputs: { 0x2050: 0x05, 0x2051: 0x23, 0x2052: 0x89, 0x2053: 0x45, 0x2054: 0x9B, 0x2055: 0x12 }, expected: { 0x2060: 0x9B } },
            { inputs: { 0x2050: 0x03, 0x2051: 0x10, 0x2052: 0x50, 0x2053: 0x25 }, expected: { 0x2060: 0x50 } }
        ]
    },
    {
        id: "exam_smallest_array",
        title: "5. Find Smallest Number in an Array",
        category: "Arrays & Sorting",
        description: "An array of 8-bit numbers starts at 2051H. The length of the array is at 2050H. Write an 8085 program to find the smallest number and store it at 2060H.",
        startAddress: 0x2000,
        inputs: [
            { address: 0x2050, value: 0x04, label: "Array Length (Count = 4)" },
            { address: 0x2051, value: 0x45, label: "Element 1" },
            { address: 0x2052, value: 0x12, label: "Element 2" },
            { address: 0x2053, value: 0x07, label: "Element 3 (Smallest)" },
            { address: 0x2054, value: 0x33, label: "Element 4" }
        ],
        outputs: [
            { address: 0x2060, label: "Smallest Number (Expected 07H)" }
        ],
        starterCode: `; Experiment 5: Find Smallest Number in an Array
ORG 2000H
LDA 2050H
MOV C, A
DCR C
LXI H, 2051H
MOV A, M
LOOP: INX H
CMP M
JC AHEAD       ; If A < M, keep current min
MOV A, M       ; Else M is smaller, update min
AHEAD: DCR C
JNZ LOOP
STA 2060H
HLT
`,
        hint: "Similar to finding the largest, but use JC (jump if carry) to maintain the minimum value in Accumulator A.",
        solution: `ORG 2000H
LDA 2050H
MOV C, A
DCR C
LXI H, 2051H
MOV A, M
LOOP: INX H
CMP M
JC AHEAD
MOV A, M
AHEAD: DCR C
JNZ LOOP
STA 2060H
HLT`,
        testCases: [
            { inputs: { 0x2050: 0x04, 0x2051: 0x45, 0x2052: 0x12, 0x2053: 0x07, 0x2054: 0x33 }, expected: { 0x2060: 0x07 } }
        ]
    },
    {
        id: "exam_sum_array",
        title: "6. Calculate Sum of an Array",
        category: "Arrays & Sorting",
        description: "Calculate the sum of a series of 8-bit numbers starting from 2051H. The count is stored at 2050H. Store the lower byte of the sum at 2060H and the carry byte at 2061H.",
        startAddress: 0x2000,
        inputs: [
            { address: 0x2050, value: 0x03, label: "Count (3 elements)" },
            { address: 0x2051, value: 0x50, label: "Element 1" },
            { address: 0x2052, value: 0x70, label: "Element 2" },
            { address: 0x2053, value: 0x60, label: "Element 3" }
        ],
        outputs: [
            { address: 0x2060, label: "Sum Lower (Expected 20H)" },
            { address: 0x2061, label: "Sum Carry (Expected 01H)" }
        ],
        starterCode: `; Experiment 6: Calculate Sum of an Array
ORG 2000H
LDA 2050H
MOV C, A       ; C = counter
MVI A, 00H     ; Clear Sum in A
MVI B, 00H     ; Clear Carry in B
LXI H, 2051H   ; HL points to array
LOOP: ADD M    ; Add array element to A
JNC NOCY
INR B          ; Increment carry count
NOCY: INX H    ; Next element
DCR C
JNZ LOOP
STA 2060H      ; Store Sum
MOV A, B
STA 2061H      ; Store Carry
HLT
`,
        hint: "Keep sum in Accumulator A and carry in register B. Loop over array adding M to A, increment B on carry (JNC NOCY / INR B).",
        solution: `ORG 2000H
LDA 2050H
MOV C, A
MVI A, 00H
MVI B, 00H
LXI H, 2051H
LOOP: ADD M
JNC NOCY
INR B
NOCY: INX H
DCR C
JNZ LOOP
STA 2060H
MOV A, B
STA 2061H
HLT`,
        testCases: [
            { inputs: { 0x2050: 0x03, 0x2051: 0x50, 0x2052: 0x70, 0x2053: 0x60 }, expected: { 0x2060: 0x20, 0x2061: 0x01 } }
        ]
    },
    {
        id: "exam_count_even",
        title: "7. Count Even Numbers in an Array",
        category: "Logical/Bitwise",
        description: "Count how many even numbers are present in an array of numbers starting at 2051H. The length of the array is at 2050H. Store the even count at 2060H.",
        startAddress: 0x2000,
        inputs: [
            { address: 0x2050, value: 0x05, label: "Count (5)" },
            { address: 0x2051, value: 0x12, label: "12H (Even)" },
            { address: 0x2052, value: 0x15, label: "15H (Odd)" },
            { address: 0x2053, value: 0x28, label: "28H (Even)" },
            { address: 0x2054, value: 0x33, label: "33H (Odd)" },
            { address: 0x2055, value: 0x44, label: "44H (Even)" }
        ],
        outputs: [
            { address: 0x2060, label: "Even Count (Expected 03H)" }
        ],
        starterCode: `; Experiment 7: Count Even Numbers in an Array
ORG 2000H
LDA 2050H
MOV C, A       ; C = loop counter
MVI B, 00H     ; B = even counter
LXI H, 2051H
LOOP: MOV A, M
ANI 01H        ; Check LSB (Bit 0)
JNZ SKIP       ; If LSB is 1, number is odd
INR B          ; Else even, increment B
SKIP: INX H
DCR C
JNZ LOOP
MOV A, B
STA 2060H      ; Store count of even numbers
HLT
`,
        hint: "A number is even if its least significant bit (Bit 0) is 0. Use ANI 01H. If Zero flag is set (JZ or JNZ skip), increment the even counter.",
        solution: `ORG 2000H
LDA 2050H
MOV C, A
MVI B, 00H
LXI H, 2051H
LOOP: MOV A, M
ANI 01H
JNZ SKIP
INR B
SKIP: INX H
DCR C
JNZ LOOP
MOV A, B
STA 2060H
HLT`,
        testCases: [
            { inputs: { 0x2050: 0x05, 0x2051: 0x12, 0x2052: 0x15, 0x2053: 0x28, 0x2054: 0x33, 0x2055: 0x44 }, expected: { 0x2060: 0x03 } }
        ]
    },
    {
        id: "exam_count_odd",
        title: "8. Count Odd Numbers in an Array",
        category: "Logical/Bitwise",
        description: "Count how many odd numbers are present in an array of numbers starting at 2051H. The array size is at 2050H. Store the odd count at 2060H.",
        startAddress: 0x2000,
        inputs: [
            { address: 0x2050, value: 0x04, label: "Count (4)" },
            { address: 0x2051, value: 0x05, label: "05H (Odd)" },
            { address: 0x2052, value: 0x08, label: "08H (Even)" },
            { address: 0x2053, value: 0x0B, label: "0BH (Odd)" },
            { address: 0x2054, value: 0x0D, label: "0DH (Odd)" }
        ],
        outputs: [
            { address: 0x2060, label: "Odd Count (Expected 03H)" }
        ],
        starterCode: `; Experiment 8: Count Odd Numbers in an Array
ORG 2000H
LDA 2050H
MOV C, A
MVI B, 00H     ; B = odd counter
LXI H, 2051H
LOOP: MOV A, M
ANI 01H
JZ SKIP        ; If Bit 0 is 0, number is even
INR B          ; Else odd, increment B
SKIP: INX H
DCR C
JNZ LOOP
MOV A, B
STA 2060H
HLT
`,
        hint: "Test Bit 0 using ANI 01H. If result is non-zero (JNZ or JZ skip), increment register B.",
        solution: `ORG 2000H
LDA 2050H
MOV C, A
MVI B, 00H
LXI H, 2051H
LOOP: MOV A, M
ANI 01H
JZ SKIP
INR B
SKIP: INX H
DCR C
JNZ LOOP
MOV A, B
STA 2060H
HLT`,
        testCases: [
            { inputs: { 0x2050: 0x04, 0x2051: 0x05, 0x2052: 0x08, 0x2053: 0x0B, 0x2054: 0x0D }, expected: { 0x2060: 0x03 } }
        ]
    },
    {
        id: "exam_block_transfer",
        title: "9. Transfer a Block of Memory",
        category: "Data Transfer",
        description: "Write an 8085 program to transfer a block of data bytes from source address starting at 2050H to destination address starting at 2070H. Count is stored at 2040H.",
        startAddress: 0x2000,
        inputs: [
            { address: 0x2040, value: 0x03, label: "Block Count (3 bytes)" },
            { address: 0x2050, value: 0xAA, label: "Byte 1" },
            { address: 0x2051, value: 0xBB, label: "Byte 2" },
            { address: 0x2052, value: 0xCC, label: "Byte 3" }
        ],
        outputs: [
            { address: 0x2070, label: "Dest Byte 1 (Expected AAH)" },
            { address: 0x2071, label: "Dest Byte 2 (Expected BBH)" },
            { address: 0x2072, label: "Dest Byte 3 (Expected CCH)" }
        ],
        starterCode: `; Experiment 9: Block Transfer of Data
ORG 2000H
LDA 2040H
MOV C, A       ; C = count
LXI H, 2050H   ; HL = source pointer
LXI D, 2070H   ; DE = destination pointer
LOOP: MOV A, M ; Read byte from source
STAX D         ; Write byte to destination
INX H          ; Next source address
INX D          ; Next destination address
DCR C          ; Decrement counter
JNZ LOOP
HLT
`,
        hint: "Use HL register pair for source pointer and DE pair for destination pointer. Use MOV A, M to read and STAX D to write to destination.",
        solution: `ORG 2000H
LDA 2040H
MOV C, A
LXI H, 2050H
LXI D, 2070H
LOOP: MOV A, M
STAX D
INX H
INX D
DCR C
JNZ LOOP
HLT`,
        testCases: [
            { inputs: { 0x2040: 0x03, 0x2050: 0xAA, 0x2051: 0xBB, 0x2052: 0xCC }, expected: { 0x2070: 0xAA, 0x2071: 0xBB, 0x2072: 0xCC } }
        ]
    },
    {
        id: "exam_bubble_sort_asc",
        title: "10. Sort Numbers in Ascending Order",
        category: "Arrays & Sorting",
        description: "Sort an array of 8-bit numbers in ascending order using Bubble Sort. Array count is at 2050H and elements start at 2051H. The sorted array should be stored in-place starting at 2051H.",
        startAddress: 0x2000,
        inputs: [
            { address: 0x2050, value: 0x04, label: "Count (4)" },
            { address: 0x2051, value: 0x44, label: "Element 1" },
            { address: 0x2052, value: 0x11, label: "Element 2" },
            { address: 0x2053, value: 0x33, label: "Element 3" },
            { address: 0x2054, value: 0x22, label: "Element 4" }
        ],
        outputs: [
            { address: 0x2051, label: "Sorted 1 (11H)" },
            { address: 0x2052, label: "Sorted 2 (22H)" },
            { address: 0x2053, label: "Sorted 3 (33H)" },
            { address: 0x2054, label: "Sorted 4 (44H)" }
        ],
        starterCode: `; Experiment 10: Sort in Ascending Order (Bubble Sort)
ORG 2000H
LDA 2050H
DCR A
MOV B, A       ; Outer loop counter = N - 1
OUTER: MOV C, B; Inner loop counter
LXI H, 2051H   ; HL points to first element
INNER: MOV A, M; A = current element
INX H
CMP M          ; Compare with next element
JC NO_SWAP     ; If A < M, already in order
JZ NO_SWAP     ; If equal, no swap
MOV D, M       ; Swap elements
MOV M, A
DCX H
MOV M, D
INX H
NO_SWAP: DCR C
JNZ INNER
DCR B
JNZ OUTER
HLT
`,
        hint: "Bubble sort uses two nested loops. Compare adjacent elements using CMP M. If current element is greater than next (JC is not taken), swap them using register D.",
        solution: `ORG 2000H
LDA 2050H
DCR A
MOV B, A
OUTER: MOV C, B
LXI H, 2051H
INNER: MOV A, M
INX H
CMP M
JC NO_SWAP
JZ NO_SWAP
MOV D, M
MOV M, A
DCX H
MOV M, D
INX H
NO_SWAP: DCR C
JNZ INNER
DCR B
JNZ OUTER
HLT`,
        testCases: [
            { inputs: { 0x2050: 0x04, 0x2051: 0x44, 0x2052: 0x11, 0x2053: 0x33, 0x2054: 0x22 }, expected: { 0x2051: 0x11, 0x2052: 0x22, 0x2053: 0x33, 0x2054: 0x44 } }
        ]
    },
    {
        id: "exam_bubble_sort_desc",
        title: "11. Sort Numbers in Descending Order",
        category: "Arrays & Sorting",
        description: "Sort an array of 8-bit numbers in descending order. Array count is at 2050H and numbers start at 2051H.",
        startAddress: 0x2000,
        inputs: [
            { address: 0x2050, value: 0x03, label: "Count (3)" },
            { address: 0x2051, value: 0x15, label: "Element 1" },
            { address: 0x2052, value: 0x45, label: "Element 2" },
            { address: 0x2053, value: 0x25, label: "Element 3" }
        ],
        outputs: [
            { address: 0x2051, label: "Sorted 1 (45H)" },
            { address: 0x2052, label: "Sorted 2 (25H)" },
            { address: 0x2053, label: "Sorted 3 (15H)" }
        ],
        starterCode: `; Experiment 11: Sort in Descending Order
ORG 2000H
LDA 2050H
DCR A
MOV B, A
OUTER: MOV C, B
LXI H, 2051H
INNER: MOV A, M
INX H
CMP M
JNC NO_SWAP    ; If A >= M, already descending
MOV D, M
MOV M, A
DCX H
MOV M, D
INX H
NO_SWAP: DCR C
JNZ INNER
DCR B
JNZ OUTER
HLT
`,
        hint: "Swap adjacent elements if the earlier element is smaller than the latter element (JNC NO_SWAP).",
        solution: `ORG 2000H
LDA 2050H
DCR A
MOV B, A
OUTER: MOV C, B
LXI H, 2051H
INNER: MOV A, M
INX H
CMP M
JNC NO_SWAP
MOV D, M
MOV M, A
DCX H
MOV M, D
INX H
NO_SWAP: DCR C
JNZ INNER
DCR B
JNZ OUTER
HLT`,
        testCases: [
            { inputs: { 0x2050: 0x03, 0x2051: 0x15, 0x2052: 0x45, 0x2053: 0x25 }, expected: { 0x2051: 0x45, 0x2052: 0x25, 0x2053: 0x15 } }
        ]
    },
    {
        id: "exam_multiply_8bit",
        title: "12. Multiply Two 8-bit Numbers",
        category: "Arithmetic",
        description: "Write an 8085 program to multiply two 8-bit numbers at 2050H and 2051H using successive addition. Store the 16-bit product at 2052H (lower byte) and 2053H (higher byte).",
        startAddress: 0x2000,
        inputs: [
            { address: 0x2050, value: 0x05, label: "Multiplicand (05H)" },
            { address: 0x2051, value: 0x04, label: "Multiplier (04H)" }
        ],
        outputs: [
            { address: 0x2052, label: "Product Lower (14H = 20)" },
            { address: 0x2053, label: "Product Higher (00H)" }
        ],
        starterCode: `; Experiment 12: Multiplication via Successive Addition
ORG 2000H
LDA 2050H
MOV E, A       ; E = multiplicand
LDA 2051H
MOV C, A       ; C = multiplier (counter)
MVI A, 00H     ; Lower product
MVI D, 00H     ; Higher product
CPI 00H        ; Check if multiplier is 0
JZ DONE
LOOP: ADD E    ; Add multiplicand
JNC NOCY
INR D          ; Increment upper byte on carry
NOCY: DCR C
JNZ LOOP
DONE: STA 2052H; Store lower product
MOV A, D
STA 2053H      ; Store higher product
HLT
`,
        hint: "Multiplication M * N is adding M to itself N times. Use register C as multiplier counter. Add multiplicand E to accumulator A in a loop.",
        solution: `ORG 2000H
LDA 2050H
MOV E, A
LDA 2051H
MOV C, A
MVI A, 00H
MVI D, 00H
CPI 00H
JZ DONE
LOOP: ADD E
JNC NOCY
INR D
NOCY: DCR C
JNZ LOOP
DONE: STA 2052H
MOV A, D
STA 2053H
HLT`,
        testCases: [
            { inputs: { 0x2050: 0x05, 0x2051: 0x04 }, expected: { 0x2052: 0x14, 0x2053: 0x00 } },
            { inputs: { 0x2050: 0x20, 0x2051: 0x10 }, expected: { 0x2052: 0x00, 0x2053: 0x02 } }
        ]
    },
    {
        id: "exam_divide_8bit",
        title: "13. Divide Two 8-bit Numbers",
        category: "Arithmetic",
        description: "Write an 8085 program to divide the 8-bit number at 2050H (Dividend) by the number at 2051H (Divisor) using successive subtraction. Store the Quotient at 2052H and Remainder at 2053H.",
        startAddress: 0x2000,
        inputs: [
            { address: 0x2050, value: 0x0E, label: "Dividend (14 = 0EH)" },
            { address: 0x2051, value: 0x03, label: "Divisor (3 = 03H)" }
        ],
        outputs: [
            { address: 0x2052, label: "Quotient (Expected 04H)" },
            { address: 0x2053, label: "Remainder (Expected 02H)" }
        ],
        starterCode: `; Experiment 13: Division via Successive Subtraction
ORG 2000H
LDA 2050H      ; A = Dividend
MOV B, A
LDA 2051H      ; C = Divisor
MOV C, A
MVI D, 00H     ; D = Quotient counter
MOV A, B
LOOP: CMP C    ; Compare Dividend with Divisor
JC DONE        ; If Dividend < Divisor, division done
SUB C          ; Subtract divisor
INR D          ; Increment quotient
JMP LOOP
DONE: STA 2053H; Remainder is in A
MOV A, D
STA 2052H      ; Quotient is in D
HLT
`,
        hint: "Subtract the divisor from the dividend repeatedly until the dividend is less than the divisor (CMP C and JC DONE). Each subtraction increments the quotient counter.",
        solution: `ORG 2000H
LDA 2050H
MOV B, A
LDA 2051H
MOV C, A
MVI D, 00H
MOV A, B
LOOP: CMP C
JC DONE
SUB C
INR D
JMP LOOP
DONE: STA 2053H
MOV A, D
STA 2052H
HLT`,
        testCases: [
            { inputs: { 0x2050: 0x0E, 0x2051: 0x03 }, expected: { 0x2052: 0x04, 0x2053: 0x02 } },
            { inputs: { 0x2050: 0x25, 0x2051: 0x05 }, expected: { 0x2052: 0x07, 0x2053: 0x02 } }
        ]
    },
    {
        id: "exam_1s_complement",
        title: "14. Find 1's Complement",
        category: "Logical/Bitwise",
        description: "Write an 8085 program to find the 1's complement of an 8-bit number stored at 2050H. Store the result at 2051H.",
        startAddress: 0x2000,
        inputs: [
            { address: 0x2050, value: 0x55, label: "Input Number (55H)" }
        ],
        outputs: [
            { address: 0x2051, label: "1's Complement (Expected AAH)" }
        ],
        starterCode: `; Experiment 14: 1's Complement using CMA
ORG 2000H
LDA 2050H
CMA            ; Invert all bits of Accumulator
STA 2051H
HLT
`,
        hint: "The CMA instruction inverts all bits (0s become 1s, 1s become 0s) in the Accumulator without affecting any flags.",
        solution: `ORG 2000H
LDA 2050H
CMA
STA 2051H
HLT`,
        testCases: [
            { inputs: { 0x2050: 0x55 }, expected: { 0x2051: 0xAA } },
            { inputs: { 0x2050: 0x00 }, expected: { 0x2051: 0xFF } }
        ]
    },
    {
        id: "exam_2s_complement",
        title: "15. Find 2's Complement",
        category: "Logical/Bitwise",
        description: "Write an 8085 program to find the 2's complement of an 8-bit number stored at 2050H. Store the result at 2051H.",
        startAddress: 0x2000,
        inputs: [
            { address: 0x2050, value: 0x05, label: "Input Number (05H)" }
        ],
        outputs: [
            { address: 0x2051, label: "2's Complement (Expected FBH)" }
        ],
        starterCode: `; Experiment 15: 2's Complement
ORG 2000H
LDA 2050H
CMA            ; 1's complement
INR A          ; Add 1 to get 2's complement
STA 2051H
HLT
`,
        hint: "2's complement is 1's complement + 1. Use CMA followed by INR A (or ADI 01H).",
        solution: `ORG 2000H
LDA 2050H
CMA
INR A
STA 2051H
HLT`,
        testCases: [
            { inputs: { 0x2050: 0x05 }, expected: { 0x2051: 0xFB } },
            { inputs: { 0x2050: 0x10 }, expected: { 0x2051: 0xF0 } }
        ]
    },
    {
        id: "exam_count_ones",
        title: "16. Count Number of 1s (Set Bits) in a Byte",
        category: "Logical/Bitwise",
        description: "Write an 8085 program to count the number of 1s (set bits) in an 8-bit number stored at 2050H. Store the count at 2051H.",
        startAddress: 0x2000,
        inputs: [
            { address: 0x2050, value: 0xA7, label: "Input (A7H = 10100111b -> 5 ones)" }
        ],
        outputs: [
            { address: 0x2051, label: "Count of 1s (Expected 05H)" }
        ],
        starterCode: `; Experiment 16: Count Number of 1s in a Byte
ORG 2000H
LDA 2050H
MVI B, 08H     ; 8-bit counter
MVI C, 00H     ; 1s counter
LOOP: RLC      ; Rotate left: bit 7 goes into Carry flag
JNC SKIP
INR C          ; Carry is 1, increment count
SKIP: DCR B
JNZ LOOP
MOV A, C
STA 2051H
HLT
`,
        hint: "Use RLC (or RAR) 8 times to push each bit into the Carry flag. If Carry is 1 (JNC skip / INR C), increment the counter.",
        solution: `ORG 2000H
LDA 2050H
MVI B, 08H
MVI C, 00H
LOOP: RLC
JNC SKIP
INR C
SKIP: DCR B
JNZ LOOP
MOV A, C
STA 2051H
HLT`,
        testCases: [
            { inputs: { 0x2050: 0xA7 }, expected: { 0x2051: 0x05 } },
            { inputs: { 0x2050: 0xFF }, expected: { 0x2051: 0x08 } },
            { inputs: { 0x2050: 0x00 }, expected: { 0x2051: 0x00 } }
        ]
    },
    {
        id: "exam_linear_search",
        title: "17. Search for a Number in an Array",
        category: "Arrays & Sorting",
        description: "Write an 8085 program to search for a key element in an array. Array count is at 2050H, search key is at 2051H, and array begins at 2052H. If found, store 01H (or index) at 2060H; if not found, store 00H at 2060H.",
        startAddress: 0x2000,
        inputs: [
            { address: 0x2050, value: 0x04, label: "Count (4)" },
            { address: 0x2051, value: 0x35, label: "Key to Search (35H)" },
            { address: 0x2052, value: 0x10, label: "Element 1" },
            { address: 0x2053, value: 0x20, label: "Element 2" },
            { address: 0x2054, value: 0x35, label: "Element 3 (Matches!)" },
            { address: 0x2055, value: 0x40, label: "Element 4" }
        ],
        outputs: [
            { address: 0x2060, label: "Found Status (01H = Found, 00H = Not Found)" }
        ],
        starterCode: `; Experiment 17: Linear Search
ORG 2000H
LDA 2050H
MOV C, A       ; C = count
LDA 2051H
MOV B, A       ; B = key
LXI H, 2052H   ; HL points to array
LOOP: MOV A, M
CMP B          ; Compare array element with key
JZ FOUND
INX H
DCR C
JNZ LOOP
; Not found
MVI A, 00H
STA 2060H
HLT
FOUND: MVI A, 01H
STA 2060H
HLT
`,
        hint: "Store search key in register B. Compare each array element with B using CMP B. If JZ triggers, jump to FOUND label and store 01H. If loop terminates without match, store 00H.",
        solution: `ORG 2000H
LDA 2050H
MOV C, A
LDA 2051H
MOV B, A
LXI H, 2052H
LOOP: MOV A, M
CMP B
JZ FOUND
INX H
DCR C
JNZ LOOP
MVI A, 00H
STA 2060H
HLT
FOUND: MVI A, 01H
STA 2060H
HLT`,
        testCases: [
            { inputs: { 0x2050: 0x04, 0x2051: 0x35, 0x2052: 0x10, 0x2053: 0x20, 0x2054: 0x35, 0x2055: 0x40 }, expected: { 0x2060: 0x01 } },
            { inputs: { 0x2050: 0x03, 0x2051: 0x99, 0x2052: 0x10, 0x2053: 0x20, 0x2054: 0x30 }, expected: { 0x2060: 0x00 } }
        ]
    },
    {
        id: "exam_bcd_add",
        title: "18. Decimal (BCD) Addition using DAA",
        category: "Arithmetic",
        description: "Write an 8085 program to perform decimal (BCD) addition of two two-digit BCD numbers stored at 2050H and 2051H. Store the BCD sum at 2052H and carry at 2053H.",
        startAddress: 0x2000,
        inputs: [
            { address: 0x2050, value: 0x48, label: "BCD Num 1 (48 in BCD)" },
            { address: 0x2051, value: 0x37, label: "BCD Num 2 (37 in BCD)" }
        ],
        outputs: [
            { address: 0x2052, label: "BCD Sum (Expected 85 in BCD)" },
            { address: 0x2053, label: "BCD Carry (00H or 01H)" }
        ],
        starterCode: `; Experiment 18: BCD Addition using DAA
ORG 2000H
MVI C, 00H
LDA 2050H
MOV B, A
LDA 2051H
ADD B
DAA            ; Decimal Adjust Accumulator
JNC SKIP
INR C
SKIP: STA 2052H
MOV A, C
STA 2053H
HLT
`,
        hint: "Add numbers with ADD B, then immediately call DAA (Decimal Adjust Accumulator) to convert the binary sum into valid BCD. Check carry with JNC.",
        solution: `ORG 2000H
MVI C, 00H
LDA 2050H
MOV B, A
LDA 2051H
ADD B
DAA
JNC SKIP
INR C
SKIP: STA 2052H
MOV A, C
STA 2053H
HLT`,
        testCases: [
            { inputs: { 0x2050: 0x48, 0x2051: 0x37 }, expected: { 0x2052: 0x85, 0x2053: 0x00 } },
            { inputs: { 0x2050: 0x89, 0x2051: 0x25 }, expected: { 0x2052: 0x14, 0x2053: 0x01 } }
        ]
    }
];

class ExamEvaluator {
    constructor(cpu, assembler) {
        this.cpu = cpu;
        this.assembler = assembler;
    }

    /**
     * Evaluates student's code against a given question's test cases
     * @param {Object} question - The exam question object
     * @param {string} studentCode - The assembly source entered by student
     * @returns {Object} evaluation report
     */
    evaluate(question, studentCode) {
        // Step 1: Assemble code
        const asmResult = this.assembler.assemble(studentCode, question.startAddress || 0x2000);
        if (!asmResult.success) {
            return {
                passed: false,
                type: 'SYNTAX_ERROR',
                message: "Assembly Failed: Please fix the errors in your program before running.",
                details: asmResult.errors.map(e => `Line ${e.line}: ${e.message}`)
            };
        }

        // Test against all test cases for this question
        const testResults = [];
        let allPassed = true;

        for (let i = 0; i < question.testCases.length; i++) {
            const tc = question.testCases[i];

            // Reset CPU
            this.cpu.reset(asmResult.startAddress);
            this.cpu.clearMemory();

            // Load assembled machine code into memory
            for (const [addr, byte] of Object.entries(asmResult.machineCode)) {
                this.cpu.writeByte(parseInt(addr, 10), byte);
            }

            // Load test case inputs
            for (const [addr, val] of Object.entries(tc.inputs)) {
                this.cpu.writeByte(parseInt(addr, 10), val);
            }

            // Execute program
            const execResult = this.cpu.run(50000);

            if (execResult.timeout) {
                allPassed = false;
                testResults.push({
                    testCaseIndex: i + 1,
                    passed: false,
                    reason: "Infinite Loop: Execution exceeded 50,000 steps without reaching HLT."
                });
                break;
            }

            if (!execResult.halted) {
                allPassed = false;
                testResults.push({
                    testCaseIndex: i + 1,
                    passed: false,
                    reason: "Execution ended without reaching HLT instruction."
                });
                break;
            }

            // Verify expected outputs
            const mismatches = [];
            for (const [addr, expectedVal] of Object.entries(tc.expected)) {
                const address = parseInt(addr, 10);
                const actualVal = this.cpu.readByte(address);
                if (actualVal !== expectedVal) {
                    mismatches.push({
                        address: address.toString(16).toUpperCase().padStart(4, '0') + 'H',
                        expected: expectedVal.toString(16).toUpperCase().padStart(2, '0') + 'H',
                        actual: actualVal.toString(16).toUpperCase().padStart(2, '0') + 'H'
                    });
                }
            }

            if (mismatches.length === 0) {
                testResults.push({
                    testCaseIndex: i + 1,
                    passed: true,
                    steps: execResult.stepsExecuted
                });
            } else {
                allPassed = false;
                testResults.push({
                    testCaseIndex: i + 1,
                    passed: false,
                    mismatches
                });
            }
        }

        if (allPassed) {
            return {
                passed: true,
                message: `🎉 PASSED! All ${question.testCases.length} test case(s) produced the exact expected results in memory!`,
                testResults
            };
        } else {
            return {
                passed: false,
                type: 'LOGIC_MISMATCH',
                message: "Test Failed: One or more memory locations did not match the expected values.",
                testResults
            };
        }
    }
}

// Export for browser or node
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { EXAM_QUESTIONS, ExamEvaluator };
}
