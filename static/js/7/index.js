const margin = {top: 40, right: 40, bottom: 100, left: 50},
      width = 700 - margin.left - margin.right,
      height = 600 - margin.top - margin.bottom;

const circleRadius = 3, // 4
      circlePadding = 0.5;

// Annotation
const type = d3.annotationCalloutCircle;

var c = d3.scaleOrdinal(d3.schemeCategory10);

const svg = d3.select('#chart').append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom);

const g = svg.append('g')
    .attr('transform', `translate(${margin.left}, ${margin.top})`);

const y = d3.scaleLinear()
    .range([height, 0]);

d3.json('/static/data/7/rotation.json', (error, json) => {
  if (error) throw error;

  // Highest volume ref
  const all = json[0];
  // Data for occupations
  const data = json; // json.slice(1)

  y.domain([
    Math.floor(d3.min(data, d => d.value_1)), //  / 10000) * 10000,
    Math.ceil(d3.max(data, d => d.value_1)),  //  / 10000) * 10000,
  ]);

  // Sort data from highest to lowest pcs qty
  data.sort((a, b) => b.value_1 - a.value_1);
  data.forEach(d => {
    d.x = width / 2;
    d.y = y(d.value_1);
  });

  const simulation = d3.forceSimulation(data)
      .force('x', d3.forceX(width / 2)) // width / 2
      .force('y', d3.forceY(d => y(d.value_1))
          .strength(4))
      .force('collide', d3.forceCollide(circleRadius + circlePadding)
          .strength(1)
          .iterations(5))
      .stop();

  for (let i = 0; i < 120; i++) simulation.tick();

  g.append('g')
      .attr('class', 'axis axis-y')
      .call(d3.axisLeft(y)
          .tickFormat(d => d3.format(',')(d))) //
      .selectAll('.tick line')
        .attr('x2', width)


  const voronoi = d3.voronoi()
      .extent([[-margin.left, -margin.top], [width + margin.right, height + margin.top]])
      .x(d => d.x)
      .y(d => d.y);

  const cell = g.append('g')
      .attr('class', 'cells')
    .selectAll('g.cell')
    .data(voronoi.polygons(data))
    .enter().append('g')
      .attr('class', 'cell')
      .on('mouseover', d => {
        if (![data[0], data[data.length - 1]].map(d => d.value_1).includes(d.data.value_1)) {
          tooltip(d.data);
        }
      });
  
  g.on('mouseout', d => tip.selectAll('g').remove());
  
  cell.append('path')
    .attr('d', d => `M${d.join("L")}Z`);
  
  // Draw circle
  cell.append('circle')
      .attr('id', (d, i) => `circle-${i}`)
      .attr('r', circleRadius)
      .attr('cx', d => d.data.x)
      .attr('cy', d => d.data.y)
      .style("fill-opacity", 1)
      .style("fill", d=> c(d.data.high_runner)); 

  // Focus on the top SKU
  const annotations = [data[0]].map(d => {
    return {
      data: d,
      dx: 50,
      dy: 20,
      color: '#1b0180',
      note: {
        title: 'Item Code: ' + d.description_1 + ' Brand: ' + d.description_2,
        label:  d.value_3 + ' (% Pcs)'
      },
      subject: {
        radius: circleRadius,
        radiusPadding: circlePadding
      }
    }
  });

  const makeAnnotations = d3.annotation()
    .type(type)
    .accessors({
      x: d => d.x,
      y: d => d.y
    })
    .annotations(annotations);

  document.fonts.ready.then(() => {
    g.append("g")
      .attr("class", "annotation-group")
      .call(makeAnnotations)
  })

  // Tooltip
  const tip = g.append('g')
      .attr('class', 'tooltip');

  const tooltip = (d) => {
    tip.call(d3.annotation()
      .type(type)
      .accessors({
        x: d => d.x,
        y: d => d.y
      })
      .annotations([{
        data: d,
        dx: d.x > width / 2 ? 50 : -50,
        dy: d.y > height / 2 ? -30 : 30,
        color: '#1b0180',
        note: {
          title: 'Item Code: ' + d.description_1 + ' Brand: ' + d.description_2,
          label:  d.value_3 + ' (% Pcs)'
        },
        subject: {
          radius: circleRadius,
          radiusPadding: circlePadding
        }
      }]));
  }

});