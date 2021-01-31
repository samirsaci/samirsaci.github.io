// Sankey Animation Particles
//// Setup /////////////////////////////////////////////////
////////////////////////////////////////////////////////////
let particles = [];
let particleLeafIndexes;
let root, leaves;
let timer;
let chartWidth, width;

const particleCountIncrement = 1;                                               // La vitesse par particule
const particleAnimationDuration = 2000;

const chartHeight = 680;
const margin = { top: 10, right: 300, bottom: 10, left: 10 };
const height = chartHeight - margin.top - margin.bottom;
const barLabelWidth = 90;
const dpr = window.devicePixelRatio || 1;

const radius = 1.5;                                                             // Circle
const linkWidth = 16;
const nodeWidth = radius * 2;

const particleValue = 1;

const cluster = d3.cluster().separation((a, b) => 1);
const xBarScale = d3.scaleLinear();

const container = d3
  .select(".chart-wrapper")
  .style("height", `${chartHeight}px`);
const backgroundSVG = container.append("svg").attr("height", chartHeight);
const canvas = container.append("canvas").attr("height", chartHeight * dpr);
const context = canvas.node().getContext("2d");
const foregroundSVG = container.append("svg").attr("height", chartHeight);

const gLinks = backgroundSVG
  .append("g")
  .attr("class", "links")
  .attr("transform", `translate(${margin.left},${margin.top})`);

const g = foregroundSVG
  .append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);
const gNodes = g.append("g").attr("class", "nodes");
const gBars = g.append("g").attr("class", "bars");

window.addEventListener("resize", resize);

// Init
d3.json("/static/js/2/cares.json").then((data) => {
  ({ root, leaves } = processData(data));
  particleLeafIndexes = generateParticleLeafIndexes(leaves);
  xBarScale.domain([0, d3.max(leaves, (d) => d.value)]);
  resize();
  timer = d3.timer(tick, 1000);
});

////////////////////////////////////////////////////////////
//// Process Data //////////////////////////////////////////
////////////////////////////////////////////////////////////
function processData(data) {
  const root = d3.hierarchy(data);
  const colors = d3.schemeTableau10;
  root.each((d) => {
    if (d.depth === 0) d.color = colors[colors.length - 1];
    if (d.depth === 1)
      d.color = colors[d.parent.children.findIndex((e) => e === d)];
    if (d.depth === 2) d.color = d.parent.color;
  });
  const leaves = root.leaves().map((d, i) => ({
    id: i,
    name: d.data.name,
    color: d.color,
    value: d.data.value,
    count: Math.ceil(d.data.value / particleValue), // The final particle of each channel can represent less than 0.1
    started: 0,
    ended: 0,
  }));
  return { root, leaves };
}

function generateParticle(elapsed) {
  const leafIndex = particleLeafIndexes.pop();
  return {
    time: elapsed,
    offset: (Math.random() - 0.5) * (linkWidth - radius * 2),
    progress: 0,
    leaf: leaves[leafIndex],
  };
}

function generateParticleLeafIndexes(leaves) {
  return d3.shuffle(d3.merge(leaves.map((d) => new Array(d.count).fill(d.id))));
}

////////////////////////////////////////////////////////////
//// Animation /////////////////////////////////////////////
////////////////////////////////////////////////////////////
function tick(elapsed) {
  particles = particles.filter((d) => {
    d.progress = (elapsed - d.time) / particleAnimationDuration;
    if (d.progress < 1) return true;
    d.leaf.ended++;
    return false;
  });

  for (let i = 0; i < particleCountIncrement; i++) {
    if (particleLeafIndexes.length > 0) {
      const particle = generateParticle(elapsed);
      particles.push(particle);
    }
  }

  if (particles.length === 0) {
    d3.timeout(() => {
      timer.stop();
    }, 1000);
  }

  drawCanvas(elapsed);
  drawDynamicSVG();
}

