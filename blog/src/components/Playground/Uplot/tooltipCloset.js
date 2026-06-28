import { decimalSeparatorWithPrecision } from '@/utils/utilFunctions';
import dayjs from 'dayjs';

function toolTipCloset(opts) {
  function init(u, opts, data) {
    const darkMode = window.localStorage.getItem('theme') === 'dark';
    const { over } = u;
    over.firstChild.style.borderRight = '1px dashed #c6c6c6';
    const childList = over.children;
    childList[1].style.borderBottom = '1px dashed #c6c6c6';

    const tt = document.createElement('div');
    tt.style.pointerEvents = 'none';
    tt.style.position = 'absolute';
    tt.style.whiteSpace = 'pre';
    tt.style.padding = '6px';
    tt.style.fontFamily = 'verdana';
    tt.style.fontSize = '11px';
    tt.style.zIndex = '101';
    if (darkMode) {
      tt.style.background = 'rgba(0,0,0,0.8)';
      tt.style.color = 'rgba(217,217,217,0.8)';
      tt.style.border = 'none';
    }
    else {
      tt.style.background = 'rgba(255,255,255,0.95)';
      tt.style.border = '1px solid #aaaaaa';
    }
    over.appendChild(tt);

    u.seriestt = tt;

    function hideTips() {
      u.seriestt.style.display = 'none';
    }

    function showTips() {
      u.seriestt.style.display = null;
    }

    over.addEventListener('mouseleave', () => {
      if (!u.cursor._lock) {
        u.setCursor({ left: -10, top: -10 });
        hideTips();
      }
    });

    over.addEventListener('mouseenter', () => {
      showTips();
    });

    hideTips();
  }
  function setCursor(u) {
    const darkMode = window.localStorage.getItem('theme') === 'dark';

    const { width, height } = u.seriestt.getBoundingClientRect();
    const { left, top, idx } = u.cursor;

    // this is here to handle if initial cursor position is set
    // not great (can be optimized by doing more enter/leave state transition tracking)
    if (left > 0)
      u.seriestt.style.display = null;

    // can optimize further by not applying styles if idx did not change
    const xVal = u.data[0]?.[idx];
    const half = Math.ceil(u.series.length / 2);
    const isMoment = dayjs.unix(xVal).isValid();
    const xLabel = isMoment ? `${dayjs.unix(xVal).format('YYYY-MM-DD HH:mm:ss')}` : (xVal ?? '');
    const chartWidth = u.over.getBoundingClientRect().width;
    u.seriestt.textContent = `${xLabel}`;
    // u.seriestt.style.left = `${Math.round(u.valToPos(xVal, 'x'))}px`;
    // u.seriestt.style.top = `${Math.round(u.valToPos(u.data[half]?.[idx], u.series[half]?.scale))}px`;
    u.seriestt.style.left = chartWidth - left < left ? `${left - width - 30}px` : `${left + 30}px`;
    u.seriestt.style.top = `${top + 30}px`;

    u.series.forEach((s, i) => {
      if (i === 0)
        return;

      if (s.show) {
        // this is here to handle if initial cursor position is set
        // not great (can be optimized by doing more enter/leave state transition tracking)
        let yVal = null;
        if (u.series[i]?.scale === 'Boolean') {
          if (u.data[i]?.[idx] === 'true' || u.data[i]?.[idx] === true || u.data[i]?.[idx] === 1) {
            yVal = true;
          }
          else if (u.data[i]?.[idx] === 'false' || u.data[i]?.[idx] === false || u.data[i]?.[idx] === 0) {
            yVal = false;
          }
          else {
            yVal = null;
          }
        }
        else if (u.data[i]?.[idx] == null) {
          yVal = null;
        }
        else {
          yVal = decimalSeparatorWithPrecision(u.data[i]?.[idx] ?? null, u.series[i]?.precision ?? 2);
        }

        const unit = u.series[i]?.scale === 'Boolean' ? '' : u.series[i]?.scale;

        const div = document.createElement('div');
        const square = document.createElement('div');
        const title = document.createElement('span');
        const data = document.createElement('span');
        square.style.backgroundColor = s?._stroke;
        square.style.width = '10px';
        square.style.height = '10px';
        square.style.display = 'inline-block';
        square.style.marginRight = '2px';
        if (darkMode)
          square.style.border = '0.5px solid white';
        else square.style.border = '0.5px solid darkgray';

        title.textContent = `${s?.label}: `;

        data.textContent = `${yVal ?? '- '} ${unit ?? ''}`;

        div.style.display = 'flex';
        div.style.alignItems = 'center';

        div.appendChild(square);
        div.appendChild(title);
        div.appendChild(data);
        u.seriestt.appendChild(div);
      }
    });
  }

  return {
    hooks: {
      init,
      setCursor,
      setScale: [
        (u, key) => {
          // console.log('setScale', key);
        },
      ],
      setSeries: [
        (u) => {
          let check = false;
          const showAxes = [];
          u.axes.forEach((axis) => {
            if (axis.scale === 'x')
              return;
            axis.grid = { ...axis.grid, show: false };
          });

          const showSeries = u.series.filter((series) => {
            if (series.scale === 'x')
              return false;

            u.axes.forEach((axis, i) => {
              if (axis.scale === 'x')
                return;
              if (axis.show && series.show && axis.scale === series.scale
                && showAxes.find((data) => data.scale === axis.scale) == null) {
                showAxes.push(axis);
                if (!check) {
                  axis.grid = { ...axis.grid, show: true };
                  check = true;
                }
              }
            });
            return series.show;
          });
        },
      ],
    },
  };
}

export { toolTipCloset };
