export function chartPoints(values) {
  return values.map((value, index) => `${8 + (index * 284) / (values.length - 1)},${104 - value}`).join(' ');
}
