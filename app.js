var rollup = 'monthly';
var data = [];
var minDistance = 10000;
dataById = {};

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

function handleSliders() {
  sliders = document.querySelectorAll('input[type=range]');
  for (let i = 0; i < sliders.length; i++) {
    const id = sliders[i].id;
    sliders[i].addEventListener('input', (e) => {
      document.getElementById(id + "-display").innerHTML = sliders[i].value;
      minDistance = sliders[i].value;
      if (minDistance == 0) {
        minDistance = 10000;
      }
      redraw();
    });
  }
}

function colorMatching(distance) {
}

function handleJson() {
  const file = this.files[0];
  const reader = new FileReader();
  reader.onload = event => {
    data = JSON.parse(reader.result).map(i => transformToMinimal(i));
    data.forEach(datum => {
      dataById[datum.ids[0]] = datum;
    });
    redraw();
  };
  reader.readAsText(file);
}

function redraw() {
  chart.series[0].setData(
      doRollup(data.filter(d => d.type == 'Ride')).map(d => transformToHighcharts(d, miles)));
  chart.series[1].setData(
      doRollup(data.filter(d => d.type == 'Run')).map(d => transformToHighcharts(d, miles)));
//  chart.series[2].setData(
//      doRollup(data.filter(d => d.type == 'Swim')).map(d => transformToHighcharts(d, yards)));
}

/**
 * @return {
 *   name: string,
 *   distance: float,
 *   timestamp: date
 *   type: {Ride|Run|Swim|various others},
 *   ids: [int]:length 1
 *   hasPhotos: bool
 *   }
 */
function transformToMinimal(stravaActivity) {
  return {
    name: stravaActivity["name"],
    distance: stravaActivity["distance"],
    timestamp: new Date(stravaActivity["start_date"]),
    type: stravaActivity["type"],
    ids: [stravaActivity["id"]],
    hasPhotos: !!stravaActivity["total_photo_count"]
  };
}

function transformToHighcharts(minimal, distFunc) {
  let dist = distFunc(minimal.distance);
  return {
    y: dist,
    x: new Date(minimal.timestamp.toDateString()).getTime(),
    name: minimal.name,
    ids: [...minimal.ids],
    marker: minimal.marker,
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
  newActivity.ids = [...newActivity.ids]
  var newActivities = [];
  for (var i = 1; i < activityData.length; i++) {
    const activity = activityData[i];
    const timestamp = new Date(activity.timestamp.toDateString());
    if (timestamp < nextDate) {
      newActivity.distance += activity.distance;
      newActivity.name += "<br>" + getActivityHtml(activity); 
      newActivity.ids.push(activity.ids[0])
    } else {
      newActivities.push(newActivity);
      let newStartDate = nextDate;
      while (nextDate <= timestamp) {
        let possibleDate = nextDate;
        nextDate = getNextDate(nextDate);
        if (nextDate.getTime() != getNextDate(timestamp).getTime()) {
          newStartDate = nextDate;
          newActivities.push({
            name: nextDate.toISOString().slice(0,10),
            distance: 0,
            timestamp: possibleDate,
            type: activity.type,
            ids: [activity.ids[0]],
          });
        }
      }
      newActivity = { ...activity };
      newActivity.ids = [...newActivity.ids]
      newActivity.name = newStartDate.toISOString().slice(0,10) + "<br>"+ getActivityHtml(newActivity);
      newActivity.timestamp = newStartDate;
    }
    if (miles(activity.distance) > minDistance) {
      newActivity.marker = {
        fillColor: '#FF0000',
      };
    }
  }
  newActivities.push(newActivity);
  return newActivities;
}

function getActivityHtml(activity) {
  name = activity.name;
  console.log(activity.hasPhotos);
  if (activity.hasPhotos) {
    name += " (photos)";
  }
  return name;
}

function getNextDate(timestamp) {
  let newDate = new Date(timestamp.toDateString());
  if (rollup == 'daily') {
    newDate.setDate(newDate.getDate() + 1);
  } else if (rollup == 'weekly') {
    var curDate = newDate.getDay();
    // Strava week is Mon - Sun
    if (curDate == 0) {
      curDate = 7;
    }
    curDate -= 1;
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
handleSliders();

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
    }, /*{
      labels: {
        format: '{value} yards',
      },
      title: {
        text: 'Swimming',
      }
    }*/],
    plotOptions: {
      line: {
        marker: {
          enabled: true,
        },
        events: {
          click: function(ev) {
            const ids = ev.point.ids;
            const ul = document.createElement('ul');
            ids.forEach(id => {
              datum = dataById[id]
              const li = document.createElement('li');
              let photo = '';
              if (datum.hasPhotos) {
                photo = "<div class='activity-icon'></div>"
              }
              li.innerHTML =
                `<div class="activity-row">
                   <div class="activity-name"><a href='https://strava.com/activities/${id}'>${datum.name}</a></div>
                   ${photo}
                   <div class="activity-distance ${miles(datum.distance) > minDistance ? 'distance-far' : ''}">${(datum.distance/1609.34).toFixed(2)}</div> 
                   <div>mi</div>
                 </div>
                 <div class="activity-row">
                   <div class="activity-time">${datum.timestamp.toLocaleString()}</div>
                 </div>
                    `
              ul.appendChild(li);
            });
            document.getElementById("extra-info-container").replaceChildren(ul);
          }
        }
      },
    },

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
    },
    /*  {
      type: 'line',
      name: 'Swims',
      yAxis: 2,
      data: [],
      turboThreshold: 0,
    },*/

    ],
  });
