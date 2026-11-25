let segments = [];
let bestPolygon = null;
const EPS = 1e-1;
const TPP_EPS = 1e-1; // Précision géométrique interne pour le TPP
let currentPoint = null;
let sub2Result = null; // { polygon, chain, u, v, perimeter }
let statusMessage = "";
let chosenU = null;
let chosenV = null;
let sols = [];

function setup() {
  createCanvas(1200, 800);
}

function mousePressed() {
  let p = createVector(mouseX, mouseY);

  // SHIFT-click = sélectionner u ou v parmi les extrémités des segments
  if (keyIsDown(SHIFT)) {
    let best = null;
    let bestDist = 15;

    for (let s of segments) {
      for (let q of [s.a, s.b]) {
        let d = p5.Vector.dist(p, q);
        if (d < bestDist) {
          bestDist = d;
          best = q;
        }
      }
    }

    if (best) {
      if (!chosenU) {
        chosenU = best.copy();
        statusMessage = "Point u sélectionné (SHIFT+clic sur un 2e point pour v, ou appuyez sur 2)";
      } else if (!chosenV) {
        chosenV = best.copy();
        statusMessage = "Points u et v sélectionnés (appuyez sur 2 pour lancer Subroutine II)";
      } else {
        chosenU = best.copy();
        chosenV = null;
        statusMessage = "Nouveau point u sélectionné";
      }
    }
    return;
  }

  if (currentPoint === null) {
    currentPoint = p;
  } else {
    segments.push({
      a: currentPoint.copy(),
      b: p.copy()
    });
    currentPoint = null;
    sub2Result = null;
    bestPolygon = null;
  }
}

function keyPressed() {
  // Lancer Subroutine I
  if (key === '1') {
    if (segments.length > 0) {
      sub2Result = null;
      bestPolygon = solveExactMinPerimeter(segments);
      if (bestPolygon) {
        statusMessage = "Subroutine I — Périmètre : " + polygonPerimeter(bestPolygon).toFixed(2);
      } else {
        statusMessage = "Subroutine I : aucun polygone sans extrémité trouvé (+∞)";
      }
    }
  }

  // Lancer Subroutine II et afficher le polygone optimal trouvé
  if (key === '2') {
    if (segments.length === 0) {
      statusMessage = "Tracez d'abord des segments à la souris.";
      return;
    }

    bestPolygon = null;
    sub2Result = null;

    if (chosenU && chosenV) {
      // Cas 1 : u et v fixés par l'utilisateur
      let res = solveSubroutineII(chosenU, chosenV, segments);
      if (res) {
        sub2Result = res;
        bestPolygon = res.polygon;
        statusMessage = "Subroutine II (u, v fixés) — Périmètre : " + res.perimeter.toFixed(2);
      } else {
        statusMessage = "Subroutine II (u, v fixés) : +∞ (aucun polygone valide pour ce couple)";
      }
    } else if (chosenU && !chosenV) {
      // Cas 2 : un seul point u sélectionné (cas dégénéré u = v)
      let res = solveSubroutineII(chosenU, chosenU, segments);
      if (res) {
        sub2Result = res;
        bestPolygon = res.polygon;
        statusMessage = "Subroutine II (u = v) — Périmètre : " + res.perimeter.toFixed(2);
      } else {
        statusMessage = "Subroutine II (u = v) : +∞ (aucun polygone valide ancré uniquement en u)";
      }
    } else {
      // Cas 3 : aucun point fixé -> rechercher le meilleur polygone sur toutes les paires (u, v) de Y
      let bestGlobal = findBestSubroutineIIOverAllPairs(segments);
      if (bestGlobal) {
        sub2Result = bestGlobal;
        bestPolygon = bestGlobal.polygon;
        statusMessage = "Subroutine II (meilleur couple u, v) — Périmètre : " + bestGlobal.perimeter.toFixed(2);
      } else {
        statusMessage = "Subroutine II : +∞ (aucun polygone valide trouvé)";
      }
    }
    console.log(statusMessage);
  }

  // Reset
  if (key === 'r' || key === 'R') {
    segments = [];
    bestPolygon = null;
    currentPoint = null;
    chosenU = null;
    chosenV = null;
    sub2Result = null;
    statusMessage = "";
  }
}

