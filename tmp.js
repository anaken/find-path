
var container = document.getElementById( 'svg' );


let circles = [
    {x: 113, y: 99, r: 55},
    {x: 497, y: 243, r: 40},
    {x: 379, y: 237, r: 40},
    {x: 330, y: 113, r: 35},
    {x: 179, y: 190, r: 30},
    {x: 278, y: 233, r: 30},
    // from
    {x: 30, y: 74, r: 0},
    // to
    {x: 570, y: 280, r: 0}
]

for (let circle of circles) {
    drawCircle(circle);
}


// FINDING PATH
let path = get_path(circles)


// DRAW PATH
for (let i = 0; i < path.length; i++) {
    if (i + 1 < path.length) {
        drawLine(path[i], path[i + 1])
    }
}

for (let circle of path) {
    drawCircle(circle);
}





function drawCircle(circle) {
    var element = document.createElementNS("http://www.w3.org/2000/svg", 'circle');
    element.setAttributeNS(null, 'cx', circle.x);
    element.setAttributeNS(null, 'cy', circle.y);
    element.setAttributeNS(null, 'r', circle.r === 0 || circle.r === undefined ? 5 : circle.r);
    element.setAttributeNS(null, 'style', 'fill: none; stroke: blue; stroke-width: 1px;' );
    container.appendChild(element);
}

function drawLine(circle1, circle2) {
    var newLine = document.createElementNS('http://www.w3.org/2000/svg','line');
    newLine.setAttribute('x1',circle1.x);
    newLine.setAttribute('y1',circle1.y);
    newLine.setAttribute('x2',circle2.x);
    newLine.setAttribute('y2',circle2.y);
    newLine.setAttribute("stroke", "black")
    document.getElementById("svg").append(newLine);
}
