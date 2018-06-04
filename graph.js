
const unit = 16,
    margin = {top: unit * 3, right: unit * 3, bottom: unit *3, left: unit * 3},
    svgWidth = 640,
    svgHeight = 480,
    width = 640 - margin.left - margin.right,
    height = 320 - margin.top - margin.bottom;

function parse(data) {
  let byDate = {};

  data.forEach(function(d) {
    d.value = +d.value;
    if(isNaN(d.value)) {
      d.value = .5;
    }
  });

  data.forEach(function(d) {
    if(!byDate[d.date]) byDate[d.date] = [];
    byDate[d.date].push(d);
  });

  Object.keys(byDate).forEach(function(k) {
    data.push({
      page: "Average",
      date: k,
      value: byDate[k].reduce((accum, current) => accum + current.value, 0) / byDate[k].length
    });
  });

  data.forEach(function(d) {
    d.date = new Date(d.date);
  });
};

function simulateHistogram(data) {
  // generate histogram data
  const dayMs = 86400 * 1000,
        granularity = 7;

  let histoData = [];
  let [start, end] = d3.extent(data, function(d) { return d.date; }).map((s) => new Date(s));

  for(let date = start; date < end; date = new Date(date.getTime() + dayMs * granularity)) {
    let weekWaveAmp = 50, 
        slowWaveAmp = weekWaveAmp * .25,
        randomWaveAmp = weekWaveAmp * .5,
        baseToRandomRatio = .75,

        minVotes = randomWaveAmp * baseToRandomRatio,
        randomMult = (1 - baseToRandomRatio) * Math.random(),
        range = (end - start) / (dayMs),
        weekWaveDays = 7,
        weekWavePeriod = (range / weekWaveDays),
        slowWaveDays = range * 3,
        slowWavePeriod = (range / slowWaveDays),
        alpha = (date - start) / (end - start),

        randomWave = randomWaveAmp * randomMult * (Math.sin(Math.PI * weekWavePeriod)),
        weekWave = weekWaveAmp * Math.abs(Math.sin(alpha * Math.PI * weekWavePeriod)),
        slowWave = slowWaveAmp * Math.abs(Math.sin(alpha * Math.PI * slowWavePeriod))
        ;
    histoData.push(Math.floor(
      minVotes
      + randomWave
      + weekWave
      + slowWave
      ));
  }
  return histoData;  
}

