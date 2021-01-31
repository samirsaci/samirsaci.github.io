// Map

const width = 700,
    height = 700,
    hexRadius = 5;
var projection, 
    svg,
    hexbin,
    colorScale,
    maxDatapoints;

svg = d3.select('#map').append("svg")
    .attr("id", "svg")
    .attr("width", width + hexRadius * 2)
    .attr("height", height + hexRadius * 2);

var promises = [];
promises.push(d3.json('/static/data/4/departments.json'));
promises.push(d3.csv('/static/data/4/communes.csv'));
Promise.all(promises).then(function(values) {
    const geojson = values[0];
    const csv = values[1];
    
    ready(geojson, csv);
});


// Fonction principale

function ready(geojson, csv) {
    // Initialisation de la projection
    drawGeo(geojson);

    // On place les futures centres de nos hexgrid sur le SVG en fonction de sa taille
    var points = getPointGrid(hexRadius);

    // On récupère les polygones de tous les départements au format X,Y
    var frPolygons = getPolygons(geojson);

    // On ne conserve que les centres de nos hexgrid qui sont dans l'un des polygones
    var frPoints = keepPointsInPolygon(points, frPolygons);

    // Construction d'un tableau avec les coordonnées de chaque ville
    var dataPoints = getDatapoints(csv);

    // On concatène tous les centres des hexgrid avec les coordonnées de chaque ville.
    var mergedPoints = frPoints.concat(dataPoints);

    // Regroupement de nos points par hexagones en utilisant la libraire hexbin
    var hexPoints = getHexPoints(mergedPoints);

    // Ajout d'informations résumées à chaque hexagone 
    var hexPointsRolledup = rollupHexPoints(hexPoints);

    // Ajout des hexagones au SVG
    drawHexmap(hexPointsRolledup);

    // Ajout d'une légende
    drawLegend();

    // Ajout des interractions avec la souris
    mouseInteractivity();
}

// Initilisation de la projection
function drawGeo(geojson) {
    projection = d3.geoConicConformal().fitSize([width, height], geojson);
        
    var geoPath = d3.geoPath()
    	.projection(projection);

    const deps = svg.append("g");

    deps.selectAll("path")
    	.data(geojson.features)
    	.enter()
    		.append("path")
            .attr("d", geoPath)
            .attr('fill', 'none');
}

// Initialisation des hexagoness
function getPointGrid(radius) {
    var hexDistance = radius * 1.5;
    var cols = width / hexDistance;

    var rows = Math.floor(height / hexDistance);

    return d3.range(rows * cols).map(function(i) {
        return {
            x: i % cols * hexDistance,
            y: Math.floor(i / cols) * hexDistance,
            datapoint: 0
        };
    });
}

// Récupération des polygones des départements
function getPolygons(geojson) {
    var polygons = [];
    geojson.features.forEach(function (f) {
        if (f.geometry.type == "Polygon") {
            var featurePolygon = [];
            f.geometry.coordinates[0].forEach(function (c) {
                featurePolygon.push(projection(c));
            });
            polygons.push(featurePolygon);
        } else { // type = MultiPolygon
            f.geometry.coordinates.forEach(function (p) {
                var featurePolygon = [];
                p[0].forEach(function (c) {
                    featurePolygon.push(projection(c));
                });
                polygons.push(featurePolygon);
            });
        }
    });
    return polygons;
}

// Définition des hexagones à conserver
function keepPointsInPolygon(points, frPolygons) {
    var pointsInPolygon = [];
        
    points.forEach(function(point) {
        var inPolygon = false;
        for (var i = 0; !inPolygon && i < frPolygons.length; i++) {
            if (d3.polygonContains(frPolygons[i], [point.x, point.y])) {
                inPolygon = true;
            }
        }
                
        if (inPolygon) {
            pointsInPolygon.push(point);
        }
    });
    return pointsInPolygon;
}

