/** AES-GCM key is non-extractable and unique to one member on this device. */
export interface Sealed { iv: Uint8Array; data: ArrayBuffer }
export async function createKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt','decrypt']);
}
export async function seal(key: CryptoKey, value: unknown): Promise<Sealed> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(JSON.stringify(value))
  );
  return { iv, data };
}
export async function open<T>(key: CryptoKey, sealed: Sealed): Promise<T> {
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(sealed.iv) }, key, sealed.data);
  return JSON.parse(new TextDecoder().decode(plain)) as T;
}
/** Hashed database name avoids exposing a member ID in the browser storage list. */
export async function accountTag(userId: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('askintros:' + userId));
  return [...new Uint8Array(digest)].slice(0,16).map(b => b.toString(16).padStart(2,'0')).join('');
}
