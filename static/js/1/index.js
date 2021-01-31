
// Radar Plot
//// Initial Set Up ///////////////////////////////////////
const margin = {top: 0, right: 100, bottom: 0, left: 50},
			width = 750 - margin.left - margin.right,
			height = 525 - margin.top - margin.bottom,
			legendMargin = {top: 10, right: 20, bottom: 10, left: 20},
			legendWidth = 500 - legendMargin.left - legendMargin.right,
			legendHeight = 100 - legendMargin.top - legendMargin.bottom,
			legendInnerHeight = 75,
			radius = Math.min(width / 2.5, height / 2.5, 200),								// Radius of radar chart
			levels = 5, 																	// Levels of inner polygons
			levelLabelOffsety = 10,
			labelFactor = 1.20, 																// Label position compared to largest polygon radius
			wrapWidth = 90, 																// label maximum width
			opacityArea = 0.4, 																// Opacity of the area blob
			dotRadius = 3, 																	// Radius of the data point circle
			strokeWidth = 1, 																// Width of the stroke around the area blob
			legendDotRadius = 10; 															// Radius of the legend item circle




// Create render function
const render = data => {

	const classNames = data.map(d => d.className),											// Name of each class
			maxValue = d3.max(data, d => d3.max(d.axes, e => e.value)), 					// Value of the largest polygon
			axisNames = data[0].axes.map(d => d.axis), 										// Name of each axis
			axisTotal = axisNames.length, 													// Number of axes
			format = d3.format(".0%"), 														// Percent format
			angleSlice = Math.PI * 2 / axisTotal; 											// Width in radius of each slice

	// Scales
	const rScale = d3.scaleLinear()
			.range([0, radius])
			.domain([0, maxValue]);

	const colorScale = d3.scaleOrdinal()
			.range(["#D47371", "#DDB375", "#58C2C7"])
			.domain(classNames);

	// SVG container
	const svg = d3.select("#chart")
		.append("svg")
			.attr("width", width + margin.left + margin.right)
			.attr("height", height + margin.top + margin.bottom);

	const g = svg.append("g")
			.attr("class", "radar-chart")
			.attr("transform", `translate(${margin.left + width / 2}, ${margin.top + height / 2})`); //`translate(${margin.left + width / 2}, ${margin.top + height / 2})`


	//// Draw the Levels //////////////////////////////////////
	// Level wrapper
	const levelWrapper = g.append("g").attr("class", "level-wrapper");
	const levelValues = d3.range(1, levels + 1).reverse()
		.map(d => maxValue / levels * d);
	
	// Draw the level lines using curveLinear: {curveLinearClosed, curveLinear, curveCardinalClosed, curveBasisClosed}
	const levelLine = d3.lineRadial()
			.curve(d3.curveCardinalClosed)
			.radius(d => rScale(d))
			.angle((d, i) => i * angleSlice);

	levelWrapper.selectAll(".level-line")
		.data(levelValues.map(d => Array(axisTotal).fill(d)))
		.enter().append("path")
			.attr("class", "level-line")
			.attr("d", levelLine)
			.style("fill", "none")
	// Text indicating level values
	levelWrapper.selectAll(".level-value")
		.data(levelValues)
		.enter().append("text")
			.attr("class", "level-value")
			.attr("x", d => 0)
			.attr("y", d => -rScale(d) - levelLabelOffsety)
			.attr("dy", "0.32em")
			.text(d => format(d)); //format

	//// Draw the axes ////////////////////////////////////////
	// Axis wrapper
	const axisWrapper = g.append("g").attr("class", "axis-wrapper");
	const axis = axisWrapper.selectAll(".axis")
		.data(axisNames)
		.enter().append("g")
			.attr("class", "axis");
	// Draw axis lines
	axis.append("line")
			.attr("class", "axis-line")
			.attr("x1", 0)
			.attr("y1", 0)
			.attr("x2", (d, i) => rScale(maxValue * 1.0) * Math.cos(angleSlice * i - Math.PI / 2))
			.attr("y2", (d, i) => rScale(maxValue * 1.0) * Math.sin(angleSlice * i - Math.PI / 2))
	// Text indicating axis name
	axis.append("text")
			.attr("class", "axis-name")
			.attr("x", (d, i) => rScale(maxValue * labelFactor) * Math.cos(angleSlice * i - Math.PI / 2))
			.attr("y", (d, i) => rScale(maxValue * labelFactor) * Math.sin(angleSlice * i - Math.PI / 2))
			.attr("dy", "0.35em")
			.style("text-anchor", "middle")
			.text(d => d)
			.call(wrap, wrapWidth);

	//// Draw the Blobs ///////////////////////////////////////
	// {curveLinearClosed, curveLinear, curveCardinalClosed, curveBasisClosed}
	const radarLine = d3.lineRadial()
			.curve(d3.curveLinearClosed)
			.radius(d => rScale(d.value))
			.angle((d, i) => i * angleSlice);
	// Blob wrapper
	const blobWrapper = g.append("g")
			.attr("class", "all-blobs-wrapper")
		.selectAll(".blob-wrapper")
		.data(data)
		.enter().append("g")
			.attr("class", d => "blob-wrapper blob-wrapper-" + hyphenWords(d.className));
	// Draw blob areas
	blobWrapper.append("path")
			.attr("class", d => "blob-area blob-area-" + hyphenWords(d.className))
			.attr("d", d => radarLine(d.axes))
			.style("fill", d => colorScale(d.className))
			.style("fill-opacity", opacityArea)
			.style("stroke", d => colorScale(d.className))
			.style("stroke-width", strokeWidth);
	// Blob circle wrapper
	const circleWrapper = blobWrapper.selectAll(".circle-wrapper")
		.data(d => d.axes.map(e => {
			e.className = d.className;
			return e;
		}))
		.enter().append("g")
			.attr("class", d => "circle-wrapper circle-wrapper-" + hyphenWords(d.className))
			.attr("transform", (d, i) => `translate(
				${rScale(d.value) * Math.cos(angleSlice * i - Math.PI / 2)},
				${rScale(d.value) * Math.sin(angleSlice * i - Math.PI / 2)})`);
	// Draw blob circles
	circleWrapper.append("circle")
			.attr("class", d => "circle circle-" + hyphenWords(d.className))
			.attr("r", dotRadius)
			.style("fill", d => colorScale(d.className))
			.style("stroke", d => colorScale(d.className))
			.style("stroke-width", 0);
	// Text indicating value of each blob circle
	circleWrapper.append("text")
			.attr("class", d => "value value-" + hyphenWords(d.className))
			.attr("x", 10)
			.attr("dy", "0.35em")
			.text(d => format(d.value))
			.style("opacity", 0); // Hide the values, only show them when hover over the legend


	//// Transition Layer /////////////////////////////////////
	// Additional blob area for a smooth transition
	const transitionBlob = g.append("path")
			.attr("class", "transition-area");


	//// Legend ///////////////////////////////////////////////
	// Legend container
	const legend = d3
		.select("#legend")
			// .style("stroke-width", 1)
		.append("svg")
			.attr("width", legendWidth + legendMargin.left + legendMargin.right)
			.attr("height", legendHeight + legendMargin.top + legendMargin.bottom)
			// .style("border","4.5px solid darkblue")
			// .style("background-color",'#ffffff')
		.append("g")
			.attr("transform", `translate(${legendMargin.left}, ${legendMargin.top})`)
	// Legend y scale for layout
	const legendYScale = d3.scalePoint()
			.range([0, legendInnerHeight])
			.domain(classNames)
			.padding(0.5);
	// Legend item wrapper
	const legendItemWrapper = legend.selectAll("legend-item-wrapper")
		.data(classNames)
		.enter().append("g")
			.attr("class", d => "legend-item-wrapper legend-item-wrapper-" + hyphenWords(d))
	// Translate function
			.attr("transform", d => `translate(0, ${legendYScale(d)})`);
	legendItemWrapper.append("rect")
			.attr("class", d => "legend-item-circle legend-item-rect-" + hyphenWords(d))
			.attr("width", legendDotRadius)
			.attr("height", legendDotRadius)
			.attr("x", 0) // legendDotRadius
			.attr("y", -legendDotRadius/2)
			.style("fill", d => colorScale(d));
	// Legend item text
	legendItemWrapper.append("text")
			.attr("class", d => "legend-item-text legend-item-text-" + hyphenWords(d))
			.attr("x", legendDotRadius * 3)
			.attr("y", 0)
			.attr("dy", "0.32em")
			.text(d => d)
			.style("fill", d => colorScale(d));
	// Invisible rect to capture mouse event
	legendItemWrapper.append("rect")
			.attr("class", d => "legend-item-rect legend-item-rect-" + hyphenWords(d))
			.attr("x", 0)
			.attr("y", d => -legendYScale.step() / 2)
			.attr("width", legendWidth)
			.attr("height", legendYScale.step())
			.style("fill", "none")
			.style("pointer-events", "all")
			.on("mouseenter", mouseenterLegendItem)
			.on("mouseleave", mouseleaveLegendItem);

// ---------

	//// Event Listeners //////////////////////////////////////
	function mouseenterLegendItem(classNameRaw) {
		// Is initial entering legend
		const isInitial = d3.select(".transition-area").attr("d") === null;
		// Do not transition the blob area when initial entering legend
		const blobTransitionTime = isInitial ? 0 : 500;
		const className = hyphenWords(classNameRaw);
		const t1 = d3.transition().duration(200),
					t2 = d3.transition().duration(blobTransitionTime).delay(200);
		// Bring transition layer to the front
		d3.select(".transition-area").raise();
		// Legend item circle size increases
		d3.select(".legend-item-rect-" + className)
			.transition(t1)
			.attr("width", legendDotRadius * 1.5)
			.attr("height", legendDotRadius * 1.5)
			.attr("x", 0) // legendDotRadius
			.attr("y", -legendDotRadius * 1.5/2);
		// Legend item text color changes to blue
		// d3.select(".legend-item-text-" + className)
		// 	.transition(t1)
		// 		.style("fill", "blue");
		// Dim all blob areas, blob outlines, blob circles
		d3.selectAll(".blob-area")
			.transition(t1)
				.style("fill-opacity", 0.1)
				.style("stroke-opacity", 0.3);
		d3.selectAll(".circle")
			.transition(t1)
				.style("opacity", 0.3)
				.style("fill", function() { return colorScale(d3.select(this).datum().className); })
				.style("stroke-width", 0);
		// Highlight the specific className blob line
		d3.select(".transition-area")
			.datum(data.filter(d => d.className === classNameRaw)[0])
			.transition(t1)
				.duration(blobTransitionTime)
				.attr("d", d => radarLine(d.axes))
				.style("fill", d => colorScale(d.className))
				.style("fill-opacity", opacityArea)
				.style("stroke", d => colorScale(d.className))
				.style("stroke-width", strokeWidth)
				.on("end", () => {
						// Bring the blobWrappers to the front
						d3.select(".all-blobs-wrapper").raise();
						// Bring the specific className blobWrapper to the front
						d3.select(".blob-wrapper-" + className).raise();
				});
		// Highlight the specific className blob circles, blob texts
		d3.selectAll(".circle-" + className)
			.transition(t2)
				.style("opacity", 1)
				// .style("fill", "#37373D") // Fill with background color
				.style("stroke-width", strokeWidth);
		d3.selectAll(".value-" + className)
			.transition(t2)
				.style("opacity", 1);
	}

	function mouseleaveLegendItem(d) {
		const className = hyphenWords(d);
		const t = d3.transition().duration(200);
		// Legend item circle size changes back
		// d3.select(".legend-item-circle-" + className)
		// 	.transition(t)
		// 		.attr("r", legendDotRadius);
		d3.select(".legend-item-rect-" + className)
			.transition(t)
				.attr("width", 1.0 * legendDotRadius)
				.attr("height", 1.0 * legendDotRadius)
				.attr("x", 0) // legendDotRadius
				.attr("y", -legendDotRadius/2);
		// Legend item text color changes back to #5F5F64
		d3.select(".legend-item-text-" + className)
			.transition(t)
				.style("fill", d => colorScale(d));
		// Bring back all blob areas, blob outlines, blob circles, blob text
		d3.selectAll(".blob-area")
			.transition(t)
				.style("fill-opacity", opacityArea)
				.style("stroke-opacity", 1);
		d3.selectAll(".circle")
			.transition(t)
				.style("opacity", 1)
				.style("fill", function() { return colorScale(d3.select(this).datum().className); })
				.style("stroke-width", 0);
		d3.selectAll(".value")
			.transition(t)
				.style("opacity", 0);
	}

	//// Helper Function //////////////////////////////////////
	// Wrap svg text
	function wrap(text, width) {
		text.each(function() {
			let text = d3.select(this),
					words = text.text().split(/\s+/).reverse(),
					word,
					line = [],
					lineNumber = 0,
					lineHeight = 1.4, // ems
					y = text.attr("y"),
					x = text.attr("x"),
					dy = parseFloat(text.attr("dy")),
					tspan = text.text(null).append("tspan").attr("x", x).attr("y", y).attr("dy", dy + "em");

			while (word = words.pop()) {
				line.push(word);
				tspan.text(line.join(" "));
				if (tspan.node().getComputedTextLength() > width) {
					line.pop();
					tspan.text(line.join(" "));
					line = [word];
					tspan = text.append("tspan").attr("x", x).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
				}
			}
		});
	}
	// Turn className from data into lowercase words joined by hyphens
	function hyphenWords(words) {
		return words.toLowerCase().replace(/ /g, "-");
	}

}

//
d3.json("/static/js/1/data.json", function(data) {
	render(data);
});
