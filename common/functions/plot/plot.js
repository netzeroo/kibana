import Fn from '../fn.js';
import { groupBy, keyBy, get, set, map, sortBy } from 'lodash';
import chroma from 'chroma-js';

export default new Fn({
  name: 'plot',
  aliases: [],
  type: 'render',
  help: 'Produces a plot chart',
  context: {
    types: [
      'pointseries',
    ],
  },
  args: {
    seriesStyle: {
      multi: true,
      types: ['seriesStyle', 'null'],
      help: 'A style of a specific series',
    },
    defaultStyle: {
      multi: false,
      types: ['seriesStyle', 'null'],
      help: 'The default style to use for a series',
      default: '{seriesStyle points=5}',
    },
    palette: {
      types: ['palette', 'null'],
      help: 'A palette object for describing the colors to use on this plot',
      default: '{palette}',
    },
  },
  fn: (context, args) => {
    function seriesStyleToFlot(seriesStyle) {
      if (!seriesStyle) return {};
      return {
        stack: get(seriesStyle, 'stack'),
        lines: {
          show: get(seriesStyle, 'lines') > 0,
          lineWidth: get(seriesStyle, 'lines'),
          steps: get(seriesStyle, 'steps'),
          fillColor: get(seriesStyle, 'color'),
          fill: get(seriesStyle, 'fill') / 10,
        },
        bars: {
          show: get(seriesStyle, 'bars') > 0,
          barWidth: get(seriesStyle, 'bars'),
          fill: 1,
          align: 'center',
        },
        // This is here intentionally even though it is the default.
        // We use the `size` plugins for this and if the user says they want points we just set the size to be static.
        points: { show: false },
        bubbles: {
          fill: get(seriesStyle, 'fill'),
        },
        color: get(seriesStyle, 'color'),
      };
    }

    const seriesStyles = keyBy(args.seriesStyle || [], 'label') || {};

    const ticks = {
      x: {
        hash: {},
        counter: 0,
      },
      y: {
        hash: {},
        counter: 0,
      },
    };

    context.rows = sortBy(context.rows, ['x', 'y', 'color', 'size']);

    if (get(context.columns, 'x.type') === 'string') {
      sortBy(context.rows, ['x']).forEach(row => {
        if (!ticks.x.hash[row.x]) {
          ticks.x.hash[row.x] = ticks.x.counter++;
        }
      });
    }

    if (get(context.columns, 'y.type') === 'string') {
      sortBy(context.rows, ['y']).reverse().forEach(row => {
        if (!ticks.y.hash[row.y]) {
          ticks.y.hash[row.y] = ticks.y.counter++;
        }
      });
    }

    const data = map(groupBy(context.rows, 'color'), (series, label) => {
      const seriesStyle = seriesStyles[label] || args.defaultStyle;

      const result = {};
      if (seriesStyle) {
        Object.assign(result, seriesStyleToFlot(seriesStyle));
      }

      Object.assign(result, {
        label: label,
        data: series.map(point => {
          const attrs = {};
          const x = get(context.columns, 'x.type') === 'string' ? ticks.x.hash[point.x] : point.x;
          const y = get(context.columns, 'y.type') === 'string' ? ticks.y.hash[point.y] : point.y;

          if (point.size != null) {
            attrs.size = point.size;
          } else if (get(seriesStyle, 'points')) {
            attrs.size = seriesStyle.points;
            set(result, 'bubbles.size.min', seriesStyle.points);
          }

          return [x, y, attrs];
        }),
      });

      return result;
    });

    const colors = args.palette.gradient ? chroma.scale(args.palette.colors).colors(data.length) : args.palette.colors;

    const result = {
      type: 'render',
      as: 'plot',
      value: {
        data: sortBy(data, 'label'),
        options: {
          canvas: false,
          colors: colors,
          legend: {
            show: true,
          },
          grid: {
            borderWidth: 0,
            borderColor: null,
            color: 'rgba(0,0,0,0)',
            labelMargin: 30,
            margin: {
              right: 30,
              top: 20,
              bottom: 0,
              left: 0,
            },
          },
          xaxis: {
            ticks: get(context.columns, 'x.type') === 'string' ? map(ticks.x.hash, (position, name) => [position, name]) : undefined,
            mode: get(context.columns, 'x.type') === 'date' ? 'time' : undefined,
          },
          yaxis: {
            ticks: get(context.columns, 'y.type') === 'string' ? map(ticks.y.hash, (position, name) => [position, name]) : undefined,
            mode: get(context.columns, 'y.type') === 'date' ? 'time' : undefined,
          },
          series: Object.assign({
            bubbles: {
              active: true,
              show: true,
            },
            shadowSize: 0,
          }, seriesStyleToFlot(args.defaultStyle)),
        },
      },
    };

    return result;
  },
});
