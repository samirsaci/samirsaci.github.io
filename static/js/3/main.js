// Market Sankey
var diagram, height = 600;
// Variables aggregation
var aggrType1 = 'product_num';
var aggrType2 = 'product_sold';
var aggrType3 = 'units_returned';
var aggrType4 = 'avg_total_income';


var aggrType = 'product_num'; // Aggregation by (Initial Value)
var rawData;
main();

function main() {
  diagram = Diagram({
    height,
    container: '#sankey_diagram'
  })

  loadData().then(resp => {
    rawData = resp;
    diagram.data(transformData()).render();
  })
}

function loadData() {
  return d3.csv('/static/data/3/market.csv', d3.autoType);
}

function calcAggr(values) {
  var value = 0;

  if (aggrType === 'product_num') {
    return values.length
  } else if (aggrType === 'product_sold') {
    return d3.sum(values, d => d['Qty Sold']);
  } else if (aggrType === 'units_returned') {
    return d3.sum(values, d => d['Estimated Returns'])
  } else if (aggrType === 'avg_total_income') {
    return d3.sum(values, d => d['Qty Sold'] * d['Avg Selling Price'])
  }

  return value;
}

function getVeluesPerSubCat(values) {
  const map = {};
  const group = d3.nest().key(d => d.Subcategory).entries(values);

  group.forEach(d => {
    map[d.key] = calcAggr(d.values);
  })

  return map;
}

function transformData() {
  const nodes = [];
  const links = [];
  const nodeMap = {};
  
  const byDepartment = d3.nest().key(d => d.Department).entries(rawData);
  
  byDepartment.forEach(d => {
    if (!nodeMap[d.key]) {
      nodes.push({ name: d.key, type: 'department' });
      nodeMap[d.key] = true;
    }
    
    const byCategory = d3.nest().key(d => d.Category).entries(d.values);
    
    byCategory.forEach(cat => {
      if (!nodeMap[cat.key]) {
        nodes.push({ name: cat.key, type: 'category' });
        nodeMap[cat.key] = true;
      }

      links.push({ 
        source: d.key, 
        target: cat.key, 
        value: calcAggr(cat.values) 
      });
      
      const bySubCategory = d3.nest().key(d => d.newSubCategory).entries(cat.values);
      
      bySubCategory.forEach(subCat => {
        if (!nodeMap[subCat.key]) {
          nodes.push({ name: subCat.key, type: 'subcategory' });
          nodeMap[subCat.key] = subCat.key;
        }
        
        links.push({ 
          source: cat.key, 
          target: subCat.key, 
          value: calcAggr(subCat.values)
        })
      })
    })
  });

  const _links = links.filter(d => d.value > 0);

  return {
    nodes: nodes.filter(d => {
      return _links.some(x => x.source === d.name || x.target === d.name);
    }).map((d, i) => {
      return {
        id: 'node-' + i,
        ...d
      }
    }), 
    links: _links.map((d, i) => {
      return {
        id: 'link-' + i,
        ...d
      }
    }),
    valuesPerSubCategory: getVeluesPerSubCat(rawData)
  };
}

function updateAggregation() {
  const value = document.querySelector('#aggr_type').value;
  aggrType = value;
  changeAggrType();
}

function changeAggrType() {
  const newData = transformData();
  diagram.updateData(newData);
}