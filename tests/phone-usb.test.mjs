import assert from "node:assert/strict";
import { createServer } from "node:net";
import { test } from "node:test";
import { listening, phoneSerial } from "../scripts/phone-usb.mjs";

test("selects the sole authorized phone with CRLF adb output", () => {
  assert.equal(
    phoneSerial("List of devices attached\r\nexample-phone\tdevice\r\n\r\n"),
    "example-phone",
  );
});
test("refuses unauthorized or offline phones", () => {
  for (const state of ["unauthorized", "offline"])
    assert.throws(
      () => phoneSerial(`List of devices attached\nexample-phone\t${state}\n`),
      /Accept USB debugging/,
    );
});
test("refuses no phone or ambiguous multiple-device selection", () => {
  for (const output of [
    "List of devices attached\n",
    "first\tdevice\nsecond\tdevice\n",
  ])
    assert.throws(() => phoneSerial(output), /exactly one/);
});
test("readiness probes only connect without HTTP or application requests", async () => {
  let bytes = 0;
  const server = createServer((socket) =>
    socket.on("data", (data) => {
      bytes += data.length;
    }),
  );
  await new Promise((done) => server.listen(0, "127.0.0.1", done));
  const port = server.address().port;
  try {
    assert.equal(await listening(port), true);
    await new Promise((done) => setTimeout(done, 10));
    assert.equal(bytes, 0);
  } finally {
    await new Promise((done) => server.close(done));
  }
  assert.equal(await listening(port), false);
});