function render(data, histoData) {
    // setup svg
  let svg = d3.select("body>.main").append("svg")
      .attr("width", svgWidth)
      .attr("height", svgHeight)
    .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  const tickSize = 8;

  let color = d3.scaleOrdinal(d3.schemePaired);
  let x = d3.scaleTime().range([0, width]),
      y = d3.scaleLinear().range([height, 0]),
      xHisto = d3.scaleLinear().range([0, width]),
      yh = d3.scaleLinear().range([height, 0]),
      xAxis = d3.axisBottom(x).scale(x).tickSize(tickSize, 0).tickFormat(d3.timeFormat("%m %Y")),
      yAxis = d3.axisLeft(y).tickSize(tickSize, 0),
      yAxisRight = d3.axisRight(yh).tickSize(tickSize, 0);

  x.domain(d3.extent(data, (d) => d.date ));
  y.domain(d3.extent(data, (d) => d.value ));
  y.domain([0, 1]);
  y.domain([.35, .65]);
  xHisto.domain([0, histoData.length]);
  // yh.domain([0, d3.max(histoData, (d) => d)]);
  yh.domain([0, 100]);

  // draw x axis
  const xAxisPos = height + margin.bottom * .35;
  svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + xAxisPos + ")")
      .call(xAxis)

  // draw y axis left
  const yAxisOffsetX = - unit;
  svg.append("g")
      .attr("class", "y axis")
      .call(yAxis)
      .attr("transform", "translate(" + yAxisOffsetX + ", 0)")
    .append("text")
      .attr("class", "label-y--left")
      .attr("transform", "rotate(-90)")
      .attr("y", -4)
      .attr("dy", unit)
      .style("text-anchor", "end")
      .text("Value")

  // draw y axis right
  const yAxisRightPos = width + unit;
  svg.append("g")
      .attr("class", "y axis axis--right")
      .attr("transform", "translate( " + yAxisRightPos + "," + 0 + ")")
      .call(yAxisRight)
    .append("text")
      .attr("class", "label label-y--right")
      .attr("transform", "rotate(90)")
      .attr("y", -4)
      .attr("dy", "1.5em")
      .text("Votes")

  // draw histogram
  svg.append("g").attr("class", "histo")
    .selectAll(".bar")
    .data(histoData)
    .enter().append("rect")
      .attr("class", "bar")
      .attr("x", function(d, i) { return xHisto(i); })
      .attr("y", (d) => yh(d))
      .attr("width", Math.floor(width / histoData.length))
      .attr("height", function(d) { return height - yh(d); });

  // draw scatter plot
  svg.append("g")
      .attr("class", "scatter-plot")
    .selectAll(".dot")
      .data(data)
    .enter().append("circle")
      .attr("class", (d) => `dot dot--${d.page}`)
      .attr("r", d => d.page === "Average" ? 5.5 : 2.1)
      .attr("cx", function(d) { return x(d.date); })
      .attr("data", (d) => d.page)
      .attr("cy", function(d) { return y(d.value); })
      .style("opacity", (d) => d.page === "Average" ? "1" : "1")
      .style("fill", function(d) { return  d.page === "Average" ? "#fff" : color(d.page); });

  // draw legend
  let legendColumnWidth = 72;
  let legend = svg.append("g").attr("class", "legend").selectAll(".legend")
      .data(color.domain())
    .enter().append("g")
      .attr("class", "legend__item")
      .attr("transform", (d, i) => "translate(" + i * legendColumnWidth + ", " + -unit + ")" );
  ;

  legend.append("circle")
    .attr("cx", 0)
    .attr("r", d => d.page === "Average" ? 5 : 2)
    .attr("r", 3)
    .style("fill", color);

  legend.append("text")
    .attr("x", 8)
    .attr("y", 0)
    .attr("dy", ".35em")
    // .style("text-anchor", "end")
    .text((d) => d);

  legend.nodes().forEach(function(node, i) {
    let bbox = node.getBBox();
    let n = d3.select(node);
    n.append("rect")
      .attr("x", bbox.x)
      .attr("y", bbox.y)
      .attr("width", bbox.width)
      .attr("height", bbox.height)
      .style("fill", "red")
      .style("fill-opacity", "0")
      .style("stroke", "none")
      .style("stroke-width", "1.5px");
    n.on("mouseenter", (d) => {
        d3.selectAll(".scatter-plot").classed("single-plot", true);
        d3.selectAll(".dot").classed("current", false);
        d3.selectAll(".dot.dot--" + d).classed("current", true);
      })
      .on("mouseleave", (d) => {
        d3.selectAll(".scatter-plot").classed("single-plot", false);
        d3.selectAll(".dot").classed("current", false);
      });
  });




  function flash(name, dy) {
    return function() {
      d3.select(this).append("text")
          .attr("class", name)
          .attr("transform", "translate(" + d3.mouse(this) + ")")
          .attr("dy", dy)
          .text(name)
        .transition()
          .duration(1500)
          .style("opacity", 0)
          .remove();
    };
  }

 
  let ui = function(drawUI) {
    if(drawUI) {
      // add slider for y scale
      let sliderPos = height + margin.bottom * 2;
      let slider = svg.append("g")
        .attr("class", "slider")
        .attr("transform", "translate(" + 0 + "," + sliderPos + ")");

      slider.append("line")
          .attr("class", "track")
          .attr("x1", y.range()[0])
          .attr("x2", y.range()[1])
        .select(function() { return this.parentNode.appendChild(this.cloneNode(true)); })
          .attr("class", "track-inset")
        .select(function() { return this.parentNode.appendChild(this.cloneNode(true)); })
          .attr("class", "track-overlay")
          .call(d3.drag()
              .on("start.interrupt", function() { slider.interrupt(); })
              .on("start drag", function() { hue(x.invert(d3.event.x)); }));

      slider.insert("g", ".track-overlay")
          .attr("class", "ticks")
          .attr("transform", "translate(0," + 18 + ")")
        .selectAll("text")
        .data(x.ticks(5))
        .enter().append("text")
          .attr("x", x)
          .attr("text-anchor", "middle")
          .text(function(d) { return d; });

      var handle = slider.insert("circle", ".track-overlay")
          .attr("class", "handle")
          .attr("r", 5);

      slider.transition() // Gratuitous intro!
          .duration(750)
          .tween("hue", function() {
            var i = d3.interpolate(0, 70);
            return function(t) { hue(i(t)); };
          });

      function hue(h) {
        handle.attr("cx", x(h));
        // svg.style("background-color", d3.hsl(h, 0.8, 0.8));
      }  
    }
  }
  ui(0);

  let bbox = legend.node().getBBox();
}

// scatter plot
d3.tsv("likes.tsv", function(error, data) {
  if (error) throw error;

  parse(data);
  let histoData = simulateHistogram(data);
  render(data, histoData);


    // .attr("transform", function(d, i) {
    //   let that = d;
      
    //   return "translate(" + d.getComputedTextLength() + 16 + ", " + -unit + ")"
    // })
    ;
});