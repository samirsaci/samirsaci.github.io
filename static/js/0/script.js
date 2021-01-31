// http://samirsaci.github.io/index
// Index Page Javascript //
//////////////////////////


// Animate Name and Position Name
document.addEventListener("DOMContentLoaded", function() {

	// Animate title
	var titleWrapper = document.querySelector("#banner-content h1");
	titleWrapper.innerHTML = titleWrapper.textContent.replace(
		/\S/g,
		"<span class='letter'>$&</span>"
	);

	anime.timeline().add({
		targets: "#banner-content .letter",
		scale: [0.1, 1],
		opacity: [0, 1],
		color: ["#1b0180", "#1b0180"],
		translateZ: 0,
		easing: "easeOutExpo",
		duration: 1000,
		delay: (el, i) => 70 * (i + 1)
	});

	// Typing Effect
	var i = 0;
	var txt = ' Supply Chain Senior Analyst<'; /* The text */
	var speed = 50; /* The speed/duration of the effect in milliseconds */

	function typeWriter() {
	if (i < txt.length) {
		document.getElementById("typing").innerHTML += txt.charAt(i);
		i++;
		setTimeout(typeWriter, speed);
	}
	}
});

