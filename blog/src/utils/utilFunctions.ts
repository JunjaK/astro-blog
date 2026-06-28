function withPrecision(value: number | string | null, precision = 1) {
  if (value == null || value === '')
    return null;
  if (Number.isNaN(value))
    return null;

  const num = typeof value === 'string' ? Number(value) : value;

  if (num === 0)
    return 0;
  return num.toFixed(precision);
}

function decimalSeparator(value: number | string | null) {
  if (value == null)
    return null;
  if (Number.isNaN(value))
    return null;

  const num = typeof value === 'number' ? value.toString() : value;
  const parts = num.split('.');
  return parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (parts[1] ? `.${parts[1]}` : '');
}

function decimalSeparatorWithPrecision(value: number | string | null, precision: number) {
  const num = withPrecision(value, precision);
  return decimalSeparator(num) ?? '-';
}

export {
  decimalSeparator,
  decimalSeparatorWithPrecision,
  withPrecision,
};
