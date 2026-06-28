function dynamicSmoothing(chart, key, preSplineMode, seriesPaths, numOfTicks) {
  // numOfTicks: smoothing 처리 기준이 되는 ticks의 개수

  const seriesX = chart.series.filter((s) => s.scale === 'x')[0];
  const currentNumOfTicks = seriesX.idxs[1] - seriesX.idxs[0] + 1;
  const nextSplineMode = currentNumOfTicks < numOfTicks;

  if (preSplineMode === nextSplineMode) return preSplineMode;

  for (let i = 1; i < chart.series.length; i++) {
    if (nextSplineMode) chart.series[i].paths = (u, seriesIdx, idx0, idx1, extendGap, buildClip) => seriesPaths.spline(u, seriesIdx, idx0, idx1, extendGap, buildClip);
    else chart.series[i].paths = (u, seriesIdx, idx0, idx1, extendGap, buildClip) => seriesPaths.linear(u, seriesIdx, idx0, idx1, extendGap, buildClip);
  }

  return nextSplineMode;
}
export { dynamicSmoothing };
