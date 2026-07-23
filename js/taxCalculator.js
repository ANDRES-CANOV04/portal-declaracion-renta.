/**
 * Modulo de Calculo Tributario Formulario 210 (DIAN Colombia)
 * Calculo de Renta Celular General: Trabajo, Capital y No Laborales.
 */

// Valor UVT estimado
export const UVT_VALUES = {
  2024: 47065,
  2025: 49799,
  2026: 52150
};

/**
 * Aplica la tabla de tarifa marginal de Impuesto sobre la Renta (Art. 241 Estatuto Tributario)
 * @param {number} rentaLiquidaGravableUVT Renta liquida en UVT
 * @param {number} uvtVal Valor de la UVT en COP
 * @returns {number} Impuesto calculado en COP
 */
export function calculateTaxFromUVT(rentaLiquidaGravableUVT, uvtVal) {
  if (rentaLiquidaGravableUVT <= 1090) {
    return 0;
  } else if (rentaLiquidaGravableUVT <= 1700) {
    const base = (rentaLiquidaGravableUVT - 1090) * 0.19;
    return Math.round(base * uvtVal);
  } else if (rentaLiquidaGravableUVT <= 4100) {
    const base = (rentaLiquidaGravableUVT - 1700) * 0.28 + 116;
    return Math.round(base * uvtVal);
  } else if (rentaLiquidaGravableUVT <= 8670) {
    const base = (rentaLiquidaGravableUVT - 4100) * 0.33 + 788;
    return Math.round(base * uvtVal);
  } else if (rentaLiquidaGravableUVT <= 18970) {
    const base = (rentaLiquidaGravableUVT - 8670) * 0.35 + 2296;
    return Math.round(base * uvtVal);
  } else if (rentaLiquidaGravableUVT <= 31000) {
    const base = (rentaLiquidaGravableUVT - 18970) * 0.37 + 5901;
    return Math.round(base * uvtVal);
  } else {
    const base = (rentaLiquidaGravableUVT - 31000) * 0.39 + 10352;
    return Math.round(base * uvtVal);
  }
}

/**
 * Liquida la declaracion de renta celular basada en los insumos del contribuyente
 */
export function computeFormulario210(inputs = {}, year = 2025) {
  const uvtVal = UVT_VALUES[year] || UVT_VALUES[2025];

  // Ingresos Brutos
  const ingTrabajo = parseFloat(inputs.ingTrabajo || 0);
  const ingCapital = parseFloat(inputs.ingCapital || 0);
  const ingNoLaboral = parseFloat(inputs.ingNoLaboral || 0);

  const totalIngresosBrutos = ingTrabajo + ingCapital + ingNoLaboral;

  // Ingresos no constitutivos de renta (Pensiones, Salud, etc.)
  const inorTrabajo = parseFloat(inputs.inorTrabajo || 0);
  const inorCapital = parseFloat(inputs.inorCapital || 0);
  const inorNoLaboral = parseFloat(inputs.inorNoLaboral || 0);
  const totalINOR = inorTrabajo + inorCapital + inorNoLaboral;

  const rentaNetaTrabajo = Math.max(0, ingTrabajo - inorTrabajo);
  const rentaNetaCapital = Math.max(0, ingCapital - inorCapital);
  const rentaNetaNoLaboral = Math.max(0, ingNoLaboral - inorNoLaboral);

  // Deducciones Imputables (Intereses Vivienda, Salud Prepagada, Dependientes, GMF)
  const deducVivienda = parseFloat(inputs.deducVivienda || 0);
  const deducSalud = parseFloat(inputs.deducSalud || 0);
  const deducDependientes = parseFloat(inputs.deducDependientes || 0);
  const deducOtras = parseFloat(inputs.deducOtras || 0);
  const totalDeducciones = deducVivienda + deducSalud + deducDependientes + deducOtras;

  // Rentas Exentas (Exencion 25% sobre renta laboral lim a 790 UVT)
  const limite25Exenta = 790 * uvtVal;
  const base25 = Math.max(0, rentaNetaTrabajo - totalDeducciones);
  const exencion25Calculada = Math.min(base25 * 0.25, limite25Exenta);

  // Limite general 40% (o 1340 UVT) para deducciones y exentas
  const limiteGeneral40 = (rentaNetaTrabajo + rentaNetaCapital + rentaNetaNoLaboral) * 0.40;
  const limiteGeneralUVT = 1340 * uvtVal;
  const capDeduccionesYExentas = Math.min(limiteGeneral40, limiteGeneralUVT);

  const sumaDeducYExentas = totalDeducciones + exencion25Calculada;
  const deduccionesAplicadas = Math.min(sumaDeducYExentas, capDeduccionesYExentas);

  // Renta Liquida Gravable Cedula General
  const rentaLiquidaCedulaGeneral = Math.max(0, (rentaNetaTrabajo + rentaNetaCapital + rentaNetaNoLaboral) - deduccionesAplicadas);
  const rentaLiquidaUVT = rentaLiquidaCedulaGeneral / uvtVal;

  // Impuesto a Cargo
  const impuestoCalculado = calculateTaxFromUVT(rentaLiquidaUVT, uvtVal);

  // Retenciones en la Fuente & Anticipo anterior
  const retencionesFuente = parseFloat(inputs.retencionesFuente || 0);
  const anticipoAnterior = parseFloat(inputs.anticipoAnterior || 0);
  const totalPagosPrevios = retencionesFuente + anticipoAnterior;

  // Balance Final
  const diferencia = impuestoCalculado - totalPagosPrevios;
  const balanceType = diferencia > 0 ? 'apagar' : (diferencia < 0 ? 'afavor' : 'neutral');
  const netBalanceVal = Math.abs(diferencia);

  return {
    year,
    uvtVal,
    totalIngresosBrutos,
    totalINOR,
    rentaNetaTrabajo,
    rentaNetaCapital,
    rentaNetaNoLaboral,
    totalDeducciones,
    exencion25Calculada,
    deduccionesAplicadas,
    rentaLiquidaCedulaGeneral,
    rentaLiquidaUVT,
    impuestoCalculado,
    retencionesFuente,
    anticipoAnterior,
    netBalanceVal,
    balanceType,
    formattedBalance: formatCOP(netBalanceVal),
    formattedImpuesto: formatCOP(impuestoCalculado),
    formattedIngresos: formatCOP(totalIngresosBrutos),
    formattedRetenciones: formatCOP(retencionesFuente)
  };
}

export function formatCOP(val) {
  const num = Math.round(Number(val) || 0);
  return '$ ' + num.toLocaleString('es-CO');
}