function draw() {
  background(245);
  drawCoordinateSystem();
  fill(20);
  noStroke();
  textSize(13);
  text("Clic = tracer un segment | SHIFT+clic = choisir u (et v)", 10, 622);
  text("1 = Subroutine I | 2 = Subroutine II (polygone optimal) | R = reset", 10, 642);

  if (statusMessage) {
    fill(20, 70, 180);
    text(statusMessage, 10, 666);
  }

  // Prévisualisation du segment en cours de tracé
  if (currentPoint) {
    stroke(100, 100, 255);
    strokeWeight(2);
    line(currentPoint.x, currentPoint.y, mouseX, mouseY);
    fill(100, 100, 255);
    circle(currentPoint.x, currentPoint.y, 8);
  }

  // Dessiner les segments d'entrée
  stroke(30);
  strokeWeight(2);
  for (let s of segments) {
    line(s.a.x, s.a.y, s.b.x, s.b.y);
    fill(30);
    circle(s.a.x, s.a.y, 5);
    circle(s.b.x, s.b.y, 5);
  }

  // for (let poly of sols) {
  //   fill(220, 50, 50, 45);
  //   stroke(200, 30, 30);
  //   strokeWeight(2.5);
  //   beginShape();
  //   for (let pt of poly) {
  //     vertex(pt.x, pt.y);
  //   }
  //   endShape(CLOSE);
  // }

  // Dessiner le polygone optimal de la Subroutine I (rouge)
  if (bestPolygon && !sub2Result && bestPolygon.length > 0) {
    fill(220, 50, 50, 45);
    stroke(200, 30, 30);
    strokeWeight(2.5);
    beginShape();
    for (let pt of bestPolygon) {
      vertex(pt.x, pt.y);
    }
    endShape(CLOSE);

    for (let pt of bestPolygon) {
      fill(200, 30, 30);
      noStroke();
      circle(pt.x, pt.y, 7);
    }
  }

  // Dessiner le polygone optimal trouvé par la Subroutine II (bleu + arête uv en vert)
  if (sub2Result && sub2Result.polygon && sub2Result.polygon.length > 0) {
    let poly = sub2Result.polygon;

    // Polygone convexe fermé C(Gamma)
    fill(40, 110, 240, 45);
    stroke(30, 90, 220);
    strokeWeight(2.5);
    beginShape();
    for (let pt of poly) {
      vertex(pt.x, pt.y);
    }
    endShape(CLOSE);

    // Mettre en évidence l'arête fixe uv si u != v
    if (sub2Result.u && sub2Result.v && p5.Vector.dist(sub2Result.u, sub2Result.v) > TPP_EPS) {
      stroke(20, 160, 80);
      strokeWeight(4);
      line(sub2Result.u.x, sub2Result.u.y, sub2Result.v.x, sub2Result.v.y);
    }

    // Dessiner tous les sommets du polygone optimal
    for (let pt of poly) {
      fill(30, 90, 220);
      noStroke();
      circle(pt.x, pt.y, 8);
    }

    // Marquer u et v utilisés pour ce polygone
    if (sub2Result.u) {
      fill(220, 40, 40);
      circle(sub2Result.u.x, sub2Result.u.y, 11);
      fill(0);
      text("u", sub2Result.u.x + 8, sub2Result.u.y - 6);
    }
    if (sub2Result.v && p5.Vector.dist(sub2Result.u, sub2Result.v) > TPP_EPS) {
      fill(20, 160, 80);
      circle(sub2Result.v.x, sub2Result.v.y, 11);
      fill(0);
      text("v", sub2Result.v.x + 8, sub2Result.v.y - 6);
    }
  }

  // Afficher les points u et v sélectionnés manuellement
  if (chosenU) {
    fill(255, 0, 0);
    noStroke();
    circle(chosenU.x, chosenU.y, 13);
    fill(0);
    text("u", chosenU.x + 10, chosenU.y);
  }

  if (chosenV) {
    fill(0, 150, 70);
    noStroke();
    circle(chosenV.x, chosenV.y, 13);
    fill(0);
    text("v", chosenV.x + 10, chosenV.y);
  }
}

// ============================================================================
// GÉOMÉTRIE DE BASE & SUBROUTINE I
// ============================================================================

function solveExactMinPerimeter(O) {
  let minPerim = Infinity;
  let optimalPoly = null;

  let zeroEndpointPoly = solveSubroutineI(O);
  if (zeroEndpointPoly && polygonPerimeter(zeroEndpointPoly) < minPerim) {
    minPerim = polygonPerimeter(zeroEndpointPoly);
    optimalPoly = zeroEndpointPoly;
  }

  return optimalPoly;
}

function polygonPerimeter(poly) {
  if (!poly || poly.length <= 1) return 0;
  if (poly.length === 2) return 2 * p5.Vector.dist(poly[0], poly[1]);
  let perim = 0;
  for (let i = 0; i < poly.length; i++) {
    let next = poly[(i + 1) % poly.length];
    perim += p5.Vector.dist(poly[i], next);
  }
  return perim;
}

function segmentIntersectsConvexPoly(s, poly) {
  if (!poly || poly.length === 0) return false;
  if (poly.length === 1) return pointOnSegment(poly[0], s);
  if (poly.length === 2) return segmentsIntersect(s.a, s.b, poly[0], poly[1]);

  if (pointInConvexPoly(s.a, poly) || pointInConvexPoly(s.b, poly)) {
    return true;
  }

  for (let i = 0; i < poly.length; i++) {
    let p1 = poly[i];
    let p2 = poly[(i + 1) % poly.length];
    if (segmentsIntersect(s.a, s.b, p1, p2)) {
      return true;
    }
  }

  return false;
}

function pointInConvexPoly(p, poly) {
  for (let i = 0; i < poly.length; i++) {
    let a = poly[i];
    let b = poly[(i + 1) % poly.length];
    if (cross2D(a, b, p) < -EPS) {
      return false;
    }
  }
  return true;
}

