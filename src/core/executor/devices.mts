/*
 *  Copyright 2018-2025 Felix Garcia Carballeira, Diego Camarmas Alonso,
 *                      Alejandro Calderon Mateos, Luis Daniel Casais Mezquida
 *
 *  This file is part of CREATOR.
 *
 *  CREATOR is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU Lesser General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  CREATOR is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU Lesser General Public License for more details.
 *
 *  You should have received a copy of the GNU Lesser General Public License
 *  along with CREATOR.  If not, see <http://www.gnu.org/licenses/>.
 *
 */

import { writeMemory, readMemory } from "../memory/memoryOperations.mjs";
import { packExecute } from "./executor.mjs";
import { creator_ga } from "../utils/creator_ga.mjs";
import { status, WORDSIZE } from "../core.mjs";
import { keyboard_read, display_print } from "./IO.mjs";
import { full_print, float2bin, double2bin } from "../utils/utils.mjs";
import { SYSCALL } from "../capi/syscall.mjs";
import { MEM } from "../capi/memory.mjs";

/**
 * A CREATOR device.
 *
 * @field {number} ctrl_addr: Address of the control register.
 * @field {number} status_addr: Address of the status register.
 * @field {Object} data: Device data range.
 * @field {number} data.start: Address of the start of the data range.
 * @field {number} data.end: Address of the end of the data range.
 * @field {boolean} [enabled=true]: Status of the device.
 *
 * @method callback: Function defining the behaviour of the device.
 *
 */
abstract class Device {
    readonly ctrl_addr: number;
    readonly status_addr: number;
    readonly data: { start: number; end: number };
    enabled: boolean;

    constructor(
        // we use destructuring in order to have a cleaner interface later
        {
            ctrl_addr,
            status_addr,
            data: { start, end },
            enabled = true,
        }: {
            ctrl_addr: number;
            status_addr: number;
            data: { start: number; end: number };
            enabled: boolean;
        },
    ) {
        this.ctrl_addr = ctrl_addr;
        this.status_addr = status_addr;
        this.data = { start, end };
        this.enabled = enabled;
    }

    /**
     * Checks whether the specified address belongs to the device.
     *
     * @param {bigint} addr - Address to check.
     *
     * @return {boolean} `true` if it belongs to the device, else `false`.
     *
     */
    isDeviceAddr(addr: number): boolean {
        return (
            addr === this.ctrl_addr ||
            addr === this.status_addr ||
            (this.data.start <= addr && addr < this.data.end)
        );
    }

    /**
     * Resets the device by setting the control register to 0.
     *
     */
    reset(): void {
        writeMemory(0, this.ctrl_addr, "w");
    }

    /**
     * Called once per cycle, if the device is enabled, defines the behaviour
     * of the device.
     *
     */
    abstract handler(): void;
}

/**
 * A device for interacting with the CREATOR console.
 *
 */
class ConsoleDevice extends Device {
    /**
     * Performs a generic console write.
     *
     * @param {string} type - Datatype to write.
     *
     */
    static #write(data_addr: number, type: string): void {
        creator_ga(
            "execute",
            "execute.syscall",
            "execute.syscall.print_" + type,
        ); // google analytics

