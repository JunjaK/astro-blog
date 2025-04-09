<script setup lang="ts">
import { $theme } from '@/store/system.ts';
import { useStore } from '@nanostores/vue';
import dayjs from 'dayjs';
import Uplot from 'uplot';
import { onMounted, onUnmounted, ref, watch } from 'vue';

import { base, defaultTimeAxes, makeNoiseData } from './chartOptionData';
import { toolTipCloset } from './tooltipCloset';
import 'uplot/dist/uPlot.min.css';

const theme = useStore($theme);

const chartRef = ref<HTMLDivElement>();
const chartContainer = ref<HTMLDivElement>();
const chart = ref<Uplot>();
const canvasWidth = ref(100);

let interval: number | null = null;
let resizeObserver: ResizeObserver | null = null;

const data = ref<[number[], number[], number[], number[]]>([[], [], [], []]);
const options = ref<Uplot.Options>({
  ...base,
  width: canvasWidth.value,
  height: 600,
  scales: {
    '%': {
      auto: false,
      range: (min, max) => [0, 100],
    },
  },
  plugins: [
    toolTipCloset({
      Uplot,
      darkMode: true,
    }),
  ],
  series: [
    {},
    {
      label: 'CPU',
      scale: '%',
      value: (u, v) => v == null ? '' : `${v.toFixed(2)}%`,
      stroke: 'red',
    },
    {
      label: 'RAM',
      scale: '%',
      value: (u, v) => v == null ? '' : `${v.toFixed(2)}%`,
      stroke: 'blue',
    },
    {
      label: 'Disk',
      scale: '%',
      value: (u, v) => v == null ? '' : `${v.toFixed(2)} %`,
      stroke: 'green',
    },
  ],
});

onMounted(() => {
  resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      canvasWidth.value = entry.contentRect.width;
    }
  });

  if (chartContainer.value) {
    resizeObserver.observe(chartContainer.value);
  }

  const worker = new Worker(new URL('./sampleChart.worker?worker', import.meta.url), {
    type: 'module',
  });

  worker.onmessage = (event) => {
    data.value = event.data.res as [number[], number[], number[], number[]];
    let cpu = event.data.cpu;
    let ram = event.data.ram;
    let disk = event.data.disk;

    const maxValue1 = 3000;
    const maxValue2 = 5000;
    const maxValue3 = 8000;
    const totalSteps = dayjs().endOf('day').unix() - dayjs().startOf('day').unix();

    options.value.axes = [
      { ...defaultTimeAxes },
      {
        scale: '%',
        values: (u, vals, space) => vals.map((v) => `${+v.toFixed(1)}%`),
      },
    ];

    canvasWidth.value = chartContainer.value?.clientWidth ?? 800;

    makeChart();

    interval = setInterval(() => {
      cpu = makeNoiseData(cpu, maxValue1, totalSteps);
      ram = makeNoiseData(ram, maxValue2, totalSteps);
      disk = makeNoiseData(disk, maxValue3, totalSteps);
      data.value[1].push(cpu / 100);
      data.value[2].push(ram / 100);
      data.value[3].push(disk / 100);

      chart.value?.setData(data.value);
      chart.value?.redraw();
    }, 1000) as unknown as number;
  };

  worker.postMessage({});
});

onUnmounted(() => {
  if (interval) {
    clearInterval(interval);
  }
  resizeObserver?.disconnect();
});

watch(theme, () => {
}, { immediate: false });

watch(canvasWidth, () => {
  chart.value?.setSize({ width: canvasWidth.value, height: 600 });
}, { immediate: false });

function makeChart() {
  if (!options.value?.axes)
    return;

  options.value.axes[0].stroke = theme.value === 'dark' ? 'white' : 'black';
  options.value.axes[0].grid = { stroke: theme.value === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' };
  options.value.axes[1].stroke = theme.value === 'dark' ? 'white' : 'black';
  options.value.axes[1].grid = { stroke: theme.value === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' };
  chart.value = new Uplot(options.value, data.value, chartRef.value);
}
</script>

<template>
  <div id="chart-container" ref="chartContainer" class="flex justify-center">
    <div ref="chartRef" />
  </div>
</template>