function cross2D(o, a, b) {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

function convexHull(pts) {
  if (pts.length <= 1) return pts.map(p => p.copy());

  let sorted = pts.map(p => p.copy()).sort((a, b) => {
    if (Math.abs(a.x - b.x) > EPS) return a.x - b.x;
    return a.y - b.y;
  });

  let unique = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    if (p5.Vector.dist(sorted[i], unique[unique.length - 1]) > EPS) {
      unique.push(sorted[i]);
    }
  }
  if (unique.length <= 2) return unique;

  let lower = [];
  for (let p of unique) {
    while (lower.length >= 2 && cross2D(lower[lower.length - 2], lower[lower.length - 1], p) <= EPS) {
      lower.pop();
    }
    lower.push(p);
  }

  let upper = [];
  for (let i = unique.length - 1; i >= 0; i--) {
    let p = unique[i];
    while (upper.length >= 2 && cross2D(upper[upper.length - 2], upper[upper.length - 1], p) <= EPS) {
      upper.pop();
    }
    upper.push(p);
  }

  lower.pop();
  upper.pop();

  return lower.concat(upper);
}

function segmentsIntersect(a1, a2, b1, b2) {
  let d1 = cross2D(a1, a2, b1);
  let d2 = cross2D(a1, a2, b2);
  let d3 = cross2D(b1, b2, a1);
  let d4 = cross2D(b1, b2, a2);

  if (((d1 > EPS && d2 < -EPS) || (d1 < -EPS && d2 > EPS)) &&
      ((d3 > EPS && d4 < -EPS) || (d3 < -EPS && d4 > EPS))) {
    return true;
  }

  if (Math.abs(d1) <= EPS && pointOnSegment(b1, { a: a1, b: a2 })) return true;
  if (Math.abs(d2) <= EPS && pointOnSegment(b2, { a: a1, b: a2 })) return true;
  if (Math.abs(d3) <= EPS && pointOnSegment(a1, { a: b1, b: b2 })) return true;
  if (Math.abs(d4) <= EPS && pointOnSegment(a2, { a: b1, b: b2 })) return true;

  return false;
}

function pointOnSegment(p, s) {
  let d1 = p5.Vector.dist(p, s.a);
  let d2 = p5.Vector.dist(p, s.b);
  let len = p5.Vector.dist(s.a, s.b);
  return Math.abs(d1 + d2 - len) < EPS;
}

function isConvexPolygon(poly) {
  const n = poly.length;
  if (n < 3) return false;

  let sign = 0;
  for (let i = 0; i < n; i++) {
    let a = poly[i];
    let b = poly[(i + 1) % n];
    let c = poly[(i + 2) % n];
    let cross = cross2D(a, b, c);
    if (Math.abs(cross) < EPS) continue;
    if (sign === 0) sign = Math.sign(cross);
    else if (Math.sign(cross) !== sign) return false;
  }
  return true;
}

function allSegmentsIntersect(O, poly) {
  for (let s of O) {
    if (!segmentIntersectsConvexPoly(s, poly)) {
      return false;
    }
  }
  return true;
}

function solveSubroutineI(O) {
  if (O.length < 3) return null;

  let bestHull = null;
  let bestPerim = Infinity;

  const NUM_CANDIDATES = 100000;
  const DELTA = 0.05;

  for (let trial = 0; trial < NUM_CANDIDATES; trial++) {
    let pts = [];
    for (let s of O) {
      let t = trial === 0 ? 0.5 : random(DELTA, 1 - DELTA);
      pts.push(p5.Vector.lerp(s.a, s.b, t));
    }

    let hull = convexHull(pts);
    if (hull.length < 3) continue;

    let valid = true;
    for (let seg of O) {
      if (!segmentIntersectsConvexPoly(seg, hull)) {
        valid = false;
        break;
      }
    }
    if (!valid) continue;

    let perim = polygonPerimeter(hull);
    if (perim < bestPerim) {
      bestPerim = perim;
      bestHull = hull.map(p => p.copy());
    }
  }

  return bestHull;
}

// ============================================================================
// SUBROUTINE II (Exacte : Réduction en demi-plans triés + TPP de Dror et al.)
// ============================================================================

// Recherche le polygone de périmètre minimal parmi toutes les paires (u, v) de Y
function findBestSubroutineIIOverAllPairs(O) {
  let Y = [];
  for (let s of O) {
    for (let pt of [s.a, s.b]) {
      if (!Y.some(existing => p5.Vector.dist(existing, pt) < 1e-1)) {
        Y.push(pt.copy());
      }
    }
  }

  let best = null;
  for (let i = 0; i < Y.length; i++) {
    for (let j = i; j < Y.length; j++) {
      let res = solveSubroutineII(Y[i], Y[j], O);
      if (res && (!best || res.perimeter < best.perimeter)) {
        best = res;
      }
    }
  }
  return best;
}

