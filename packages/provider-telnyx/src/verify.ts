import nacl from "tweetnacl";

function b64ToU8(b64: string) {
  return new Uint8Array(Buffer.from(b64, "base64"));
}

function hexToU8(hex: string) {
  return new Uint8Array(hex.match(/.{1,2}/g)!.map(b => parseInt(b, 16)));
}

export function verifySignature(
  raw: Buffer,
  headers: Record<string, string | string[] | undefined>,
  publicKeyB64: string
) {
  const ts = String(headers["telnyx-timestamp"] || "");
  const sig = String(headers["telnyx-signature-ed25519"] || "");
  if (!ts || !sig || !publicKeyB64) return false;

  const msg = Buffer.concat([Buffer.from(ts), Buffer.from("|"), raw]);

  let sigU8: Uint8Array;
  try {
    sigU8 = b64ToU8(sig);
  } catch {
    try {
      sigU8 = hexToU8(sig);
    } catch {
      return false;
    }
  }

  const pubU8 = b64ToU8(publicKeyB64);
  return nacl.sign.detached.verify(new Uint8Array(msg), sigU8, pubU8);
}
