import * as d3 from 'd3';
import { regressionLinear } from 'd3-regression';
import { useEffect, useRef, useState } from 'react';

type TemperatureData = {
  year: number;
  temperature: number;
};

export function LargeBarChart() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [data, setData] = useState<TemperatureData[]>([]);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });

  // 데이터 생성 (20년간 서울 일 평균온도 예시)
  useEffect(() => {
    // 실제로는 API나 파일에서 데이터를 가져오는 것이 좋습니다
    const generateData = () => {
      const baseYear = 2003;
      const baseTemp = 12.5; // 서울 평균 기온 기준

      return Array.from({ length: 20 }, (_, i) => {
        // 약간의 변동성을 주기 위해 랜덤 값 추가
        const randomVariation = Math.random() * 2 - 1; // -1 ~ 1 사이의 랜덤 값
        return {
          year: baseYear + i,
          temperature: baseTemp + randomVariation + (i * 0.05), // 약간의 온난화 경향 추가
        };
      });
    };

    setData(generateData());
  }, []);

  // 창 크기 변경 감지
  useEffect(() => {
    const handleResize = () => {
      if (svgRef.current) {
        const containerWidth = svgRef.current.parentElement?.clientWidth || 800;
        setDimensions({
          width: containerWidth,
          height: Math.min(500, containerWidth * 0.6),
        });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // D3 차트 그리기
  useEffect(() => {
    if (!data.length || !svgRef.current)
      return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // 기존 요소 제거

    const { width, height } = dimensions;
    const margin = { top: 50, right: 30, bottom: 60, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // 스케일 설정
    const xScale = d3.scaleBand()
      .domain(data.map((d) => d.year.toString()))
      .range([0, innerWidth])
      .padding(0.2);

    const yScale = d3.scaleLinear()
      .domain([
        Math.min(d3.min(data, (d) => d.temperature) || 0, 10), // 최소값 (최소 10도)
        Math.max(d3.max(data, (d) => d.temperature) || 0, 15), // 최대값 (최소 15도)
      ])
      .nice()
      .range([innerHeight, 0]);

    // 색상 스케일
    const colorScale = d3.scaleLinear<string>()
      .domain([d3.min(data, (d) => d.temperature) || 0, d3.max(data, (d) => d.temperature) || 0])
      .range(['#74b9ff', '#e17055']);

    // 그래프 그룹 생성
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // X축
    const xAxis = g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale).tickSize(0))
      .call((g) => g.select('.domain').remove());

    // X축 레이블
    xAxis.selectAll('text')
      .attr('transform', 'rotate(-45)')
      .style('text-anchor', 'end')
      .attr('dx', '-.8em')
      .attr('dy', '.15em')
      .style('font-size', '12px');

    // X축 제목
    g.append('text')
      .attr('class', 'x-axis-label')
      .attr('x', innerWidth / 2)
      .attr('y', innerHeight + 50)
      .attr('text-anchor', 'middle')
      .attr('fill', 'var(--text-p)')
      .text('연도');

    // Y축
    g.append('g')
      .call(d3.axisLeft(yScale).ticks(5).tickSize(-innerWidth))
      .call((g) => g.select('.domain').remove())
      .call((g) => g.selectAll('.tick line')
        .attr('stroke', '#e0e0e0')
        .attr('stroke-dasharray', '2,2'));

    // Y축 제목
    g.append('text')
      .attr('class', 'y-axis-label')
      .attr('transform', 'rotate(-90)')
      .attr('x', -innerHeight / 2)
      .attr('y', -40)
      .attr('text-anchor', 'middle')
      .attr('fill', 'var(--text-p)')
      .text('평균 기온 (°C)');

    // 차트 제목
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', 25)
      .attr('text-anchor', 'middle')
      .style('font-size', '18px')
      .style('font-weight', 'bold')
      .attr('fill', 'var(--text-title)')
      .text('서울 20년간 연평균 기온 변화 (2003-2022)');

    // 막대 그래프
    g.selectAll('.bar')
      .data(data)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', (d) => xScale(d.year.toString()) || 0)
      .attr('y', (d) => yScale(d.temperature))
      .attr('width', xScale.bandwidth())
      .attr('height', (d) => innerHeight - yScale(d.temperature))
      .attr('fill', (d) => colorScale(d.temperature))
      .attr('rx', 2) // 모서리 둥글게
      .on('mouseover', function (event, d) {
        d3.select(this).attr('opacity', 0.8);

        // 툴팁 표시
        const tooltip = g.append('g')
          .attr('class', 'tooltip')
          .attr('transform', `translate(${(xScale(d.year.toString()) || 0) + xScale.bandwidth() / 2}, ${yScale(d.temperature) - 10})`);

        tooltip.append('rect')
          .attr('x', -40)
          .attr('y', -30)
          .attr('width', 80)
          .attr('height', 25)
          .attr('fill', 'rgba(0,0,0,0.7)')
          .attr('rx', 4);

        tooltip.append('text')
          .attr('x', 0)
          .attr('y', -13)
          .attr('text-anchor', 'middle')
          .attr('fill', 'white')
          .text(`${d.temperature.toFixed(1)}°C`);
      })
      .on('mouseout', function () {
        d3.select(this).attr('opacity', 1);
        g.selectAll('.tooltip').remove();
      });

    // 추세선 (선형 회귀)
    const regression = regressionLinear<TemperatureData>()
      .x((d) => d.year)
      .y((d) => d.temperature);

    const regressionLine = regression(data);

    // 추세선 그리기
    g.append('line')
      .attr('x1', (xScale(regressionLine[0][0].toString()) || 0) + xScale.bandwidth() / 2)
      .attr('y1', yScale(regressionLine[0][1]))
      .attr('x2', (xScale(regressionLine[1][0].toString()) || 0) + xScale.bandwidth() / 2)
      .attr('y2', yScale(regressionLine[1][1]))
      .attr('stroke', '#e84393')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '5,5');

    // 범례
    const legend = svg.append('g')
      .attr('transform', `translate(${width - 150}, 20)`);

    legend.append('line')
      .attr('x1', 0)
      .attr('y1', 0)
      .attr('x2', 20)
      .attr('y2', 0)
      .attr('stroke', '#e84393')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '5,5');

    legend.append('text')
      .attr('x', 25)
      .attr('y', 4)
      .text('온도 추세선')
      .style('font-size', '12px')
      .attr('fill', 'var(--text-p)');
  }, [data, dimensions]);

  return (
    <div className="w-full overflow-x-auto">
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="mx-auto"
      />
    </div>
  );
}