        display_print(full_print(readMemory(data_addr, type), null, false));
    }

    /**
     * Performs actions to prepare a console read.
     *
     * @param {string} type - Datatype to read.
     *
     */
    static #prepareRead(type: string): void {
        creator_ga(
            "execute",
            "execute.syscall",
            "execute.syscall.read_" + type,
        ); // google analytics

        // scroll into keyboard input
        if (document !== undefined) {
            document.getElementById("enter_keyboard")!.scrollIntoView();
        }

        // stop program to wait for read
        status.run_program = 3;
    }

    // eslint-disable-next-line max-lines-per-function
    override handler(): void {
        switch (MEM.read(this.ctrl_addr, "w")) {
            case 1n: // print int
                ConsoleDevice.#write(this.data.start, "int");
                break;

            case 2n: // print float
                ConsoleDevice.#write(this.data.start, "float");
                break;

            case 3n: // print double
                ConsoleDevice.#write(this.data.start, "double");
                break;

            case 4n: // print string
                ConsoleDevice.#write(
                    Number(readMemory(this.data.start, "w")),
                    "string",
                );
                break;

            case 5n: // read int
                ConsoleDevice.#prepareRead("int");

                keyboard_read((keystroke: string, _params: unknown) =>
                    writeMemory(
                        parseInt(keystroke, 10),
                        this.data.start,
                        "integer",
                    ),
                ); // it's ugly, I know, but the alternative is rewriting the function

                break;

            case 6n: // read float
                ConsoleDevice.#prepareRead("float");

                keyboard_read((keystroke: string, _params: unknown) =>
                    writeMemory(
                        parseInt(float2bin(parseFloat(keystroke)), 2),
                        this.data.start,
                        "float",
                    ),
                );

                break;

            case 7n: // read double
                ConsoleDevice.#prepareRead("double");

                keyboard_read((keystroke: string, _params: unknown) =>
                    writeMemory(
                        parseInt(double2bin(parseFloat(keystroke)), 2),
                        this.data.start,
                        "double",
                    ),
                );

                break;

            case 8n: {
                // read string
                ConsoleDevice.#prepareRead("string");

                // get string addr & max length
                const addr = readMemory(this.data.start, "word");
                const length = Number(
                    readMemory(this.data.start + WORDSIZE / 8, "word"),
                );

                // read & store in specified addr
                keyboard_read(
                    (keystroke: string, params: { addr: bigint }) => {
                        writeMemory(
                            keystroke.slice(0, length),
                            params.addr,
                            "string",
                        );
                    },
                    {
                        // params
                        length,
                        addr,
                    },
                );

                break;
            }

            case 11n: // print char
                ConsoleDevice.#write(this.data.start, "char");
                break;

            case 12n: // read char
                ConsoleDevice.#prepareRead("char");

                keyboard_read((keystroke: string, _params: unknown) =>
                    writeMemory(keystroke, this.data.start, "char"),
                );

                break;

            default:
                break;
        }

        this.reset();
    }
}

class OSDriver extends Device {
    override handler() {
        switch (MEM.read(this.ctrl_addr, "w")) {
            case 9n: {
                // sbrk
                creator_ga(
                    "execute",
                    "execute.syscall",
                    "execute.syscall.sbrk",
                ); // google analytics

                // get size
                const size = readMemory(this.data.start, "integer");
                if (size < 0) {
                    throw packExecute(
                        true,
                        "capi_syscall: negative size",
                        "danger",
                        null,
                    );
                }

                // malloc
                const addr = MEM.alloc(size);

                // save addr
                writeMemory(addr, this.data.start, "word");

                break;
            }

            case 10n: // exit
                SYSCALL.exit();

                break;

            default:
                break;
        }

        this.reset();
    }
}

// { <id>: Device, ...}
const devices = new Map<string, Device>([
    [
        "console",
        new ConsoleDevice({
            ctrl_addr: 0xf0000000,
            status_addr: 0xf0000004,
            data: {
                start: 0xf0000008,
                end: 0xf000000f,
            },
            enabled: true,
        }),
    ],
    [
        "os",
        new OSDriver({
            ctrl_addr: 0xf0000010,
            status_addr: 0xf0000014,
            data: {
                start: 0xf0000018,
                end: 0xf000001f,
            },
            enabled: true,
        }),
    ],
]);

/* Memory */

/**
 * Checks if an address is a device address.
 *
 * @param {bigint} addr Address to check.
 *
 * @return {string, null} ID of the device that the address belongs to, else `null`.
 */
export function checkDeviceAddr(addr: number): string | null {
    for (const [id, device] of devices) {
        if (!device.enabled) continue;

        if (device.isDeviceAddr(addr)) return id;
    }

    return null;
}

/* Handlers */

/**
 * 'Wakes up' a device, by executing its callback function.
 *
 * @param {string} id - ID of the device.
 *
 */
export function wakeDevice(id: string): void {
    const device = devices.get(id);
    if (device !== undefined) device.handler();
}

/**
 * Calls all the devices' handlers.
 */
export function handleDevices(): void {
    for (const [_id, device] of devices) {
        if (device.enabled) device.handler();
    }
}