function solveSubroutineII(u, v, O) {
  if (!O || O.length === 0) {
    let d = p5.Vector.dist(u, v);
    let poly = d < TPP_EPS ? [u.copy()] : [u.copy(), v.copy()];
    return {
      cost: d,
      perimeter: polygonPerimeter(poly),
      chain: poly,
      polygon: poly,
      u: u.copy(),
      v: v.copy()
    };
  }

  // Cas dégénéré u = v : polygone convexe ancré en u sans autre sommet dans Y
  if (p5.Vector.dist(u, v) < TPP_EPS) {
    return solveSubroutineIIDegeneratePoint(u, O);
  }

  // Cas général u != v : tester les deux demi-plans séparés par la droite (uv)
  let best = null;

  let resForward = solveSubroutineIIOriented(u, v, O);
  if (resForward && (!best || resForward.perimeter < best.perimeter)) {
    best = resForward;
  }

  let resBackward = solveSubroutineIIOriented(v, u, O);
  if (resBackward && (!best || resBackward.perimeter < best.perimeter)) {
    best = {
      cost: resBackward.cost,
      perimeter: resBackward.perimeter,
      chain: resBackward.chain.slice().reverse(),
      polygon: resBackward.polygon,
      u: u.copy(),
      v: v.copy()
    };
  }

  return best;
}

function solveSubroutineIIOriented(u, v, O) {
  let d = p5.Vector.dist(u, v);
  if (d < TPP_EPS) return null;

  // Les segments passant déjà par u ou v sont automatiquement intersectés par le côté uv
  let activeSegments = O.filter(s => !pointOnSegment(u, s) && !pointOnSegment(v, s));

  // Si tous les segments touchent déjà u ou v, le segment uv lui-même est la solution dégénérée
  if (activeSegments.length === 0) {
    let poly = [u.copy(), v.copy()];
    if (!allSegmentsIntersect(O, poly)) return null;
    return {
      cost: d,
      perimeter: 2 * d,
      chain: poly,
      polygon: poly,
      u: u.copy(),
      v: v.copy()
    };
  }

  // Repère local orthonormé : u = (0, 0), v = (d, 0), chaîne dans y >= 0
  let ex = { x: (v.x - u.x) / d, y: (v.y - u.y) / d };
  let ey = { x: -ex.y, y: ex.x };

  const toLocal = (p) => ({
    x: (p.x - u.x) * ex.x + (p.y - u.y) * ex.y,
    y: (p.x - u.x) * ey.x + (p.y - u.y) * ey.y
  });

  const toWorld = (pt) => createVector(
    u.x + pt.x * ex.x + pt.y * ey.x,
    u.y + pt.x * ex.y + pt.y * ey.y
  );

  let localSegments = activeSegments.map(s => ({
    a: toLocal(s.a),
    b: toLocal(s.b)
  }));

  // Étape 2 : Demi-plans fermés H_i triés dans le sens horaire depuis n_0 = (0, -1) (Lemme 22)
  let halfPlanes = buildOrderedHalfPlanes(localSegments, d);

  // Étape 3 : Résolution exacte TPP de u = (0,0) à v = (d,0)
  let tppResult = solveTPPHalfPlanes(halfPlanes, { x: d, y: 0 });
  if (!tppResult) return null;

  let localChain = simplifyChain(tppResult.chain);
  console.log(localChain);
  // Étape 4 : Vérifications de validité (Théorème 18)
  if (!isValidUpperConvexChain(localChain, d)) {
    console.log("Rejected by convexity");
    return null;
  }

  let worldChain = localChain.map(toWorld);

  // Construire le polygone fermé C(Gamma)
  let closedPoly = worldChain.slice();
  if (closedPoly.length >= 2 && p5.Vector.dist(closedPoly[0], closedPoly[closedPoly.length - 1]) < TPP_EPS) {
    closedPoly.pop();
  }
  
  if (!allSegmentsIntersect(O, closedPoly)) {
    sols.push(closedPoly);
    console.log(
      "Rejected by allSegmentsIntersect",
      closedPoly
    );
    return null;
  }

  // Aucun sommet intermédiaire (hors u et v) ne doit appartenir à Y
  for (let i = 1; i < worldChain.length - 1; i++) {
    let w = worldChain[i];
    for (let s of O) {
      if (p5.Vector.dist(w, s.a) < 1e-1 || p5.Vector.dist(w, s.b) < 1e-1) {
        return null;
      }
    }
  }

  return {
    cost: tppResult.cost,
    perimeter: tppResult.cost + d,
    chain: worldChain,
    polygon: closedPoly,
    u: u.copy(),
    v: v.copy()
  };
}

