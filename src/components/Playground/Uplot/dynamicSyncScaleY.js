function dynamicSyncScaleY(chart, key, fixedYScale) {
  // fixedScale (Array<Object>)
  // ex) [ {unitValue: 'kW', min: '0', max: '1000'} ]

  const seriesX = chart.series.filter((s) => s.scale === 'x')[0];
  const currentNumOfTicks = seriesX.idxs[1] - seriesX.idxs[0] + 1;
  const zoomOutNumOfTicks = chart.data[0].length;
  const unitValueList = [];
  fixedYScale.forEach((sc) => unitValueList.push(sc.unitValue));

  if (currentNumOfTicks >= zoomOutNumOfTicks) {
    if (unitValueList.includes(key)) {
      chart.scales[key].min = fixedYScale[unitValueList.indexOf(key)].min;
      chart.scales[key]._min = fixedYScale[unitValueList.indexOf(key)].min;
      chart.scales[key].max = fixedYScale[unitValueList.indexOf(key)].max;
      chart.scales[key]._max = fixedYScale[unitValueList.indexOf(key)].max;
    }
  }
}

export { dynamicSyncScaleY };