// 
function getDatapoints(csv) {
    var dataPoints = [];

    csv.forEach(function (e) {
        if (e.Code_postal.localeCompare("96000") < 0) {
            var coords = projection([+e.lng, +e.lat]);
            dataPoints.push({			
                x: coords[0],
                y: coords[1],
                datapoint: 1,
                name: e.Code_postal + " - " + e.Nom_commune
            });
        }
    });
    return dataPoints;
}

// Création des hexagones
function getHexPoints(points) {
    hexbin = d3.hexbin()
        .radius(hexRadius)
        .x(function(d) { return d.x; })
        .y(function(d) { return d.y; });

    var hexPoints = hexbin(points);
    return hexPoints;
}

// Nettoyage et enrichissement des hexagones
function rollupHexPoints(data) {
    maxDatapoints = 0;

    data.forEach(function(el) {
        for (var i = el.length - 1; i >= 0; --i) {
            if (el[i].datapoint === 0) {
                el.splice(i, 1);
            }
        }

        var datapoints = 0,
            cities = [];

        el.forEach(function(elt, i) {
            datapoints += elt.datapoint;
            cities.push({"name" : elt.name});
        });

        el.datapoints = datapoints;
        el.cities = cities;

        maxDatapoints = Math.max(maxDatapoints, datapoints);
    });

    colorScale = d3.scaleSequential(d3.interpolatePuOr) // interpolatePiYG, .schemeBlues[9], interpolatePuOr
        .domain([maxDatapoints, 1]);

    return data;
}

// Ajout des hexagones sur le SVG
function drawHexmap(points) {
    var hexes = svg.append('g')
        .selectAll('.hex')
        .data(points)
        .enter().append('path')
            .attr('class', 'hex')
            .attr('transform', function(d) { return 'translate(' + (hexRadius + d.x) + ', ' + d.y + ')'; })
            .attr('d', hexbin.hexagon())
            .style('fill', function(d) { return d.datapoints === 0 ? 'none' : colorScale(d.datapoints); })
            .style('stroke', '#ccc')
            .style('stroke-width', 1);
}

// Ajout de l'échelle
function drawLegend() {
    const cellSize = 15;
    const cellNumber = 15;

    var legend = svg.append('g')
        .attr("transform", "translate(" + (width - 20) + ", " + (height / 4) + ")");
        
    legend.selectAll()
        .data(d3.range(1, maxDatapoints, maxDatapoints / cellNumber))
        .enter().append('svg:rect')
       		.attr('height', cellSize + 'px')
       		.attr('width', cellSize + 'px')
       		.attr('x', 5)
       		.attr('y', function(d, i) { return i * cellSize + 'px'; })
       		.style("fill", function(d) { return colorScale(d); });

    var legendScale = d3.scaleLinear()
        .domain([0, maxDatapoints])
        .range([0, cellNumber * cellSize]);
        
    legend.append("g")
   		.attr("class", "axis")
   		.call(d3.axisLeft(legendScale));
}

// Gestion de la Souris
function mouseInteractivity() {
    d3.selectAll('.hex').on('mouseover', mouseover);
    d3.selectAll('.hex').on('mousemove', mousemove);
    d3.selectAll('.hex').on('mouseout', mouseout);
        
    function mouseover() {
        var cities = d3.select(this).data()[0].cities;

        if (cities.length) { // if this hexagon has cities to show
            d3.select('#tooltip')
                .style('top', d3.event.pageY + 'px')
                .style('left', (d3.event.pageX + 10) + 'px')
                .style('opacity', 0.9);

            d3.select('#tip-header h1').html(function() {
                return cities.length > 1 
                    ? cities.length + ' villes dans cette zone'
                    : cities.length + ' ville dans cette zone';
            });

            var html = "";
            cities.forEach(function (city) {
                html += city.name + "</br>";
            });
            d3.select('#tip-header p').html(html);
        }
    }

    function mousemove() {
        d3.select('#tooltip')
            .style('top', d3.event.pageY + 'px')
            .style('left', (d3.event.pageX + 10) + 'px');
    }

    function mouseout() {
        d3.select('#tooltip')
            .style('opacity', 0);
    }
}