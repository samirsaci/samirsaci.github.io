var monthsAbbr = {
  '01': "JAN",
  '02': "FEB",
  '03': "MAR",
  '04': "APR",
  '05': "MAY",
  '06': "JUN",
  '07': "JUL",
  '08': "AUG",
  '09': "SEP",
  '10': "OCT",
  '11': "NOV",
  '12': "DEC"
};
var months = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];

//----------- PROTOTYPE FUNCTIONS  ----------------------
d3.selection.prototype.patternify = function (params) {
  var container = this;
  var selector = params.selector;
  var elementTag = params.tag;
  var data = params.data || [selector];

  // Pattern in action
  var selection = container.selectAll('.' + selector).data(data, (d, i) => {
    if (typeof d === 'object') {
      if (d.id) {
        return d.id;
      }
    }
    return i;
  });
  selection.exit().remove();
  selection = selection.enter().append(elementTag).merge(selection);
  selection.attr('class', selector);
  return selection;
};

function makeChain(attrs, main) {
  //Dynamic keys functions
  Object.keys(attrs).forEach((key) => {
    // Attach variables to main function
    return (main[key] = function (_) {
      var string = `attrs['${key}'] = _`;
      if (!arguments.length) {
        return eval(` attrs['${key}'];`);
      }
      eval(string);
      return main;
    });
  });
}

function ordinal_suffix_of(i) {
  var j = i % 10,
    k = i % 100;
  if (j == 1 && k != 11) {
    return i + "st";
  }
  if (j == 2 && k != 12) {
    return i + "nd";
  }
  if (j == 3 && k != 13) {
    return i + "rd";
  }
  return i + "th";
}

function triggerEvent(s, event) {
  if ("createEvent" in document) {
    var evt = document.createEvent("HTMLEvents");
    evt.initEvent(event, false, true);
    s.dispatchEvent(evt);
  }
  else {
    s.fireEvent("on" + event);
  }
}

function getTriangle (triangleEdgeWidth = 25, delta = 2.5) {
  var triangleHeight = Math.sqrt(
      (triangleEdgeWidth * triangleEdgeWidth) - (triangleEdgeWidth / 2) * (triangleEdgeWidth / 2)
  ) - 4;
  return `
      M ${-triangleEdgeWidth / 2 + delta} 0
      L ${triangleEdgeWidth / 2 - delta * 2} 0
      Q ${triangleEdgeWidth / 2} 0 ${triangleEdgeWidth / 2 - delta } ${delta + 1}
      L ${delta - 0.2} ${triangleHeight - delta}
      Q 0 ${triangleHeight} ${-delta + 0.2} ${triangleHeight - delta}
      L ${-triangleEdgeWidth / 2 + delta} ${delta + 1}
      Q ${-triangleEdgeWidth / 2} 0 ${-triangleEdgeWidth / 2 + delta * 2} 0
      Z
  `
}

const globals = {
	Android: function () {
		return navigator.userAgent.match(/Android/i);
	},
	BlackBerry: function () {
		return navigator.userAgent.match(/BlackBerry/i);
	},
	iOS: function () {
		return navigator.userAgent.match(/iPhone|iPad|iPod/i);
	},
	Opera: function () {
		return navigator.userAgent.match(/Opera Mini/i);
	},
	Windows: function () {
		return navigator.userAgent.match(/IEMobile/i);
	},
	any: function () {
    return globals.Android() || 
      globals.BlackBerry() || 
      globals.iOS() || 
      globals.Opera() || 
      globals.Windows() || 
      Math.min(window.innerWidth, window.innerHeight) < 576;
	},
	get isMobile() {
		return globals.any();
	}
}