// Cas dégénéré u = v : polygone convexe optimal ancré en u sans autre sommet dans Y
function solveSubroutineIIDegeneratePoint(u, O) {
  let remaining = O.filter(s => !pointOnSegment(u, s));
  if (remaining.length === 0) {
    return {
      cost: 0,
      perimeter: 0,
      chain: [u.copy()],
      polygon: [u.copy()],
      u: u.copy(),
      v: u.copy()
    };
  }

  let localSegments = remaining.map(s => ({
    a: { x: s.a.x - u.x, y: s.a.y - u.y },
    b: { x: s.b.x - u.x, y: s.b.y - u.y }
  }));

  let halfPlanes = buildOrderedHalfPlanes(localSegments, 0);
  let tppResult = solveTPPHalfPlanes(halfPlanes, { x: 0, y: 0 });
  if (!tppResult) return null;

  let localChain = simplifyChain(tppResult.chain);
  let worldChain = localChain.map(pt => createVector(u.x + pt.x, u.y + pt.y));

  let poly = worldChain.slice();
  if (poly.length >= 2 && p5.Vector.dist(poly[0], poly[poly.length - 1]) < 1e-1) {
    poly.pop();
  }

  if (poly.length < 3 || !isConvexPolygon(poly)) return null;
  if (!allSegmentsIntersect(O, poly)) return null;

  for (let i = 1; i < poly.length; i++) {
    let w = poly[i];
    for (let s of O) {
      if (p5.Vector.dist(w, s.a) < 1e-1 || p5.Vector.dist(w, s.b) < 1e-1) {
        return null;
      }
    }
  }

  return {
    cost: tppResult.cost,
    perimeter: polygonPerimeter(poly),
    chain: worldChain,
    polygon: poly,
    u: u.copy(),
    v: u.copy()
  };
}

function buildOrderedHalfPlanes(localSegments, d) {
  let planes = [];

  for (let s of localSegments) {
    let dx = s.b.x - s.a.x;
    let dy = s.b.y - s.a.y;
    let len = Math.hypot(dx, dy);

    if (len < TPP_EPS) {
      let px = s.a.x, py = s.a.y;
      let plen = Math.hypot(px, py);
      if (plen < TPP_EPS) continue;
      let nx = px / plen, ny = py / plen;
      let c = nx * px + ny * py;
      planes.push({ n: { x: nx, y: ny }, c, angle: clockwiseAngleFromDown(nx, ny) });
      continue;
    }

    let nx = -dy / len;
    let ny = dx / len;
    let c = nx * s.a.x + ny * s.a.y;

    let valU = -c;
    if (Math.abs(valU) > TPP_EPS) {
      if (valU > 0) {
        nx = -nx;
        ny = -ny;
        c = -c;
      }
    } else {
      let valV = nx * d - c;
      if (Math.abs(valV) > TPP_EPS) {
        if (valV < 0) {
          nx = -nx;
          ny = -ny;
          c = -c;
        }
      } else {
        if (ny < 0) {
          nx = -nx;
          ny = -ny;
          c = -c;
        }
      }
    }

    planes.push({
      n: { x: nx, y: ny },
      c: c,
      angle: clockwiseAngleFromDown(nx, ny)
    });
  }

  planes.sort((h1, h2) => h1.angle - h2.angle);
  return planes;
}

function clockwiseAngleFromDown(nx, ny) {
  let theta = Math.atan2(ny, nx);
  let cw = -Math.PI / 2 - theta;
  while (cw < 0) cw += 2 * Math.PI;
  while (cw >= 2 * Math.PI) cw -= 2 * Math.PI;
  return cw;
}

// ============================================================================
// SOLVEUR EXACT TPP SUR DEMI-PLANS
// ============================================================================

