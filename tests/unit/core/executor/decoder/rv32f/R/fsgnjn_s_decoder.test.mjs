import { decode_test } from "../common.mjs";

Deno.test("decode_instruction - fsgnjn.s instruction 1", () =>
    decode_test("00100000001000001001000001010011", "fsgnjn.s f0 f1 f2"),
);

Deno.test("decode_instruction - fsgnjn.s instruction 2", () =>
    decode_test("00100000010100100001000111010011", "fsgnjn.s f3 f4 f5"),
);

Deno.test("decode_instruction - fsgnjn.s instruction 3", () =>
    decode_test("00100000000000000001000001010011", "fsgnjn.s f0 f0 f0"),
);

Deno.test("decode_instruction - fsgnjn.s instruction 4", () =>
    decode_test("00100001111111111001111111010011", "fsgnjn.s f31 f31 f31"),
);

Deno.test("decode_instruction - fsgnjn.s instruction 5", () =>
    decode_test("00100001111100000001000001010011", "fsgnjn.s f0 f0 f31"),
);

Deno.test("decode_instruction - fsgnjn.s instruction 6", () =>
    decode_test("00100000000011111001111111010011", "fsgnjn.s f31 f31 f0"),
);

Deno.test("decode_instruction - fsgnjn.s instruction 7", () =>
    decode_test("00100000000011111001000001010011", "fsgnjn.s f0 f31 f0"),
);

Deno.test("decode_instruction - fsgnjn.s instruction 8", () =>
    decode_test("00100001111100000001111111010011", "fsgnjn.s f31 f0 f31"),
);

Deno.test("decode_instruction - fsgnjn.s instruction 9", () =>
    decode_test("00100000001100010001000011010011", "fsgnjn.s f1 f2 f3"),
);

Deno.test("decode_instruction - fsgnjn.s instruction 10", () =>
    decode_test("00100001111010100001010101010011", "fsgnjn.s f10 f20 f30"),
);

Deno.test("decode_instruction - fsgnjn.s instruction 11", () =>
    decode_test("00100001010101110001001111010011", "fsgnjn.s f7 f14 f21"),
);

Deno.test("decode_instruction - fsgnjn.s instruction 12", () =>
    decode_test("00100000011100110001001101010011", "fsgnjn.s f6 f6 f7"),
);

Deno.test("decode_instruction - fsgnjn.s instruction 13", () =>
    decode_test("00100000100001001001010001010011", "fsgnjn.s f8 f9 f8"),
);

Deno.test("decode_instruction - fsgnjn.s instruction 14", () =>
    decode_test("00100000101001010001010101010011", "fsgnjn.s f10 f10 f10"),
);

Deno.test("decode_instruction - fsgnjn.s instruction 15", () =>
    decode_test("00100001000110000001011111010011", "fsgnjn.s f15 f16 f17"),
);

Deno.test("decode_instruction - fsgnjn.s instruction 16", () =>
    decode_test("00100001101011001001110001010011", "fsgnjn.s f24 f25 f26"),
);

Deno.test("decode_instruction - fsgnjn.s instruction 17", () =>
    decode_test("00100000111001101001011011010011", "fsgnjn.s f13 f13 f14"),
);

Deno.test("decode_instruction - fsgnjn.s instruction 18", () =>
    decode_test("00100001011010111001101101010011", "fsgnjn.s f22 f23 f22"),
);

Deno.test("decode_instruction - fsgnjn.s instruction 19", () =>
    decode_test("00100001111000001001100101010011", "fsgnjn.s f18 f1 f30"),
);

Deno.test("decode_instruction - fsgnjn.s instruction 20", () =>
    decode_test("00100000000111111001100111010011", "fsgnjn.s f19 f31 f1"),
);

Deno.test("decode_instruction - fsgnjn.s instruction 21", () =>
    decode_test("00100000001011101001111011010011", "fsgnjn.s f29 f29 f2"),
);

Deno.test("decode_instruction - fsgnjn.s instruction 22", () =>
    decode_test("00100000101100010001010111010011", "fsgnjn.s f11 f2 f11"),
);
