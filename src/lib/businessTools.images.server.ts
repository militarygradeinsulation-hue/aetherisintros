import { readProviderSecret } from './providerSecrets.server';

export async function generateBusinessImage(prompt: string): Promise<string> {
  const key = readProviderSecret('OPENAI_API_KEY');
  if (!key) throw new Error('Image generation is not connected. Your administrator must configure an image provider. Your brief is still available.');
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST', signal: AbortSignal.timeout(120000),
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({ model: process.env['BUSINESS_IMAGE_MODEL'] || 'gpt-image-2.5-flare', prompt, n: 1, size: '1024x1024', quality: 'low', output_format: 'png' }),
  });
  if (!response.ok) {
    await response.body?.cancel();
    throw new Error(response.status === 429 ? 'Image generation is busy or its account limit was reached. Try again later.' : 'The image provider could not generate this image. Your brief has been preserved.');
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error('The image provider returned no image.');
  const decoder = new TextDecoder(); let body = ''; let bytes = 0;
  try {
    for (;;) { const part = await reader.read(); if (part.done) break; bytes += part.value.length; if (bytes > 16000000) throw new Error('Generated image exceeded the size limit. Try a simpler brief.'); body += decoder.decode(part.value, {stream:true}); }
    body += decoder.decode();
  } finally { await reader.cancel().catch(()=>{}); }
  const encoded = JSON.parse(body)?.data?.[0]?.b64_json;
  if (typeof encoded !== 'string' || !encoded.startsWith('iVBORw0KGgo') || !/^[A-Za-z0-9+/=]+$/.test(encoded)) throw new Error('The image provider returned an invalid PNG.');
  return `data:image/png;base64,${encoded}`;
}