function solveTPPHalfPlanes(halfPlanes, targetV) {
  const M = 1e6;
  const initialBox = [
    { x: -M, y: -M },
    { x:  M, y: -M },
    { x:  M, y:  M },
    { x: -M, y:  M }
  ];

  let currentCells = [{
    poly: [{ x: 0, y: 0 }],
    source: { x: 0, y: 0 },
    offset: 0,
    bendType: 'start',
    parent: null
  }];

  for (let i = 0; i < halfPlanes.length; i++) {
    let H = halfPlanes[i];
    let nextCells = [];

    for (let cell of currentCells) {
      let s = cell.source;
      let poly = cell.poly;

      // 1. Transition directe
      if (poly.length === 1 || pointInLocalConvexPoly(s, poly)) {
        let clipped = clipConvexPolygon(initialBox, H.n, H.c);
        if (clipped.length >= 1) {
          nextCells.push({
            poly: clipped,
            source: { x: s.x, y: s.y },
            offset: cell.offset,
            bendType: 'direct',
            parent: cell
          });
        }
      } else {
        for (let e = 0; e < poly.length; e++) {
          let a = poly[e];
          let b = poly[(e + 1) % poly.length];
          if (localCross(a, b, s) < -TPP_EPS) {
            let cone = buildTruncatedCone(s, a, b, true, initialBox);
            let clipped = clipConvexPolygon(cone, H.n, H.c);
            if (clipped.length >= 1) {
              nextCells.push({
                poly: clipped,
                source: { x: s.x, y: s.y },
                offset: cell.offset,
                bendType: 'direct',
                parent: cell
              });
            }
          }
        }
      }

      // 2. Réflexion optique sur chaque arête ab de cell
      if (poly.length >= 2) {
        let numEdges = poly.length === 2 ? 1 : poly.length;
        for (let e = 0; e < numEdges; e++) {
          let a = poly[e];
          let b = poly[(e + 1) % poly.length];
          if (localCross(a, b, s) < -TPP_EPS) {
            let line = lineFromSegment(a, b);
            let sRef = reflectPoint(s, line.n, line.c);
            let reflCone = buildTruncatedCone(sRef, a, b, false, initialBox);
            let clipped = clipConvexPolygon(reflCone, H.n, H.c);
            if (clipped.length >= 1) {
              nextCells.push({
                poly: clipped,
                source: sRef,
                offset: cell.offset,
                bendType: 'reflect',
                reflectLine: line,
                parent: cell
              });
            }
          }
        }

        // 3. Contournement aux sommets de cell
        for (let w of poly) {
          if (Math.abs(w.x) >= M * 0.5 || Math.abs(w.y) >= M * 0.5) continue;
          let dsw = Math.hypot(w.x - s.x, w.y - s.y);
          if (dsw < TPP_EPS) continue;
          let clipped = clipConvexPolygon(initialBox, H.n, H.c);
          if (clipped.length >= 1) {
            nextCells.push({
              poly: clipped,
              source: { x: w.x, y: w.y },
              offset: cell.offset + dsw,
              bendType: 'vertex',
              bendPoint: { x: w.x, y: w.y },
              parent: cell
            });
          }
        }
      }
    }

    if (nextCells.length === 0) return null;
    currentCells = pruneDominatedCells(nextCells);
  }

  let bestCost = Infinity;
  let bestFinalStep = null;

  for (let cell of currentCells) {
    let s = cell.source;
    let poly = cell.poly;

    if (poly.length === 1) {
      let w = poly[0];
      let cost = cell.offset + Math.hypot(w.x - s.x, w.y - s.y) + Math.hypot(targetV.x - w.x, targetV.y - w.y);
      if (cost < bestCost) {
        bestCost = cost;
        bestFinalStep = { cell, waypoint: w };
      }
      continue;
    }

    // A. Arrivée directe en targetV
    if (localSegmentIntersectsConvexPoly(s, targetV, poly)) {
      let cost = cell.offset + Math.hypot(targetV.x - s.x, targetV.y - s.y);
      if (cost < bestCost) {
        bestCost = cost;
        bestFinalStep = { cell, waypoint: null };
      }
    }

    // B. Réflexion finale sur une arête ab de S_k vers targetV
    let numEdges = poly.length === 2 ? 1 : poly.length;
    for (let e = 0; e < numEdges; e++) {
      let a = poly[e];
      let b = poly[(e + 1) % poly.length];
      if (localCross(a, b, s) < -TPP_EPS && localCross(a, b, targetV) < -TPP_EPS) {
        let line = lineFromSegment(a, b);
        let sRef = reflectPoint(s, line.n, line.c);
        let hit = intersectLineWithSegment(sRef, targetV, a, b);
        if (hit) {
          let cost = cell.offset + Math.hypot(targetV.x - sRef.x, targetV.y - sRef.y);
          if (cost < bestCost) {
            bestCost = cost;
            bestFinalStep = { cell, waypoint: hit };
          }
        }
      }
    }

    // C. Rebond sur un sommet w de S_k vers targetV
    for (let w of poly) {
      if (Math.abs(w.x) >= M * 0.5 || Math.abs(w.y) >= M * 0.5) continue;
      let cost = cell.offset
        + Math.hypot(w.x - s.x, w.y - s.y)
        + Math.hypot(targetV.x - w.x, targetV.y - w.y);
      if (cost < bestCost) {
        bestCost = cost;
        bestFinalStep = { cell, waypoint: { x: w.x, y: w.y } };
      }
    }
  }

  if (!bestFinalStep) return null;

  let reversedPath = [{ x: targetV.x, y: targetV.y }];
  let currTarget = { x: targetV.x, y: targetV.y };

  if (bestFinalStep.waypoint) {
    reversedPath.push(bestFinalStep.waypoint);
    currTarget = bestFinalStep.waypoint;
  }

  let currCell = bestFinalStep.cell;
  while (currCell && currCell.parent) {
    if (currCell.bendType === 'vertex') {
      reversedPath.push(currCell.bendPoint);
      currTarget = currCell.bendPoint;
    } else if (currCell.bendType === 'reflect') {
      let hit = intersectSegmentWithLine(currCell.source, currTarget, currCell.reflectLine.n, currCell.reflectLine.c);
      if (hit) {
        reversedPath.push(hit);
        currTarget = hit;
      }
    }
    currCell = currCell.parent;
  }

  reversedPath.push({ x: 0, y: 0 });
  reversedPath.reverse();

  return {
    cost: bestCost,
    chain: reversedPath
  };
}

// ============================================================================
// UTILITAIRES GÉOMÉTRIQUES LOCAUX
// ============================================================================

