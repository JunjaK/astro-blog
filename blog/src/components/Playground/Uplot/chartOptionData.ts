import type Uplot from 'uplot';

const defaultTimeAxes = {
  space: 40,
  incrs: [
    // minute divisors (# of secs)
    1,
    5,
    10,
    15,
    30,
    // hour divisors
    60,
    60 * 5,
    60 * 10,
    60 * 15,
    60 * 30,
    // day divisors
    3600,
    3600 * 4,
    3600 * 8,
    3600 * 16,
    3600 * 24,

    3600 * 24 * 4,
    3600 * 24 * 7,
    3600 * 24 * 14,
    3600 * 24 * 21,
    3600 * 24 * 28,

    3600 * 24 * 28 * 30,
    3600 * 24 * 28 * 60,
    3600 * 24 * 28 * 90,
    3600 * 24 * 28 * 180,

    // ...
  ],
  // [0]:   minimum num secs in found axis split (tick incr)
  // [1]:   default tick format
  // [2-7]: rollover tick formats
  // [8]:   mode: 0: replace [1] -> [2-7], 1: concat [1] + [2-7]
  values: [
    // tick incr          default           year                             month    day                        hour     min                sec       mode
    [3600 * 24 * 365, '{YYYY}', null, null, null, null, null, null, 1],
    [3600 * 24 * 28, '{MM}', '\n{YYYY}', null, null, null, null, null, 1],
    [3600 * 24, '{MM}-{DD}', '\n{YYYY}', null, null, null, null, null, 1],
    [3600, '{HH}:{mm}', '\n{YYYY}-{MM}-{DD}', null, '\n{MM}-{DD}', null, null, null, 1],
    [60, '{HH}:{mm}', '\n{YYYY}-{MM}-{DD}', null, '\n{MM}-{DD}', null, null, null, 1],
    [1, ':{ss}', '\n{YYYY}-{MM}-{DD} {HH}:{mm}', null, '\n{MM}-{DD} {HH}:{mm}', null, '\n{HH}:{mm}', null, 1],
    [0.001, ':{ss}.{fff}', '\n{YYYY}-{MM}-{DD} {HH}:{mm}', null, '\n{MM}-{DD} {HH}:{mm}', null, '\n{HH}:{mm}', null, 1],
  ],
  //  splits:
};

const base: Uplot.Options = {
  width: 0,
  height: 600,
  cursor: {
    points: {
      size: (u, seriesIdx) => u.series[seriesIdx]?.points?.size ?? 0 * 1.5,
      width: (u, seriesIdx, size) => size / 4,
      stroke: (u, seriesIdx) => {
        const strokeFn = u.series[seriesIdx]?.points?.stroke;
        return `${typeof strokeFn === 'function' ? strokeFn(u, seriesIdx) : ''}90`;
      },
      // fill: (u, seriesIdx) => '#fff',
    },
    drag: {
      x: true,
      y: false,
    },
  },
  /* 범위와 zoom에 연관되어 있음. */
  scales: {},
  /* series 설정. 첫번째는 x축 고정, 이후 y축 */
  series: [
    {},
  ],
  legend: {
    live: false,
  },
  /* x, y축 설정. x축은 첫번째 고정, 이후는 y축 */
  axes: [
    { ...defaultTimeAxes },
  ],

};

function makeNoiseData(currentValue: number, maxValue: number, totalSteps: number) {
  const noise = (Math.random() - 0.5) * 4;
  const value = currentValue + (maxValue / totalSteps) + noise;

  return Math.min(Math.max(value, 1), maxValue);
}

export { base, defaultTimeAxes, makeNoiseData };
