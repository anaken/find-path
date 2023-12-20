// From https://redblobgames.github.io/circular-obstacle-pathfinding/
// Copyright 2017 Red Blob Games <redblobgames@gmail.com>
// License: Apache v2.0 <http://www.apache.org/licenses/LICENSE-2.0.html>

function direction_step(start, distance, angle) {
    return vec_add(start, vec_polar(distance, angle));
}


/** Intersection between segment AB and circle C */
function segment_circle_intersection(A, B, C) {
    const CA = vec_sub(C, A), BA = vec_sub(B, A);
    let u = (CA.x * BA.x + CA.y * BA.y) / (BA.x * BA.x + BA.y * BA.y);
    if (u < 0.0) { u = 0.0; }
    if (u > 1.0) { u = 1.0; }

    const E = vec_interpolate(A, B, u);
    const d = vec_distance(C, E);
    return { u: u, d: d, E: E, intersects: d <= C.r };
}


/** Calculations needed for internal bitangents */
class InternalBitangents {
    constructor (A, B) {
        this.A = A;
        this.B = B;
    }
    get theta() {
        const P = vec_distance(this.A, this.B);
        const cos_angle = (this.A.r + this.B.r) / P;
        return Math.acos(cos_angle);
    }
    get AB_angle() { return vec_facing(this.A, this.B); }
    get BA_angle() { return vec_facing(this.B, this.A); }
    get C() { return direction_step(this.A, this.A.r, this.AB_angle - this.theta); }
    get D() { return direction_step(this.A, this.A.r, this.AB_angle + this.theta); }
    get E() { return direction_step(this.B, this.B.r, this.BA_angle + this.theta); }
    get F() { return direction_step(this.B, this.B.r, this.BA_angle - this.theta); }
}


/** Calculations needed for external bitangents */
class ExternalBitangents {
    constructor (A, B) {
        this.A = A;
        this.B = B;
    }
    get theta() {
        const P = vec_distance(this.A, this.B);
        const cos_angle = (this.A.r - this.B.r) / P;
        return Math.acos(cos_angle);
    }
    get AB_angle() { return vec_facing(this.A, this.B); }
    get C() { return direction_step(this.A, this.A.r, this.AB_angle - this.theta); }
    get D() { return direction_step(this.A, this.A.r, this.AB_angle + this.theta); }
    get E() { return direction_step(this.B, this.B.r, this.AB_angle + this.theta); }
    get F() { return direction_step(this.B, this.B.r, this.AB_angle - this.theta); }
}

/** Check line of sight between circle i point P and circle j point Q
 (excludes circles i,j from the test)
 */
function line_of_sight(circles, i, P, j, Q) {
    for (let k = 0; k < circles.length; k++) {
        if (k != i && k != j
            && segment_circle_intersection(P, Q, circles[k]).intersects) {
            return false;
        }
    }
    return true;
}


function round(x) {
    return Math.round(100*x)/100;
}

// create a new node, or reuse an existing one that's close
function make_node(i, p, circles, node_map) {
    let node = {circle: circles[i], x: round(p.x), y: round(p.y)};
    let key = JSON.stringify(node);
    if (!node_map.has(key)) {
        node_map.set(key, node);
    }
    return node_map.get(key);
}

// try to add edge from circle i point P to circle j point Q
function add_edge(i, P, j, Q, circles, edges, node_map) {
    if (isNaN(P.x) || isNaN(Q.x)) { return; }
    if (!line_of_sight(circles, i, P, j, Q)) { return; }
    edges.push([make_node(i, P, circles, node_map), make_node(j, Q, circles, node_map)]);
}

/** Generate surfing edges, [{circle: circle, x: number, y: number},
 {circle: circle, x: number, y: number}]
 as well as the set of nodes. Although the edges are bidirectional,
 each is in the list only once.
 */
