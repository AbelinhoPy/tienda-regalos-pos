/**
 * Utilidades para códigos de barras comerciales estándar (EAN-13)
 * y confirmación auditiva para lectores / pistolas.
 */

/**
 * Genera un código de barras comercial válido EAN-13 (13 dígitos numéricos).
 * Utiliza el prefijo de país GS1 (por defecto 784 para Paraguay o 200 para uso interno).
 * Calcula matemáticamente el dígito verificador oficial.
 */
export function generateEAN13(prefix = '784'): string {
  let code = prefix;
  while (code.length < 12) {
    code += Math.floor(Math.random() * 10).toString();
  }
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(code[i], 10);
    sum += (i % 2 === 0) ? digit : digit * 3;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return `${code}${checkDigit}`;
}

/**
 * Reproduce un sonido de confirmación ("beep" de caja registradora / pistola lectora)
 * usando la Web Audio API estándar sin necesidad de archivos externos.
 */
export function playScanBeep(frequency = 1200, durationMs = 90) {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + durationMs / 1000);
  } catch (e) {
    // Si el navegador bloquea audio antes de interacción, se ignora silenciosamente
  }
}
