var rollup = 'monthly';
var data = [];

function readActivities() {
  const swarmInput = document.getElementById('activityjson');
  swarmInput.addEventListener('change', handleJson, false);
}

function handleRollup() {
  const rollupInput = document.getElementById('rollup');
  rollupInput.addEventListener('change', (e) => {
    rollup = e.target.value;
    redraw();
  });

  
}

function handleJson() {
  const file = this.files[0];
  const reader = new FileReader();
  reader.onload = event => {
    data = JSON.parse(reader.result).reverse().map(i => transformToMinimal(i));
    redraw();
  };
  reader.readAsText(file);
}

function redraw() {
  chart.series[0].setData(
      doRollup(data.filter(d => d.type == 'Ride')).map(d => transformToHighcharts(d, miles)));
  chart.series[1].setData(
      doRollup(data.filter(d => d.type == 'Run')).map(d => transformToHighcharts(d, miles)));
  chart.series[2].setData(
      doRollup(data.filter(d => d.type == 'Swim')).map(d => transformToHighcharts(d, yards)));
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

function doRollup(activityData) {
  if (activityData.length == 0) {
    return activityData;
  }
  let earliestDate = activityData[0].timestamp;
  let maxDate = activityData[activityData.length - 1];
  let nextDate = getNextDate(earliestDate);

  let newActivity = { ...activityData[0] };
  var newActivities = [];
  for (var i = 1; i < activityData.length; i++) {
    const activity = activityData[i];
    const timestamp = new Date(activity.timestamp.toDateString());
    if (timestamp < nextDate) {
      newActivity.distance += activity.distance;
      newActivity.name += "<br>" + activity.name; 
    } else {
      newActivities.push(newActivity);
      let newStartDate = nextDate;
      while (nextDate <= timestamp) {
        nextDate = getNextDate(nextDate);
        newStartDate = nextDate;
        if (nextDate.getTime() != getNextDate(timestamp).getTime()) {
          newActivities.push({
            name: nextDate.toISOString().slice(0,10),
            distance: 0,
            timestamp: nextDate,
            type: activity.type,
          });
        }
      }
      newActivity = { ...activity };
      newActivity.name = newStartDate.toISOString().slice(0,10) + "<br>"+ newActivity.name;
      newActivity.timestamp = newStartDate;
    }
  }
  newActivities.push(newActivity);
  return newActivities;
}

function getNextDate(timestamp) {
  let newDate = new Date(timestamp.toDateString());
  if (rollup == 'daily') {
    newDate.setDate(newDate.getDate() + 1);
  } else if (rollup == 'weekly') {
    var curDate = newDate.getDay();
    newDate.setDate(newDate.getDate() + 7 - curDate);
  } else if (rollup == 'monthly') {
    newDate.setDate(1);
    newDate.setMonth(newDate.getMonth() + 1);
  }
  return newDate;
}

function miles(dist) {
  return Math.round(100 * dist / 1610) / 100;
}

function yards(dist) {
  return Math.round(dist / .9144);
}

readActivities();
handleRollup();

var chart = Highcharts.chart('container',
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
      data: [],
    }, {
      type: 'line',
      name: 'Runs',
      yAxis: 1,
      data: [],
      turboThreshold: 0,
    }, {
      type: 'line',
      name: 'Swims',
      yAxis: 2,
      data: [],
      turboThreshold: 0,
    },

    ],
  });
