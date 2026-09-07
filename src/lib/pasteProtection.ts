import "server-only";

import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const PIN_PATTERN = /^\d{6}$/;

export function isValidPin(pin: unknown): pin is string {
  return typeof pin === "string" && PIN_PATTERN.test(pin);
}

export function hashPin(pin: string) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = scryptSync(pin, salt, 64);

  return { pinHash: derivedKey.toString("hex"), pinSalt: salt };
}

export function verifyPin(pin: string, pinHash: string, pinSalt: string) {
  const expected = Buffer.from(pinHash, "hex");
  const actual = scryptSync(pin, pinSalt, 64);

  if (expected.length !== actual.length) {
    return false;
  }

  return timingSafeEqual(actual, expected);
}