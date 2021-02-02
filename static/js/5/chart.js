// https://observablehq.com/@feliperego/bar-chart-race-of-covid-19-country-level-daily-cases@3299
export default function define(runtime, observer) {
  const main = runtime.module();
  const fileAttachments = new Map([["covid19auscases.csv",new URL("./files/923cc0110d780bf7515efb58ddeeb9f8072f06e2d1eb565f52f1d350653224cce3f466930b7ceee55e6bf7949710c7a69a98692c6ef241ded5b56682b6a561b8",import.meta.url)]]);
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));
  main.variable(observer()).define(["md"], function(md){return(
md`# Bar Chart Race of COVID-19 Country Level Daily Cases 

This chart animates COVID-19 cases for the top 15 countries since late January 2020 on a daily basis. Color indicates continents and data was sourced from [Johns Hopkins University](https://github.com/CSSEGISandData/COVID-19). Inspired by https://observablehq.com/@d3/bar-chart-race `
)});
  main.variable(observer("data")).define("data", ["d3","FileAttachment"], async function(d3,FileAttachment){return(
d3.csvParse(await FileAttachment("covid19auscases.csv").text(), d3.autoType)
)});
  main.variable(observer("viewof replay")).define("viewof replay", ["html"], function(html){return(
html`<button>Replay`
)});
  main.variable(observer("replay")).define("replay", ["Generators", "viewof replay"], (G, _) => G.input(_));
  main.variable(observer("chart")).define("chart", ["replay","d3","width","height","bars","axis","labels","ticker","keyframes","duration","x","invalidation"], async function*(replay,d3,width,height,bars,axis,labels,ticker,keyframes,duration,x,invalidation)
{
  replay;

  const svg = d3.create("svg")
      .attr("viewBox", [0, 0, width, height]);

  const updateBars = bars(svg);
  const updateAxis = axis(svg);
  const updateLabels = labels(svg);
  const updateTicker = ticker(svg);

  yield svg.node();

  for (const keyframe of keyframes) {
    const transition = svg.transition()
        .duration(duration)
        .ease(d3.easeLinear);

    // Extract the top bar’s value.
    x.domain([0, keyframe[1][0].value]);

    updateAxis(keyframe, transition);
    updateBars(keyframe, transition);
    updateLabels(keyframe, transition);
    updateTicker(keyframe, transition);

    invalidation.then(() => svg.interrupt());
    await transition.end();
  }
}
);
  main.variable(observer("duration")).define("duration", function(){return(
15
)});
  main.variable(observer("n")).define("n", function(){return(
15
)});
  main.variable(observer("names")).define("names", ["data"], function(data){return(
new Set(data.map(d => d.country))
)});
  main.variable(observer("datevalues")).define("datevalues", ["d3","data"], function(d3,data){return(
Array.from(d3.rollup(data, ([d]) => d.value, d => +d.date, d => d.country))
  .map(([date, data]) => [new Date(date), data])
  .sort(([a], [b]) => d3.ascending(a, b))
)});
  main.variable(observer("rank")).define("rank", ["names","d3","n"], function(names,d3,n){return(
function rank(value) {
  const data = Array.from(names, country => ({country, value: value(country)}));
  data.sort((a, b) => d3.descending(a.value, b.value));
  for (let i = 0; i < data.length; ++i) data[i].rank = Math.min(n, i);
  return data;
}
)});
  main.variable(observer("k")).define("k", function(){return(
10
)});
  main.variable(observer("keyframes")).define("keyframes", ["d3","datevalues","k","rank"], function(d3,datevalues,k,rank)
{
  const keyframes = [];
  let ka, a, kb, b;
  for ([[ka, a], [kb, b]] of d3.pairs(datevalues)) {
    for (let i = 0; i < k; ++i) {
      const t = i / k;
      keyframes.push([
        new Date(ka * (1 - t) + kb * t),
        rank(country => (a.get(country) || 0) * (1 - t) + (b.get(country) || 0) * t)
      ]);
    }
  }
  keyframes.push([new Date(kb), rank(country => b.get(country) || 0)]);
  return keyframes;
}
);
  main.variable(observer("countryframes")).define("countryframes", ["d3","keyframes"], function(d3,keyframes){return(
d3.groups(keyframes.flatMap(([, data]) => data), d => d.country)
)});
  main.variable(observer("prev")).define("prev", ["countryframes","d3"], function(countryframes,d3){return(
new Map(countryframes.flatMap(([, data]) => d3.pairs(data, (a, b) => [b, a])))
)});
  main.variable(observer("next")).define("next", ["countryframes","d3"], function(countryframes,d3){return(
new Map(countryframes.flatMap(([, data]) => d3.pairs(data)))
)});
  main.variable(observer("bars")).define("bars", ["n","color","y","x","prev","next"], function(n,color,y,x,prev,next){return(
function bars(svg) {
  let bar = svg.append("g")
      .attr("fill-opacity", 0.8)
    .selectAll("rect");

  return ([date, data], transition) => bar = bar
    .data(data.slice(0, n), d => d.country)
    .join(
      enter => enter.append("rect")
        .attr("fill", color)
        .attr("height", y.bandwidth())
        .attr("x", x(0))
        .attr("y", d => y((prev.get(d) || d).rank))
        .attr("width", d => x((prev.get(d) || d).value) - x(0)),
      update => update,
      exit => exit.transition(transition).remove()
        .attr("y", d => y((next.get(d) || d).rank))
        .attr("width", d => x((next.get(d) || d).value) - x(0))
    )
    .call(bar => bar.transition(transition)
      .attr("y", d => y(d.rank))
      .attr("width", d => x(d.value) - x(0)));
}
)});
  main.variable(observer("labels")).define("labels", ["n","x","prev","y","next","textTween"], function(n,x,prev,y,next,textTween){return(
function labels(svg) {
  let label = svg.append("g")
      .style("font", "bold 12px var(--sans-serif)")
      .style("font-variant-numeric", "tabular-nums")
      .attr("text-anchor", "start")
    .selectAll("text");

  return ([date, data], transition) => label = label
    .data(data.slice(0, n), d => d.country)
    .join(
      enter => enter.append("text")
        .attr("transform", d => `translate(${x((prev.get(d) || d).value)},${y((prev.get(d) || d).rank)})`)
        .attr("y", y.bandwidth()/2)
        .attr("x", 6)
        .attr("dy", "-0.25em")
        .text(d => d.country)
        .call(text => text.append("tspan")
          .attr("fill-opacity", 0.7)
          .attr("font-weight", "normal")
          .attr("x", 6)
          .attr("dy", "1.15em")),
      update => update,
      exit => exit.transition(transition).remove()
        .attr("transform", d => `translate(${x((next.get(d) || d).value)},${y((next.get(d) || d).rank)})`)
        .call(g => g.select("tspan").tween("text", d => textTween(d.value, (next.get(d) || d).value)))
    )
    .call(bar => bar.transition(transition)
      .attr("transform", d => `translate(${x(d.value)},${y(d.rank)})`)
      .call(g => g.select("tspan").tween("text", d => textTween((prev.get(d) || d).value, d.value))));
}
)});
  main.variable(observer("textTween")).define("textTween", ["d3","formatNumber"], function(d3,formatNumber){return(
function textTween(a, b) {
  const i = d3.interpolateNumber(a, b);
  return function(t) {
    this.textContent = formatNumber(i(t));
  };
}
)});
  main.variable(observer("formatNumber")).define("formatNumber", ["d3"], function(d3){return(
d3.format(",d")
)});
  main.variable(observer("axis")).define("axis", ["margin","d3","x","barSize","n","y"], function(margin,d3,x,barSize,n,y){return(
function axis(svg) {
  const g = svg.append("g")
      .attr("transform", `translate(0,${margin.top})`);

  const axis = d3.axisTop(x)
      .ticks()
      .tickSizeOuter(0)
      .tickSizeInner(-barSize * (n + y.padding()));

  return (_, transition) => {
    g.transition(transition).call(axis);
    g.select(".tick:first-of-type text").remove();
    g.selectAll(".tick:not(:first-of-type) line").attr("stroke", "white");
    g.select(".domain").remove();
  };
}
)});
  main.variable(observer("ticker")).define("ticker", ["barSize","width","margin","n","formatDate","keyframes"], function(barSize,width,margin,n,formatDate,keyframes){return(
function ticker(svg) {
  const now = svg.append("text")
      .style("font", `bold ${barSize}px var(--sans-serif)`)
      .style("font-variant-numeric", "tabular-nums")
      .attr("text-anchor", "end")
      .attr("x", width - 6)
      .attr("y", margin.top + barSize * (n - 0.45))
      .attr("dy", "0.32em")
      .text(formatDate(keyframes[0][0]));

  return ([date], transition) => {
    transition.end().then(() => now.text(formatDate(date)));
  };
}
)});
  main.variable(observer()).define(["datevalues"], function(datevalues){return(
datevalues[40]
)});
  main.variable(observer("formatDate")).define("formatDate", ["d3"], function(d3){return(
d3.utcFormat("%d %b %Y")
)});
  main.variable(observer("color")).define("color", ["d3","data"], function(d3,data)
{
  const scale = d3.scaleOrdinal(d3.schemeTableau10);
  if (data.some(d => d.continent !== undefined)) {
    const continentByName = new Map(data.map(d => [d.country, d.continent]))
    scale.domain(Array.from(continentByName.values()));
    return d => scale(continentByName.get(d.country));
  }
  return d => scale(d.country);
}
);
  main.variable(observer("x")).define("x", ["d3","margin","width"], function(d3,margin,width){return(
d3.scaleLinear([0, 1], [margin.left, width - margin.right])
)});
  main.variable(observer("y")).define("y", ["d3","n","margin","barSize"], function(d3,n,margin,barSize){return(
d3.scaleBand()
    .domain(d3.range(n + 1))
    .rangeRound([margin.top, margin.top + barSize * (n + 1 + 0.1)])
    .padding(0.1)
)});
  main.variable(observer("height")).define("height", ["margin","barSize","n"], function(margin,barSize,n){return(
margin.top + barSize * n + margin.bottom
)});
  main.variable(observer("barSize")).define("barSize", function(){return(
42
)});
  main.variable(observer("margin")).define("margin", function(){return(
{top: 16, right: 80, bottom: 6, left: 5}
)});
  main.variable(observer("d3")).define("d3", ["require"], function(require){return(
require("d3@5", "d3-array@2", "d3-svg-annotation@2")
)});
  return main;
}
