function Diagram(params) {
  var attrs = Object.assign({
    id: Math.floor(Math.random() * 10000000),
    width: window.innerWidth,
    height: window.innerHeight,
    margin: {
      top: 5,
      left: 5,
      bottom: 5,
      right: 200
    },
    container: document.body,
    data: null
  }, params);

  var resized,
      container,
      svg,
      transitionTime = 1000,
      chart,
      nodesContainer,
      linksContainer,
      labelsContainer,
      link,
      node,
      label,
      chartWidth,
      chartHeight,
      colorScale = d3.scaleOrdinal(d3.schemeTableau10),
      color = d => colorScale(d.category === undefined ? d.name : d.category),
      format = d3.format(",.0f"),
      sankeyGeneretor,
      edgeColor = 'path',
      selectedNode = null;

  function main () {
    container = d3.select(attrs.container);
    setDimensions();
    sankeyGeneretor = sankey();

    //Add svg
    svg = container
        .patternify({ 
            tag: 'svg', 
            selector: 'chart-svg' 
        })
        .attr('width', attrs.width)
        .attr('height', attrs.height)
        .attr("viewBox", [0, 0, attrs.width, attrs.height])
    
    //Add chart group
    chart = svg
        .patternify({
            tag: 'g',
            selector: 'chart'
        })
        .attr('transform', `translate(${attrs.margin.left}, ${attrs.margin.top})`);
    
    chart.patternify({
      tag: 'rect',
      selector: 'click-rect'
    })
    .attr('opacity', 0)
    .attr('width', chartWidth)
    .attr('height', chartHeight)
    .on('click', function() {
      if (selectedNode) {
        selectedNode = null;
        highlightLinks();
      }
    })

    nodesContainer = chart.patternify({
      tag: 'g',
      selector: 'nodes'
    })
    .attr("stroke", "#000")
    .attr("stroke-width", '0.25px')
  
    linksContainer = chart.patternify({
      tag: 'g',
      selector: 'links'
    })

    labelsContainer = chart.patternify({
      tag: 'g',
      selector: 'labels',
    })
      .attr("font-family", "sans-serif")
      .attr("font-size", 9.5)

    if (attrs.data) {
      drawSankey(resized ? false : true);
    }
  }

  function drawSankey(transition = true) {
    const {nodes, links} = sankeyGeneretor(attrs.data);

    drawNodes(nodes);
    drawLinks(links, transition);
    drawLabels(nodes);
  }

  function getTooltipContent(d) {
    return `<div>
      ${d.name} -  <span class="inline-value">${format(d.value)}</span>
    </div>`
  }

  function getTooltipSubCat(d) {
    const names = d.name.split(",");

    return `
      <div class="names">
        <ul>
          ${names.map(x => {
            return `
              <li>
                ${x} - <span class="inline-value">${format(attrs.data.valuesPerSubCategory[x])}</span>
              </li>
            `
          }).join("")}
        </ul>
      </div>
      <div class="value">${format(d.value)}</div>
    `
  }

  function drawNodes(nodes) {
    node = nodesContainer.patternify({
      tag: 'rect',
      selector: 'node',
      data: nodes
    }) 
      .attr('rx', 2)
      .attr('ry', 2)
      .attr("x", d => d.x0)
      .attr("y", d => d.y0)
      .attr("height", d => Math.max(1, d.y1 - d.y0))
      .attr("width", d => d.x1 - d.x0)
      .attr("fill", color)
      .on('click', function(d) {
        if (selectedNode === d.id) {
          selectedNode = null;
        } else {
          selectedNode = d.id;
        }

        if (selectedNode) {
          highlightNodeLinks(d);
        } else {
          highlightLinks(); // clear highlight with empty parameter
        }

      })
      .each(function(d) {
        if (this._tippy) {
          this._tippy.destroy();
        }
  
        tippy(this, {
          allowHTML: true,
          content: () => {
            if (d.type === 'subcategory') {
              return getTooltipSubCat(d);
            } else {
              return getTooltipContent(d);
            }
          },
          maxWidth: 200,
          arrow: true,
          theme: 'light',
          placement: 'top',
          duration: 0
        })
    })
  }

  function drawLinks(links, transition) {
    link = linksContainer.patternify({
      tag: 'g',
      selector: 'link-group',
      data: links
    })
    .style("mix-blend-mode", "multiply")
    .attr("stroke-opacity", 0.5);
  
    const gradient = link.patternify({ 
      tag: "linearGradient", 
      selector: 'gradient', 
      data: d => [d]
    })
      .attr("id", d => d.id)
      .attr("gradientUnits", "userSpaceOnUse")
      .attr("x1", d => d.source.x1)
      .attr("x2", d => d.target.x0);

    gradient.patternify({ tag: "stop", selector: 'stop-1', data: d => [d] })
        .attr("offset", "0%")
        .attr("stop-color", d => color(d.source));

    gradient.patternify({ tag: "stop", selector: 'stop-2', data: d => [d] })
        .attr("offset", "100%")
        .attr("stop-color", d => color(d.target));
  
    link.patternify({ tag: 'path', selector: 'link-path', data: d => [d] })
        .attr("d", d3.sankeyLinkHorizontal())
        .attr("stroke", d => edgeColor === "none" ? "#aaa"
            : edgeColor === "path" ? `url(#${d.id})`
            : edgeColor === "input" ? color(d.source) 
            : color(d.target))
        .attr('fill', 'none')
        .transition()
        .duration(transition ? transitionTime : 0)
        .attr("stroke-width", d => Math.max(1, d.width))
  
    link.each(function(d) {
      if (this._tippy) {
        this._tippy.destroy();
      }

      tippy(this, {
        allowHTML: true,
        content: () => {
          var targetName = d.target.name;

          if (targetName.length > 25) {
            targetName = d.target.name.substr(0, 25) + '...';
          }
          
          return `${d.source.name} → ${targetName} - <span class="inline-value">${format(d.value)}</span>`;
        },
        followCursor: true,
        arrow: true,
        theme: 'light',
        placement: 'top',
        duration: 0
      });
    });
  }

  function drawLabels(nodes) {
    label = labelsContainer.patternify({
      tag: 'text',
      selector: 'label',
      data: nodes
    })
      // .attr("x", d => d.x0 < chartWidth / 2 ? d.x1 + 6 : d.x0 - 6)
      .attr("x", d => d.x1 + 6)
      .attr("y", d => (d.y1 + d.y0) / 2)
      .attr("dy", "0.35em")
      // .attr("text-anchor", d => d.x0 < chartWidth / 2 ? "start" : "end")
      .text(d => {
        if (d.name.length <= 25) {
          return d.name;
        }
        return d.name.substr(0, 25) + '...';
      });
  }

  function sankey() {
    const sankey = d3.sankey()
        .nodeId(d => d.name)
        .nodeAlign(d3.sankeyJustify)
        .nodeWidth(15)
        .nodePadding(10)
        .extent([[1, 5], [chartWidth - 1, chartHeight - 5]]);
        
    return ({nodes, links}) => sankey({
      nodes: nodes.map(d => Object.assign({}, d)),
      links: links.map(d => Object.assign({}, d))
    });
  }

  function setDimensions () {
    var containerRect = container.node().getBoundingClientRect();

    if (containerRect.width > 0) {
        attrs.width = containerRect.width;
    }

    chartWidth = attrs.width - attrs.margin.right - attrs.margin.left;
    chartHeight = attrs.height - attrs.margin.bottom - attrs.margin.top;
  }

  function highlightLinks(links) {
    if (!links) {
      link.attr('stroke-opacity', 0.5);
      node.attr('opacity', 1);
      label.attr('opacity', 1);
      return;
    }

    const linkIdMap = {};
    const nodeMap = {};

    links.forEach(d => {
      linkIdMap[d.id] = true;
      nodeMap[d.source.id] = true;
      nodeMap[d.target.id] = true;
    });

    link.attr("stroke-opacity", d => {
      if (linkIdMap[d.id]) {
        return 0.8
      }
      return 0.1;
    })

    node.attr('opacity', d => {
      if (nodeMap[d.id]) {
        return 1;
      }
      return 0.1;
    });

    label.attr('opacity', d => {
      if (nodeMap[d.id]) {
        return 1;
      }
      return 0.1;
    })
  }

  function highlightNodeLinks(node) {
    var remainingNodes = [];
    var nextNodes = [];
    var links = [];
    
    var traverse = [{
      linkType: "sourceLinks",
      nodeType: "target"
    },
    {
      linkType: "targetLinks",
      nodeType: "source"
    }];

    traverse.forEach(function(step) {
      node[step.linkType].forEach(function(link) {
        remainingNodes.push(link[step.nodeType]);
        links.push(link);
      });

      while (remainingNodes.length) {
        nextNodes = [];
        remainingNodes.forEach(function(node) {
          node[step.linkType].forEach(function(link) {
            nextNodes.push(link[step.nodeType]);
            links.push(link);
          });
        });
        remainingNodes = nextNodes;
      }
    });

    highlightLinks(links);
  }

  main.getSize = () => {
    return [chartWidth, chartHeight];
  }

  main.render = function () {
      main();
      return main;
  }

  main.updateData = function (data) {
    attrs.data = data;
    drawSankey();
    highlightLinks();
    return main;
  }

  // enable chain syntax
  makeChain(attrs, main);

  // on window resize, rerender map
  d3.select(window).on('resize.' + attrs.id, function () {
    resized = true;
    main();
    resized = false;
  });

  return main;
}