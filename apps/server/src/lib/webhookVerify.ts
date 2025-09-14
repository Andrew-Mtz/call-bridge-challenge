import nacl from "tweetnacl";
import { env } from "@config";

function b64ToUint8(b64: string) {
  return new Uint8Array(Buffer.from(b64, "base64"));
}
function hexToUint8(hex: string) {
  return new Uint8Array(hex.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)));
}

export function verifyTelnyxSignature(
  rawBody: Buffer,
  headers: Record<string, string | string[] | undefined>
) {
  const ts = String(headers["telnyx-timestamp"] || "");
  const sig = String(headers["telnyx-signature-ed25519"] || "");
  const pub = env.TELNYX_PUBLIC_KEY || "";
  if (!ts || !sig || !pub) return false;

  const msg = Buffer.concat([Buffer.from(ts), Buffer.from("|"), rawBody]);

  let sigU8: Uint8Array;
  try {
    sigU8 = b64ToUint8(sig);
  } catch {
    sigU8 = hexToUint8(sig);
  }

  const pubU8 = b64ToUint8(pub);
  return nacl.sign.detached.verify(new Uint8Array(msg), sigU8, pubU8);
}