function generate_nodes_and_surfing_edges(circles) {
    let edges = [], node_map = new Map();

    // some circles have radius 0; they will generate fewer bitangents
    for (let i = 0; i < circles.length; i++) {
        for (let j = 0; j < i; j++) {
            var internal = new InternalBitangents(circles[i], circles[j]);
            add_edge(i, internal.C, j, internal.F, circles, edges, node_map);
            if (circles[i].r != 0 && circles[j].r != 0) {
                add_edge(i, internal.D, j, internal.E, circles, edges, node_map);
            }
            var external = new ExternalBitangents(circles[i], circles[j]);
            if (circles[i].r != 0 || circles[j].r != 0) {
                add_edge(i, external.C, j, external.F, circles, edges, node_map);
            }
            if (circles[i].r != 0 && circles[j].r != 0) {
                add_edge(i, external.D, j, external.E, circles, edges, node_map);
            }
        }
    }
    return {nodes: [...node_map.values()], edges: edges};
}


/** Generate hugging edges from nodes

 Any nodes on the same circle get connected by a hugging edge.
 Although the edges are bidirectional, each is in the list only once.
 */
function generate_hugging_edges(nodes) {
    let buckets = [];
    for (let node of nodes) {
        if (buckets[node.circle.id] === undefined) { buckets[node.circle.id] = []; }
        buckets[node.circle.id].push(node);
    }

    let hugging_edges = [];
    for (let bucket of buckets) {
        for (let i = 0; i < bucket.length; i++) {
            for (let j = 0; j < i; j++) {
                hugging_edges.push([bucket[i], bucket[j]]);
            }
        }
    }
    return hugging_edges;
}

function neighbors(node, edges) {
    let results = [];
    for (let edge of edges) {
        if (edge[0] === node) { results.push(edge[1]); }
        if (edge[1] === node) { results.push(edge[0]); }
    }
    return results;
}

function edge_cost(a, b) {
    // adding 1 to each edge cost to favor fewer nodes in the path
    if (a.circle.id == b.circle.id) {
        // hugging edge
        let center = a.circle;
        let a_angle = vec_facing(center, a);
        let b_angle = vec_facing(center, b);
        let delta_angle = angle_difference(a_angle, b_angle);
        return 1 + delta_angle * center.r;
    } else {
        // surfing edge
        return 1 + vec_distance(a, b);
    }
}

function circle_to_node(circle, nodes) {
    let nodes_on_circle = nodes.filter((n) => n.circle.id == circle.id);
    if (nodes_on_circle.length !== 1) { throw "start/goal should be on r=0 circle"; }
    return nodes_on_circle[0];
}



/** Pathfinding */
function find_path(start_circle, goal_circle, nodes, edges) {
    let start_node = circle_to_node(start_circle, nodes);
    let goal_node = circle_to_node(goal_circle, nodes);

    let frontier = [[start_node, 0]];
    let came_from = new Map([[start_node, null]]);
    let cost_so_far = new Map([[start_node, 0]]);

    while (frontier.length > 0) {
        frontier.sort((a, b) => a[1] - b[1]);
        let current = frontier.shift()[0];
        if (current === goal_node) { break; }
        for (let next of neighbors(current, edges)) {
            let new_cost = cost_so_far.get(current) + edge_cost(current, next);
            if (!cost_so_far.has(next) || new_cost < cost_so_far.get(next)) {
                cost_so_far.set(next, new_cost);
                came_from.set(next, current);
                frontier.push([next, new_cost, vec_distance(goal_node, next)]);
            }
        }
    }

    let current = goal_node;
    let path = [current];
    while (current !== start_node && current !== undefined) {
        current = came_from.get(current);
        path.push(current);
    }
    path.push(start_node);
    return path;
}

function get_path(circles) {
    circles = circles.map((c, i) => ({id: i, x: c.x, y: c.y, r: c.r}));
    circles.sort((a, b) => b.r - a.r);

    let nodes_and_surfing_edges = generate_nodes_and_surfing_edges(circles);
    let surfing_edges = nodes_and_surfing_edges.edges;
    let nodes = nodes_and_surfing_edges.nodes;
    let hugging_edges = generate_hugging_edges(nodes);
    let edges = surfing_edges.concat(hugging_edges);
    let path = find_path(circles[circles.length - 2], circles[circles.length-1], nodes, edges);
    return path;
}