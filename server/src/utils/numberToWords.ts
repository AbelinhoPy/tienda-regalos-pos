/**
 * Conversor exacto de números a palabras en español para montos financieros.
 * Compatible con Guaraníes (enteros), Dólares y Reales (con decimales).
 */

const UNIDADES = [
  '', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE',
  'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE', 'VEINTE'
];

const DECENAS = [
  '', '', 'VEINTI', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'
];

const CENTENAS = [
  '', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS',
  'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'
];

function convertirGrupo(n: number): string {
  if (n === 0) return '';
  if (n === 100) return 'CIEN';

  let salida = '';

  const c = Math.floor(n / 100);
  const d = Math.floor((n % 100) / 10);
  const u = n % 10;
  const resto = n % 100;

  if (c > 0) {
    salida += CENTENAS[c] + ' ';
  }

  if (resto <= 20) {
    if (resto > 0) salida += UNIDADES[resto];
  } else if (resto > 20 && resto < 30) {
    salida += 'VEINTI' + UNIDADES[u];
  } else {
    salida += DECENAS[d];
    if (u > 0) salida += ' Y ' + UNIDADES[u];
  }

  return salida.trim();
}

/**
 * Convierte un número entero positivo a palabras
 */
export function enteroALetras(valor: number): string {
  if (valor === 0) return 'CERO';

  const absValor = Math.floor(Math.abs(valor));
  let palabras = '';

  // Millones (hasta 999.999.999)
  const millones = Math.floor(absValor / 1000000);
  const miles = Math.floor((absValor % 1000000) / 1000);
  const unidades = absValor % 1000;

  if (millones > 0) {
    if (millones === 1) {
      palabras += 'UN MILLÓN ';
    } else {
      palabras += convertirGrupo(millones) + ' MILLONES ';
    }
  }

  if (miles > 0) {
    if (miles === 1) {
      palabras += 'MIL ';
    } else {
      palabras += convertirGrupo(miles) + ' MIL ';
    }
  }

  if (unidades > 0) {
    palabras += convertirGrupo(unidades);
  }

  return palabras.trim();
}

/**
 * Convierte un monto numérico con moneda a su representación escrita.
 * Para Guaraníes (GS): "DOS MILLONES CIEN MIL GUARANÍES"
 * Si se requiere formato idéntico al PDF de ejemplo: "DOS MILLONES CIEN MIL"
 */
export function numeroALetras(
  monto: number,
  moneda: string = 'GS',
  incluirMoneda: boolean = false
): string {
  const entero = Math.floor(Math.abs(monto));
  const decimal = Math.round((Math.abs(monto) - entero) * 100);

  let texto = enteroALetras(entero);

  if (moneda.toUpperCase() === 'GS' || moneda.toUpperCase() === 'PYG') {
    if (incluirMoneda) {
      texto += ' GUARANÍES';
    }
    return texto;
  }

  // Dólares o Reales
  const nombreMoneda = moneda.toUpperCase() === 'USD' ? 'DÓLARES' : 'REALES';
  if (decimal > 0) {
    return `${texto} CON ${decimal.toString().padStart(2, '0')}/100 ${nombreMoneda}`;
  } else {
    return `${texto} ${nombreMoneda}`;
  }
}
