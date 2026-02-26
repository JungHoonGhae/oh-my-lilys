import { test, expect, describe } from "bun:test";
import { isKeychainSupported } from "../utils/keychain.js";

describe("keychain", () => {
  test("isKeychainSupported returns true on macOS", () => {
    const supported = isKeychainSupported();
    if (process.platform === "darwin") {
      expect(supported).toBe(true);
    } else {
      expect(supported).toBe(false);
    }
  });
});