////////////////////////////////////////////////////////////
//// Render ////////////////////////////////////////////////
////////////////////////////////////////////////////////////
function drawStaticSVG() {
  gLinks
    .selectAll(".link")
    .data(leaves)
    .join((enter) =>
      enter
        .append("path")
        .attr("class", "link")
        .attr("stroke-width", linkWidth)
        .each(function (d) {
          d.path = this;
        })
    )
    .attr("d", (d) => d.pathString);

  gNodes
    .selectAll(".node")
    .data(root.descendants())
    .join((enter) =>
      enter
        .append("g")
        .attr("class", "node")
        .call((g) =>
          g
            .append("line")
            .attr("class", "node-line")
            .attr("stroke-width", nodeWidth)
            .attr("stroke", (d) => d.color)
        )
        .call((g) =>
          g
            .append("text")
            .attr("class", "node-label")
            .attr("fill", "currentColor")
            .attr("text-anchor", "end")
            .attr("dx", -nodeWidth / 2 - 6)
            .attr("dy", "0.32em")
        )
    )
    .call((g) =>
      g
        .select(".node-line")
        .attr("x1", (d) => d.y)
        .attr("y1", (d) => d.x - linkWidth / 2)
        .attr("x2", (d) => d.y)
        .attr("y2", (d) => d.x + linkWidth / 2)
    )
    .call((g) =>
      g
        .select(".node-label")
        .attr("x", (d) => d.y)
        .attr("y", (d) => d.x)
        .text((d) => (d.depth === 0 ? "" : d.data.name))
    );
}

function drawDynamicSVG() {
  gBars
    .selectAll(".bar")
    .data(leaves)
    .join((enter) =>
      enter
        .append("g")
        .attr("class", "bar")
        .call((g) =>
          g
            .append("text")
            .attr("class", "bar-label")
            .attr("dx", -6)
            .attr("dy", "0.32em")
            .attr("text-anchor", "end")
            .attr("fill", "currentColor")
        )
        .call((g) =>
          g
            .append("rect")
            .attr("class", "bar-rect")
            .attr("y", -linkWidth / 2)
            .attr("height", linkWidth)
            .attr("fill", (d) => d.color)
        )
    )
    .attr("transform", (d) => `translate(0,${d.y})`)
    .call((g) =>
      g
        .select(".bar-label")
        .text(
          (d) =>
            `$${Math.min(d.value, d.ended * particleValue).toFixed(2)} billion`
        )
    )
    .call((g) =>
      g
        .select(".bar-rect")
        .attr("width", (d) =>
          xBarScale(Math.min(d.value, d.ended * particleValue))
        )
    );
}

function drawCanvas(elapsed) {
  context.save();
  context.clearRect(-radius, -radius, width + 2 * radius, height + 2 * radius);
  particles.forEach((d) => {
    const pathLength = d.leaf.path.getTotalLength() * d.progress;
    const currentPos = d.leaf.path.getPointAtLength(pathLength);
    context.beginPath();
    context.fillStyle = d.leaf.color;
    context.arc(currentPos.x, currentPos.y + d.offset, radius, 0, 2 * Math.PI);
    context.fill();
  });
  context.restore();
}

function resize() {
  chartWidth = container.node().clientWidth;
  width = chartWidth - margin.left - margin.right;

  canvas.attr("width", chartWidth * dpr);
  context.scale(dpr, dpr);
  context.translate(margin.left, margin.top);
  context.globalAlpha = 0.8;

  backgroundSVG.attr("width", chartWidth);
  foregroundSVG.attr("width", chartWidth);

  cluster.size([height, width])(root);
  calculatePaths(root, leaves);

  drawStaticSVG();
  leaves.forEach((d, i) => {
    d.y = root.leaves()[i].x;
  });
  xBarScale.range([0, margin.right - barLabelWidth]);
  gBars.attr("transform", `translate(${width + barLabelWidth},0)`);
}

function calculatePaths(root, leaves) {
  root.leaves().forEach((d, i) => {
    const path = d3.path();
    const x0 = root.y;
    const y0 = root.x;
    path.moveTo(x0, y0);
    const isOther = d.parent.depth === 0;
    const x1 = isOther ? (d.y + d.parent.y) / 2 : d.parent.y;
    const y1 = isOther ? d.x : d.parent.x;
    path.bezierCurveTo((x0 + x1) / 2, y0, (x0 + x1) / 2, y1, x1, y1);
    const x2 = d.y;
    const y2 = d.x;
    path.bezierCurveTo((x1 + x2) / 2, y1, (x1 + x2) / 2, y2, x2, y2);
    leaves[i].pathString = path.toString();
  });
}