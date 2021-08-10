function readActivities() {
  const swarmInput = document.getElementById('activityjson');
  swarmInput.addEventListener('change', handleJson, false);
}

function handleJson() {
  const file = this.files[0];
  const reader = new FileReader();
  reader.onload = event => {
    const data = JSON.parse(reader.result).reverse().map(i => transformToMinimal(i));
    console.log(data);
    Highcharts.chart('container',
      {
        title: {
          text: 'Strava',
        },
        chart: {
          zoomType: 'x',
        },
        xAxis: {
          type: "datetime",
        },
        yAxis: [{
          labels: {
            format: '{value} miles',
          },
          title: {
            text: 'Biking',
          },
          opposite: true,
        }, {
          labels: {
            format: '{value} miles',
          },
          title: {
            text: 'Running',
          }
        }, {
          labels: {
            format: '{value} yards',
          },
          title: {
            text: 'Swimming',
          }
        }],

        series: [{
          type: 'line',
          name: 'Bikes',
          data: emptyDays(data.filter(d => d.type == 'Ride').map(d => transformToHighcharts(d, miles))),
        }, {
          type: 'line',
          name: 'Runs',
          yAxis: 1,
          data: emptyDays(data.filter(d => d.type == 'Run').map(d => transformToHighcharts(d, miles))),
          turboThreshold: 0,
        }, {
          type: 'line',
          name: 'Swims',
          yAxis: 2,
          data: emptyDays(data.filter(d => d.type == 'Swim').map(d => transformToHighcharts(d, yards))),
          turboThreshold: 0,
        },

        ],
      });
  };
  reader.readAsText(file);
}

/**
 * @return {
 *   name: string,
 *   distance: float,
 *   timestamp: date
 *   type: {Ride|Run|Swim|various others},
 *   }
 */
function transformToMinimal(stravaActivity) {
  return {
    name: stravaActivity["name"],
    distance: stravaActivity["distance"],
    timestamp: new Date(stravaActivity["start_date"]),
    type: stravaActivity["type"],
  };
}

function transformToHighcharts(minimal, distFunc) {
  let dist = distFunc(minimal.distance);
  return {
    y: dist,
    x: new Date(minimal.timestamp.toDateString()).getTime(),
    name: minimal.name,
  };
}

function emptyDays(highchartSeries) {
  let date = new Date(highchartSeries[0].x);
  for (let i = 1; i < highchartSeries.length; i++) {
    let tomorrow = getTomorrow(date);
    if (date.getTime() == highchartSeries[i].x) {
      continue;
    } else if (tomorrow.getTime() == highchartSeries[i].x) {
      date = tomorrow;
      continue;
    } else {
      date = tomorrow;
      const obj = {
        x: date.getTime(),
        y: 0,
        name: 'Rest',
      };
      highchartSeries.splice(i, 0, obj);
    }
  }
  return highchartSeries;
}

function getTomorrow(date) {
  let newDate = new Date(date);
  newDate.setDate(date.getDate() + 1);
  return newDate;
}

function miles(dist) {
  return Math.round(100 * dist / 1610) / 100;
}

function yards(dist) {
  return Math.round(dist / .9144);
}

readActivities();