function localCross(o, a, b) {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

function lineFromSegment(a, b) {
  let dx = b.x - a.x;
  let dy = b.y - a.y;
  let len = Math.hypot(dx, dy);
  let nx = -dy / len;
  let ny = dx / len;
  let c = nx * a.x + ny * a.y;
  return { n: { x: nx, y: ny }, c };
}

function reflectPoint(p, n, c) {
  let dist = n.x * p.x + n.y * p.y - c;
  return {
    x: p.x - 2 * dist * n.x,
    y: p.y - 2 * dist * n.y
  };
}

function buildTruncatedCone(source, a, b, keepOppositeSideFromSource, box) {
  let lineAB = lineFromSegment(a, b);
  let valS = lineAB.n.x * source.x + lineAB.n.y * source.y - lineAB.c;

  let nAB = { x: lineAB.n.x, y: lineAB.n.y };
  let cAB = lineAB.c;
  if (keepOppositeSideFromSource) {
    if (valS > 0) { nAB.x = -nAB.x; nAB.y = -nAB.y; cAB = -cAB; }
  } else {
    if (valS < 0) { nAB.x = -nAB.x; nAB.y = -nAB.y; cAB = -cAB; }
  }

  let poly = clipConvexPolygon(box, nAB, cAB);
  if (poly.length < 3) return [];

  let lineSA = lineFromSegment(source, a);
  if (lineSA.n.x * b.x + lineSA.n.y * b.y - lineSA.c < 0) {
    lineSA.n.x = -lineSA.n.x;
    lineSA.n.y = -lineSA.n.y;
    lineSA.c = -lineSA.c;
  }
  poly = clipConvexPolygon(poly, lineSA.n, lineSA.c);
  if (poly.length < 3) return [];

  let lineSB = lineFromSegment(source, b);
  if (lineSB.n.x * a.x + lineSB.n.y * a.y - lineSB.c < 0) {
    lineSB.n.x = -lineSB.n.x;
    lineSB.n.y = -lineSB.n.y;
    lineSB.c = -lineSB.c;
  }
  poly = clipConvexPolygon(poly, lineSB.n, lineSB.c);
  return poly;
}

function clipConvexPolygon(poly, n, c) {
  if (!poly || poly.length === 0) return [];
  let out = [];

  for (let i = 0; i < poly.length; i++) {
    let curr = poly[i];
    let next = poly[(i + 1) % poly.length];
    let dCurr = n.x * curr.x + n.y * curr.y - c;
    let dNext = n.x * next.x + n.y * next.y - c;

    if (dCurr >= -TPP_EPS) {
      out.push({ x: curr.x, y: curr.y });
    }
    if ((dCurr > TPP_EPS && dNext < -TPP_EPS) || (dCurr < -TPP_EPS && dNext > TPP_EPS)) {
      let t = dCurr / (dCurr - dNext);
      out.push({
        x: curr.x + t * (next.x - curr.x),
        y: curr.y + t * (next.y - curr.y)
      });
    }
  }

  let cleaned = [];
  for (let p of out) {
    if (cleaned.length === 0 || Math.hypot(p.x - cleaned[cleaned.length - 1].x, p.y - cleaned[cleaned.length - 1].y) > TPP_EPS) {
      cleaned.push(p);
    }
  }
  if (cleaned.length > 1 && Math.hypot(cleaned[0].x - cleaned[cleaned.length - 1].x, cleaned[0].y - cleaned[cleaned.length - 1].y) <= TPP_EPS) {
    cleaned.pop();
  }
  return cleaned;
}

function pruneDominatedCells(cells) {
  let kept = [];
  for (let i = 0; i < cells.length; i++) {
    let c1 = cells[i];
    let dominated = false;
    for (let j = 0; j < cells.length; j++) {
      if (i === j) continue;
      let c2 = cells[j];
      if (c2.poly.length < 3) continue;
      let allInsideAndCheaper = true;
      for (let v of c1.poly) {
        if (!pointInLocalConvexPoly(v, c2.poly)) {
          allInsideAndCheaper = false;
          break;
        }
        let d1 = c1.offset + Math.hypot(v.x - c1.source.x, v.y - c1.source.y);
        let d2 = c2.offset + Math.hypot(v.x - c2.source.x, v.y - c2.source.y);
        if (d2 > d1 + TPP_EPS || (Math.abs(d2 - d1) <= TPP_EPS && j > i)) {
          allInsideAndCheaper = false;
          break;
        }
      }
      if (allInsideAndCheaper) {
        dominated = true;
        break;
      }
    }
    if (!dominated) kept.push(c1);
  }
  return kept;
}

function pointInLocalConvexPoly(p, poly) {
  if (!poly || poly.length < 3) return false;
  for (let i = 0; i < poly.length; i++) {
    let a = poly[i];
    let b = poly[(i + 1) % poly.length];
    if (localCross(a, b, p) < -TPP_EPS) return false;
  }
  return true;
}

function localSegmentIntersectsConvexPoly(p1, p2, poly) {
  if (!poly || poly.length === 0) return false;
  if (poly.length === 1) return localPointOnSeg(poly[0], { a: p1, b: p2 });
  if (poly.length === 2) return intersectLineWithSegment(p1, p2, poly[0], poly[1]) !== null;
  if (pointInLocalConvexPoly(p1, poly) || pointInLocalConvexPoly(p2, poly)) return true;
  for (let i = 0; i < poly.length; i++) {
    let a = poly[i];
    let b = poly[(i + 1) % poly.length];
    if (intersectLineWithSegment(p1, p2, a, b)) return true;
  }
  return false;
}

function intersectLineWithSegment(p1, p2, a, b) {
  let d1 = localCross(p1, p2, a);
  let d2 = localCross(p1, p2, b);
  let d3 = localCross(a, b, p1);
  let d4 = localCross(a, b, p2);

  if (((d1 > TPP_EPS && d2 < -TPP_EPS) || (d1 < -TPP_EPS && d2 > TPP_EPS)) &&
      ((d3 > TPP_EPS && d4 < -TPP_EPS) || (d3 < -TPP_EPS && d4 > TPP_EPS))) {
    let denom = (p1.x - p2.x) * (a.y - b.y) - (p1.y - p2.y) * (a.x - b.x);
    if (Math.abs(denom) < TPP_EPS) return null;
    let t = ((p1.x - a.x) * (a.y - b.y) - (p1.y - a.y) * (a.x - b.x)) / denom;
    return { x: p1.x + t * (p2.x - p1.x), y: p1.y + t * (p2.y - p1.y) };
  }

  if (Math.abs(d1) <= TPP_EPS && localPointOnSeg(a, { a: p1, b: p2 })) return { x: a.x, y: a.y };
  if (Math.abs(d2) <= TPP_EPS && localPointOnSeg(b, { a: p1, b: p2 })) return { x: b.x, y: b.y };
  if (Math.abs(d3) <= TPP_EPS && localPointOnSeg(p1, { a, b })) return { x: p1.x, y: p1.y };
  if (Math.abs(d4) <= TPP_EPS && localPointOnSeg(p2, { a, b })) return { x: p2.x, y: p2.y };
  return null;
}

function intersectSegmentWithLine(p1, p2, n, c) {
  let d1 = n.x * p1.x + n.y * p1.y - c;
  let d2 = n.x * p2.x + n.y * p2.y - c;
  if (Math.abs(d1 - d2) < TPP_EPS) return null;
  let t = d1 / (d1 - d2);
  if (t < -TPP_EPS || t > 1 + TPP_EPS) return null;
  t = Math.max(0, Math.min(1, t));
  return {
    x: p1.x + t * (p2.x - p1.x),
    y: p1.y + t * (p2.y - p1.y)
  };
}

function localPointOnSeg(p, s) {
  let d1 = Math.hypot(p.x - s.a.x, p.y - s.a.y);
  let d2 = Math.hypot(p.x - s.b.x, p.y - s.b.y);
  let len = Math.hypot(s.b.x - s.a.x, s.b.y - s.a.y);
  return Math.abs(d1 + d2 - len) <= TPP_EPS;
}

function simplifyChain(pts) {
  if (!pts || pts.length <= 2) return pts;
  let unique = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    let prev = unique[unique.length - 1];
    if (Math.hypot(pts[i].x - prev.x, pts[i].y - prev.y) > 1e-1) {
      unique.push(pts[i]);
    }
  }
  if (unique.length <= 2) return unique;

  let simplified = [unique[0]];
  for (let i = 1; i < unique.length - 1; i++) {
    let prev = simplified[simplified.length - 1];
    let curr = unique[i];
    let next = unique[i + 1];
    if (Math.abs(localCross(prev, curr, next)) > 1e-1) {
      simplified.push(curr);
    }
  }
  simplified.push(unique[unique.length - 1]);
  return simplified;
}

