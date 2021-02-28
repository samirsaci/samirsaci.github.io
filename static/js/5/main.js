function startRace() {
	// https://observablehq.com/@d3/bar-chart-race-explained
	//// Setup /////////////////////////////////////////////////
	const svgWidth = 800;
	const svgHeight = 500; //720
	const margin = { top: 80, right: 16, bottom: 16, left: 16 };
	const width = svgWidth - margin.left - margin.right;
	const height = svgHeight - margin.top - margin.bottom;
	const barPadding = 0.1;

	// Remove the bar race chart if it exists
	if (d3.select("#bar-chart-race"))
		d3.select("svg").remove();

	// Top N
	const n = 10;
	// Keyframes per year
	const k = 10;
	// Duration between keyframes
	const duration = 100;

	const formatNumber = d3.format(",d");
	const formatDate = d3.utcFormat("%Y");

	const svg = d3
		.select("main")
		.append("svg")
		.attr("id", "bar-race-chart")
		.attr("width", svgWidth)
		.attr("height", svgHeight);

	const g = svg
		.append("g")
		.attr("transform", `translate(${margin.left},${margin.top})`);

	const x = d3.scaleLinear().range([0, width]);

	const y = d3
		.scaleBand()
		.domain(d3.range(n + 1))
		.range([0, (height / n) * (n + 1 + barPadding)])
		.padding(barPadding);

	const headTitle = g.append("text")
					.attr("class", "title")
					.attr("id", "head-title")
					.attr("y", -margin.top)
					.attr("dy", "1.2em")
					.text("Best Global Brands");

	const subtitle = g
		.append("text")
		.attr("class", "subtitle")
		.attr("y", -16)
		.text("Value in $M");

	//// Data //////////////////////////////////////////////////
	d3.csv("static/data/5/category-brands.csv", d3.autoType).then(data => {
		// console.log({ data });

		const names = new Set(data.map(d => d.name));
		const categoryByName = new Map(data.map(d => [d.name, d.category]));

		// console.log({ names });
		// console.log({ categoryByName });

		const datevalues = Array.from(
			d3.rollup(
				data,
				([d]) => d.value,
				d => +d.date,
				d => d.name
			)
		)
			.map(([date, data]) => [new Date(date), data])
			.sort(([a], [b]) => d3.ascending(a, b));
		// console.log({ datevalues });

		function rank(value) {
			const data = Array.from(names, name => ({
				name,
				value: value(name) || 0
			}));
			data.sort((a, b) => d3.descending(a.value, b.value));
			data.forEach((d, i) => (d.rank = Math.min(i, n)));
			return data;
		}

		// 
		const keyframes = (() => {
			const keyframes = [];
			let ka, a, kb, b;
			for ([[ka, a], [kb, b]] of d3.pairs(datevalues)) {
				for (let i = 0; i < k; i++) {
					const t = i / k;
					keyframes.push([
						new Date(ka * (1 - t) + kb * t),
						rank(name => a.get(name) * (1 - t) + b.get(name) * t)
					]);
				}
			}
			keyframes.push([new Date(kb), rank(name => b.get(name))]);
			return keyframes;
		})();
		// console.log({ keyframes });

		const nameframes = d3.groups(
			keyframes.flatMap(([, data]) => data),
			d => d.name
		);
		// console.log({ nameframes });

		const prev = new Map(
			nameframes.flatMap(([, data]) => d3.pairs(data, (a, b) => [b, a]))
		);
		const next = new Map(nameframes.flatMap(([, data]) => d3.pairs(data)));
		// console.log({ prev, next });

		//// Initialization ////////////////////////////////////////
		async function init() {
			const updateBars = bars();
			const updateAxis = axis();
			const updateLabels = labels();
			const updateTicker = ticker();

			for (const keyframe of keyframes) {
				const transition = svg
					.transition()
					.duration(duration)
					.ease(d3.easeLinear);

				// Extract the top bar’s value.
				x.domain([0, keyframe[1][0].value]);

				updateBars(keyframe, transition);
				updateAxis(keyframe, transition);
				updateLabels(keyframe, transition);
				updateTicker(keyframe, transition);

				await transition.end();
			}
		}

		init();

		function color(d) {
			const scale = d3.scaleOrdinal(d3.schemeTableau10);
			if (data.some(d => d.category !== undefined)) {
			  scale.domain(Array.from(categoryByName.values()));
			  return scale(categoryByName.get(d.name));
			}
			return scale(d.name);
		  }

		//// Bars //////////////////////////////////////////////////
		function bars() {
			let bar = g
				.append("g")
				.attr("class", "bars")
				.selectAll("rect");

			return ([date, data], transition) =>
				(bar = bar
					.data(data.slice(0, n), d => d.name)
					.join(
						enter =>
							enter
								.append("rect")
								//.attr("class", "bar")
								.attr("fill", color)
								.attr("x", x(0))
								.attr("y", d => y((prev.get(d) || d).rank))
								.attr("border-radius", "10px")
								.attr("height", y.bandwidth())
								.attr("width", d => x((prev.get(d) || d).value) - x(0)),
						update => update,
						exit =>
							exit
								.transition(transition)
								.remove()
								.attr("y", d => y((next.get(d) || d).rank))
								.attr("width", d => x((next.get(d) || d).value) - x(0))
					)
					.call(bar =>
						bar
							.transition(transition)
							.attr("y", d => y(d.rank))
							.attr("width", d => x(d.value) - x(0))
					));
		}

		////////////////////////////////////////////////////////////
		//// Axis //////////////////////////////////////////////////

		function axis() {
			const axis = d3
				.axisTop(x)
				.ticks(width / 160)
				.tickSizeOuter(0)
				.tickSizeInner(-height);

			const gAxis = g.append("g").attr("class", "axis");

			return (_, transition) => {
				gAxis.transition(transition).call(axis);
				gAxis.select(".tick:first-of-type").remove();
				gAxis.select(".domain").remove();
			};
		}

		////////////////////////////////////////////////////////////
		//// Labels ////////////////////////////////////////////////
		////////////////////////////////////////////////////////////
		function labels() {
			let label = g
				.append("g")
				.attr("class", "labels")
				.attr("text-anchor", "end")
				.selectAll("text");

			return ([date, data], transition) =>
				(label = label
					.data(data.slice(0, n), d => d.name)
					.join(
						enter =>
							enter
								.append("text")
								.attr(
									"transform",
									d =>
										`translate(${x((prev.get(d) || d).value)},${y(
											(prev.get(d) || d).rank
										)})`
								)
								.attr("y", y.bandwidth() / 2)
								.attr("x", -6)
								.attr("dy", "-0.25em")
								.text(d => d.name)
								.call(text =>
									text
										.append("tspan")
										.attr("fill-opacity", 0.7)
										.attr("font-weight", "normal")
										.attr("x", -8)
										.attr("dy", "1.15em")
								),
						update => update,
						exit =>
							exit
								.transition(transition)
								.remove()
								.attr(
									"transform",
									d =>
										`translate(${x((next.get(d) || d).value)},${y(
											(next.get(d) || d).rank
										)})`
								)
								.call(g =>
									g
										.select("tspan")
										.tween("text", d =>
											textTween(d.value, (next.get(d) || d).value)
										)
								)
					)
					.call(bar =>
						bar
							.transition(transition)
							.attr("transform", d => `translate(${x(d.value)},${y(d.rank)})`)
							.call(g =>
								g
									.select("tspan")
									.tween("text", d =>
										textTween((prev.get(d) || d).value, d.value)
									)
							)
					));
		}

		function textTween(a, b) {
			const i = d3.interpolateNumber(a, b);
			return function(t) {
				this.textContent = formatNumber(i(t));
			};
		}

		////////////////////////////////////////////////////////////
		//// Ticker ////////////////////////////////////////////////
		////////////////////////////////////////////////////////////
		function ticker() {
			const now = g
				.append("text")
				.attr("class", "now")
				.attr("text-anchor", "end")
				.attr("x", width)
				.attr("y", height)
				.text(formatDate(keyframes[0][0]));

			return ([date], transition) => {
				transition.end().then(() => now.text(formatDate(date)));
			};
		}
	});
}