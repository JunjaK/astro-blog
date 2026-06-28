/* eslint-disable no-restricted-globals */
import dayjs from 'dayjs';
import { makeNoiseData } from './chartOptionData';

self.addEventListener('message', () => {
  const res = [
    [],
    [],
    [],
    [],
  ];
  const start = dayjs().startOf('day').unix();
  const end = dayjs().unix();

  let cpu = 100; // 시작 값
  let ram = 3000;
  let disk = 6000;
  const maxValue1 = 3000; // 최대 값
  const maxValue2 = 5000;
  const maxValue3 = 8000;
  const totalSteps = dayjs().endOf('day').unix() - start;

  for (let i = start; i <= end; i += 1) {
    cpu = makeNoiseData(cpu, maxValue1, totalSteps);
    ram = makeNoiseData(ram, maxValue2, totalSteps);
    disk = makeNoiseData(disk, maxValue3, totalSteps);

    res[0].push(i);
    res[1].push(cpu / 100);
    res[2].push(ram / 100);
    res[3].push(disk / 100);
  }
  for (let i = end; i < dayjs().endOf('day').unix(); i += 1) {
    res[0].push(i);
  }

  self.postMessage({ res, cpu, ram, disk });
});