function isValidUpperConvexChain(chain, d) {
  if (!chain || chain.length < 2) return false;
  if (chain.length === 2) {
    return Math.abs(chain[0].x) < 1e-1 && Math.abs(chain[0].y) < 1e-1 &&
           Math.abs(chain[1].x - d) < 1e-1 && Math.abs(chain[1].y) < 1e-1;
  }

  for (let p of chain) {
    if (p.y < -1e-1) return false;
  }

  let n = chain.length;
  let hasStrictTurn = false;
  for (let i = 0; i < n; i++) {
    let a = chain[i];
    let b = chain[(i + 1) % n];
    let c = chain[(i + 2) % n];
    let cr = localCross(a, b, c);
    if (cr > 1e-1) return false;
    if (cr < -1e-1) hasStrictTurn = true;
  }
  return hasStrictTurn;
}

function drawCoordinateSystem() {

  const STEP = 50;

  stroke(220);
  strokeWeight(1);

  // Vertical grid
  for (let x = 0; x <= width; x += STEP) {
    line(x, 0, x, 600);
  }

  // Horizontal grid
  for (let y = 0; y <= 600; y += STEP) {
    line(0, y, width, y);
  }

  // Axes
  stroke(120);
  strokeWeight(2);

  line(0, 0, width, 0);   // x-axis
  line(0, 0, 0, 600);  // y-axis

  fill(60);
  noStroke();
  textSize(10);

  // X labels
  for (let x = 0; x <= width; x += STEP) {
    text(x, x + 2, 12);
  }

  // Y labels
  for (let y = 0; y <= 600; y += STEP) {
    text(y, 2, y - 2);
  }
}