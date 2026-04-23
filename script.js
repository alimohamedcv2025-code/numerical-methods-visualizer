// ─── Shared helpers ───
function fEval(expr, x) {
  return math.evaluate(expr, { x });
}
function fmt(n, digits) {
  return n.toFixed(digits);
}
function convertFxToGx(fxStr) {
  try {
    const detailed = math.rationalize(fxStr.trim(), {}, true);
    if (!detailed || !detailed.coefficients || !detailed.variables || !detailed.variables.includes("x")) {
      return null;
    }
    const coef = detailed.coefficients;
    let degree = coef.length - 1;
    while (degree > 0 && coef[degree] === 0) degree--;
    if (degree < 1) return null;
    let a = coef[degree];
    if (a < 0) {
      for (let i = 0; i < coef.length; i++) coef[i] = -coef[i];
      a = coef[degree];
    }
    const terms = [];
    for (let i = 0; i < degree; i++) {
      const c = coef[i];
      if (c === 0) continue;
      const cStr = c < 0 ? "(" + c + ")" : String(c);
      if (i === 0) terms.push(cStr);
      else if (i === 1) terms.push(cStr + "*x");
      else terms.push(cStr + "*x^" + i);
    }
    const restStr = terms.length === 0 ? "0" : terms.join("+");
    const rightSide = "(-(" + restStr + ")/" + a + ")";
    if (degree === 2) {
      return "sqrt(" + rightSide + ")";
    }
    return "(" + rightSide + ")^(1/" + degree + ")";
  } catch {
    return null;
  }
}
// ─── Solver functions (with maxIter support) ───
function solveBracket(method, funcExpr, xlInit, xuInit, epsilon, maxIter) {
  const rows = [];
  let xl = xlInit, xu = xuInit, prevXr = 0;
  const limit = maxIter || 1000;
  for (let i = 1; i <= limit; i++) {
    const fxl = fEval(funcExpr, xl);
    const fxu = fEval(funcExpr, xu);
    let xr = method === "bisection" ? (xl + xu) / 2 : (xl * fxu - xu * fxl) / (fxu - fxl);
    const fxr = fEval(funcExpr, xr);
    const err = i === 1 ? 0 : Math.abs((xr - prevXr) / xr) * 100;
    rows.push({ iteration: i, xl, xu, xr, f_xl: fxl, f_xu: fxu, f_xr: fxr, error: err });
    if (epsilon !== null && err < epsilon && i > 1) break;
    if (err === 0 && i > 1) break;
    if (Math.abs(fxr) < 1e-14) break;
    if (fxl * fxr < 0) xu = xr; else xl = xr;
    prevXr = xr;
  }
  return rows;
}
function solveFixedPoint(gExpr, x0, epsilon, maxIter) {
  const rows = [];
  let xi = x0;
  const limit = maxIter || 1000;
  for (let i = 1; i <= limit; i++) {
    const gxi = fEval(gExpr, xi);
    const err = i === 1 ? 0 : Math.abs((gxi - xi) / gxi) * 100;
    rows.push({ iteration: i, xi, gxi, error: err });
    if (epsilon !== null && err < epsilon && i > 1) break;
    if (err === 0 && i > 1) break;
    xi = gxi;
  }
  return rows;
}
function solveNewton(funcExpr, dfExpr, x0, epsilon, maxIter) {
  const rows = [];
  let xi = x0;
  const limit = maxIter || 1000;
  for (let i = 1; i <= limit; i++) {
    const fxi = fEval(funcExpr, xi);
    const fpxi = fEval(dfExpr, xi);
    if (Math.abs(fpxi) < 1e-15) break;
    const xiPlus1 = xi - fxi / fpxi;
    const err = i === 1 ? 0 : Math.abs((xiPlus1 - xi) / xiPlus1) * 100;
    rows.push({ iteration: i, xi, fxi, fpxi, xiPlus1, error: err });
    if (epsilon !== null && err < epsilon && i > 1) break;
    if (err === 0 && i > 1) break;
    if (Math.abs(fxi) < 1e-14) break;
    xi = xiPlus1;
  }
  return rows;
}
// ─── NEW: Secant Method ───
function solveSecant(funcExpr, x0, x1, epsilon, maxIter) {
  const rows = [];
  let xiPrev = x0, xi = x1;
  const limit = maxIter || 1000;
  for (let i = 1; i <= limit; i++) {
    const fPrev = fEval(funcExpr, xiPrev);
    const fCurr = fEval(funcExpr, xi);
    const denom = fCurr - fPrev;
    if (Math.abs(denom) < 1e-15) break;
    const xiPlus1 = xi - fCurr * (xi - xiPrev) / denom;
    const err = i === 1 ? 0 : Math.abs((xiPlus1 - xi) / xiPlus1) * 100;
    rows.push({ iteration: i, xi_1: xiPrev, xi: xi, f_xi_1: fPrev, f_xi: fCurr, xiPlus1: xiPlus1, error: err });
    if (epsilon !== null && err < epsilon && i > 1) break;
    if (err === 0 && i > 1) break;
    if (Math.abs(fCurr) < 1e-14) break;
    xiPrev = xi;
    xi = xiPlus1;
  }
  return rows;
}
// ─── NEW: Golden Section ───
function solveGolden(funcExpr, xlInit, xuInit, optType, maxIter) {
  const rows = [];
  let xl = xlInit, xu = xuInit;
  const R = (Math.sqrt(5) - 1) / 2;
  const limit = maxIter || 8;
  for (let i = 0; i < limit; i++) {
    const d = R * (xu - xl);
    const x1 = xl + d;
    const x2 = xu - d;
    const f1 = fEval(funcExpr, x1);
    const f2 = fEval(funcExpr, x2);
    rows.push({ iteration: i, xl, f_xl: fEval(funcExpr, xl), xu, f_xu: fEval(funcExpr, xu), x1, f_x1: f1, x2, f_x2: f2, d });
    if (optType === "max") {
      if (f1 > f2) xl = x2; else xu = x1;
    } else {
      if (f2 > f1) xl = x2; else xu = x1;
    }
  }
  return rows;
}
// ─── Detect page ───
const isOutputPage = !!document.getElementById("tableBody");
// ═══════════════════════════════════════════
// INDEX PAGE LOGIC
// ═══════════════════════════════════════════
if (!isOutputPage) {
  const methodSelect = document.getElementById("methodSelect");
  const methodBadge = document.getElementById("methodBadge");
  const inputSection = document.getElementById("inputSection");
  const errorBox = document.getElementById("errorBox");
  const funcRow = document.getElementById("funcRow");
  const gRow = document.getElementById("gRow");
  const dfRow = document.getElementById("dfRow");
  const xlRow = document.getElementById("xlRow");
  const xuRow = document.getElementById("xuRow");
  const x0Row = document.getElementById("x0Row");
  const x1Row = document.getElementById("x1Row");
  const stopSelect = document.getElementById("stopSelect");
  const epsilonRow = document.getElementById("epsilonRow");
  const maxIterRow = document.getElementById("maxIterRow");
  const methodNames = {
    bisection: "Bisection",
    falseposition: "False Position",
    fixedpoint: "Simple Fixed Point",
    newton: "Newton-Raphson",
    secant: "Secant",
  };
  // Toggle stopping criterion
  stopSelect.addEventListener("change", function () {
    if (this.value === "epsilon") {
      epsilonRow.classList.remove("hidden");
      maxIterRow.classList.add("hidden");
    } else {
      epsilonRow.classList.add("hidden");
      maxIterRow.classList.remove("hidden");
    }
  });
  methodSelect.addEventListener("change", function () {
    const m = this.value;
    errorBox.classList.add("hidden");
    if (!m) {
      inputSection.classList.add("hidden");
      methodBadge.classList.add("hidden");
      return;
    }
    inputSection.classList.remove("hidden");
    methodBadge.textContent = methodNames[m];
    methodBadge.classList.remove("hidden");

    const polyActiveMethodBadge = document.getElementById("polyActiveMethodBadge");
    if (polyActiveMethodBadge) {
      polyActiveMethodBadge.textContent = methodNames[m];
    }

    const isBracket = m === "bisection" || m === "falseposition";
    const isFP = m === "fixedpoint";
    const isN = m === "newton";
    const isSec = m === "secant";
    funcRow.classList.toggle("hidden", false);
    gRow.classList.toggle("hidden", !isFP);
    dfRow.classList.toggle("hidden", !isN);
    xlRow.classList.toggle("hidden", !isBracket);
    xuRow.classList.toggle("hidden", !isBracket);
    x0Row.classList.toggle("hidden", isBracket);
    x1Row.classList.toggle("hidden", !isSec);
  });
  document.getElementById("convertToGxBtn").addEventListener("click", function () {
    const fxStr = document.getElementById("funcExpr").value.trim();
    if (!fxStr) {
      errorBox.textContent = "Enter f(x) then click f'(x)";
      errorBox.classList.remove("hidden");
      return;
    }
    const gExpr = convertFxToGx(fxStr);
    if (gExpr) {
      document.getElementById("gExpr").value = gExpr;
      errorBox.classList.add("hidden");
    } else {
      errorBox.textContent = "Conversion failed. Make sure f(x) is a polynomial in terms of x (e.g., x^3 - 4*x - 9).";
      errorBox.classList.remove("hidden");
    }
  });

  document.getElementById("calcDerivativeBtn").addEventListener("click", function () {
    const fxStr = document.getElementById("funcExpr").value.trim();
    if (!fxStr) {
      errorBox.textContent = "Enter f(x) first, then click Calculate f'(x).";
      errorBox.classList.remove("hidden");
      return;
    }
    try {
      const derivative = math.derivative(fxStr, 'x').toString();
      document.getElementById("dfExpr").value = derivative;
      errorBox.classList.add("hidden");
    } catch (e) {
      errorBox.textContent = "Failed to calculate derivative. Check the syntax of f(x).";
      errorBox.classList.remove("hidden");
    }
  });
  document.getElementById("solveBtn").addEventListener("click", function () {
    const m = methodSelect.value;
    const stopMode = stopSelect.value;
    const digits = parseInt(document.getElementById("digitsInput").value) || 6;
    let eps = null;
    let maxIter = null;
    if (stopMode === "epsilon") {
      eps = parseFloat(document.getElementById("epsilonInput").value);
      if (!m || isNaN(eps)) {
        errorBox.textContent = "Please fill all fields with valid numbers.";
        errorBox.classList.remove("hidden");
        return;
      }
    } else {
      maxIter = parseInt(document.getElementById("maxIterInput").value);
      if (!m || isNaN(maxIter) || maxIter < 1) {
        errorBox.textContent = "Please enter a valid number of max iterations.";
        errorBox.classList.remove("hidden");
        return;
      }
    }
    const params = { method: m, epsilon: eps, digits, maxIter, stopMode };
    try {
      if (m === "bisection" || m === "falseposition") {
        const funcExpr = document.getElementById("funcExpr").value.trim();
        const xl = parseFloat(document.getElementById("xlInput").value);
        const xu = parseFloat(document.getElementById("xuInput").value);
        if (!funcExpr || [xl, xu].some(isNaN)) { errorBox.textContent = "Please fill all fields."; errorBox.classList.remove("hidden"); return; }
        const fxl = fEval(funcExpr, xl);
        const fxu = fEval(funcExpr, xu);
        if (fxl * fxu >= 0) { errorBox.textContent = "Invalid interval: f(xl) and f(xu) must have opposite signs."; errorBox.classList.remove("hidden"); return; }
        params.funcExpr = funcExpr;
        params.xl = xl;
        params.xu = xu;
      } else if (m === "fixedpoint") {
        let gExpr = document.getElementById("gExpr").value.trim();
        const fxStr = document.getElementById("funcExpr").value.trim();
        if (!gExpr && fxStr) {
          gExpr = convertFxToGx(fxStr);
          if (gExpr) document.getElementById("gExpr").value = gExpr;
        }
        const x0 = parseFloat(document.getElementById("x0Input").value);
        if (!gExpr || isNaN(x0)) { errorBox.textContent = "Enter g(x) and x₀, or enter f(x) and click 'Convert' then x₀."; errorBox.classList.remove("hidden"); return; }
        params.gExpr = gExpr;
        params.x0 = x0;
      } else if (m === "newton") {
        const funcExpr = document.getElementById("funcExpr").value.trim();
        let dfExpr = document.getElementById("dfExpr").value.trim();
        if (!dfExpr && funcExpr) {
          try {
            dfExpr = math.derivative(funcExpr, 'x').toString();
            document.getElementById("dfExpr").value = dfExpr;
          } catch (e) { }
        }
        const x0 = parseFloat(document.getElementById("x0Input").value);
        if (!funcExpr || !dfExpr || isNaN(x0)) { errorBox.textContent = "Please fill f(x), f'(x) and x₀."; errorBox.classList.remove("hidden"); return; }
        params.funcExpr = funcExpr;
        params.dfExpr = dfExpr;
        params.x0 = x0;
      } else if (m === "secant") {
        const funcExpr = document.getElementById("funcExpr").value.trim();
        const x0 = parseFloat(document.getElementById("x0Input").value);
        const x1 = parseFloat(document.getElementById("x1Input").value);
        if (!funcExpr || isNaN(x0) || isNaN(x1)) { errorBox.textContent = "Please fill f(x), x₀ and x₁."; errorBox.classList.remove("hidden"); return; }
        params.funcExpr = funcExpr;
        params.x0 = x0;
        params.x1 = x1;
      }
      if (params.funcExpr) fEval(params.funcExpr, 1);
      if (params.gExpr) fEval(params.gExpr, 1);
      if (params.dfExpr) fEval(params.dfExpr, 1);
      sessionStorage.setItem("nmvParams", JSON.stringify(params));
      window.location.href = "output.html";
    } catch {
      errorBox.textContent = "Invalid expression. Use math.js syntax, e.g. x^3 - 4*x - 9";
      errorBox.classList.remove("hidden");
    }
  });

  document.getElementById("polyLoadExampleBtn").addEventListener("click", function () {
    const m = methodSelect.value;
    errorBox.classList.add("hidden");

    // Reset shared fields
    document.getElementById("gExpr").value = "";
    document.getElementById("dfExpr").value = "";
    document.getElementById("digitsInput").value = "6";
    document.getElementById("stopSelect").value = "epsilon";
    epsilonRow.classList.remove("hidden");
    maxIterRow.classList.add("hidden");

    if (m === "bisection") {
      // f(x) = -2 + 7x - 5x^2 + 6x^3  |  xl=0, xu=1, error=10%
      document.getElementById("funcExpr").value = "-2 + 7*x - 5*x^2 + 6*x^3";
      document.getElementById("epsilonInput").value = "10";
      document.getElementById("xlInput").value = "0";
      document.getElementById("xuInput").value = "1";

    } else if (m === "falseposition") {
      // f(x) = -26 + 82.3x - 88x^2 + 45.4x^3 - 9x^4 + 0.65x^5  |  xl=0.5, xu=1, error=0.2%
      document.getElementById("funcExpr").value = "-26 + 82.3*x - 88*x^2 + 45.4*x^3 - 9*x^4 + 0.65*x^5";
      document.getElementById("epsilonInput").value = "0.2";
      document.getElementById("xlInput").value = "0.5";
      document.getElementById("xuInput").value = "1";

    } else if (m === "fixedpoint") {
      // f(x) = -0.9x^2 + 1.7x + 2.5  |  x0=5, error=0.7%
      const fxStr = "-0.9*x^2 + 1.7*x + 2.5";
      document.getElementById("funcExpr").value = fxStr;
      document.getElementById("epsilonInput").value = "0.7";
      document.getElementById("x0Input").value = "5";
      const gExpr = convertFxToGx(fxStr);
      document.getElementById("gExpr").value = gExpr || "";

    } else if (m === "newton") {
      // f(x) = -0.9x^2 + 1.7x + 2.5  |  x0=5, error=0.7%
      const fxStr = "-0.9*x^2 + 1.7*x + 2.5";
      document.getElementById("funcExpr").value = fxStr;
      document.getElementById("epsilonInput").value = "0.7";
      document.getElementById("x0Input").value = "5";
      try {
        document.getElementById("dfExpr").value = math.derivative(fxStr, "x").toString();
      } catch (e) {
        document.getElementById("dfExpr").value = "-1.8*x + 1.7";
      }

    } else if (m === "secant") {
      // f(x) = 0.95x^3 - 5.9x^2 + 10.9x - 6  |  x-1=2.5, x0=3.5, error=0.5%
      document.getElementById("funcExpr").value = "0.95*x^3 - 5.9*x^2 + 10.9*x - 6";
      document.getElementById("epsilonInput").value = "0.5";
      document.getElementById("x0Input").value = "2.5";
      document.getElementById("x1Input").value = "3.5";

    } else {
      // No method selected yet — inform the user
      errorBox.textContent = "Please select a method first, then click Load Example.";
      errorBox.classList.remove("hidden");
      return;
    }
  });
}
// ═══════════════════════════════════════════
// OUTPUT PAGE LOGIC
// ═══════════════════════════════════════════
if (isOutputPage) {
  const params = JSON.parse(sessionStorage.getItem("nmvParams") || "null");
  if (!params) { window.location.href = "index.html"; }
  const { method, epsilon, digits, maxIter, stopMode } = params;
  const methodNames = { bisection: "Bisection", falseposition: "False Position", fixedpoint: "Simple Fixed Point", newton: "Newton-Raphson", secant: "Secant", golden: "Golden Section" };
  document.getElementById("methodLabel").textContent = "Method: " + methodNames[method];
  Chart.defaults.color = "hsl(215, 20%, 65%)";
  Chart.defaults.borderColor = "hsl(217, 33%, 25%)";
  let iterations = [];
  let visibleCount = 0;
  let finished = false;
  let funcChartInst = null, convChartInst = null, errChartInst = null;
  const isBracket = method === "bisection" || method === "falseposition";
  const isFP = method === "fixedpoint";
  const isN = method === "newton";
  const isSec = method === "secant";
  const isGolden = method === "golden";
  const tabFunc = document.getElementById("tabFunc");
  if (isFP) tabFunc.classList.add("hidden");
  const tabError = document.querySelector('[data-tab="errorTab"]');
  if (isGolden && tabError) tabError.classList.add("hidden");
  const tableHead = document.getElementById("tableHead");
  if (isBracket) {
    tableHead.innerHTML = "<tr><th>Iter</th><th>xl</th><th>f(xl)</th><th>xu</th><th>f(xu)</th><th>xr</th><th>f(xr)</th><th>Error %</th></tr>";
  } else if (isFP) {
    tableHead.innerHTML = "<tr><th>Iter</th><th>xᵢ</th><th>g(xᵢ)</th><th>Error %</th></tr>";
  } else if (isN) {
    tableHead.innerHTML = "<tr><th>Iter</th><th>xᵢ</th><th>f(xᵢ)</th><th>f'(xᵢ)</th><th>xᵢ₊₁</th><th>Error %</th></tr>";
  } else if (isSec) {
    tableHead.innerHTML = "<tr><th>Iter</th><th>xᵢ₋₁</th><th>f(xᵢ₋₁)</th><th>xᵢ</th><th>f(xᵢ)</th><th>xᵢ₊₁</th><th>Error %</th></tr>";
  } else if (isGolden) {
    tableHead.innerHTML = "<tr><th>I</th><th>xl</th><th>f(xl)</th><th>x2</th><th>f(x2)</th><th>x1</th><th>f(x1)</th><th>xu</th><th>f(xu)</th><th>d</th></tr>";
  }
  if (isBracket) {
    iterations = solveBracket(method, params.funcExpr, params.xl, params.xu, epsilon, maxIter);
  } else if (isFP) {
    iterations = solveFixedPoint(params.gExpr, params.x0, epsilon, maxIter);
  } else if (isN) {
    iterations = solveNewton(params.funcExpr, params.dfExpr, params.x0, epsilon, maxIter);
  } else if (isSec) {
    iterations = solveSecant(params.funcExpr, params.x0, params.x1, epsilon, maxIter);
  } else if (isGolden) {
    iterations = solveGolden(params.funcExpr, params.xl, params.xu, params.optType, params.maxIter);
  }
  function renderRow(row) {
    const tr = document.createElement("tr");
    if (isBracket) {
      tr.innerHTML = '<td>' + row.iteration + '</td><td>' + fmt(row.xl, digits) + '</td><td>' + fmt(row.f_xl, digits) + '</td><td>' + fmt(row.xu, digits) + '</td><td>' + fmt(row.f_xu, digits) + '</td><td class="highlight">' + fmt(row.xr, digits) + '</td><td>' + fmt(row.f_xr, digits) + '</td><td>' + fmt(row.error, digits) + '</td>';
    } else if (isFP) {
      tr.innerHTML = '<td>' + row.iteration + '</td><td>' + fmt(row.xi, digits) + '</td><td class="highlight">' + fmt(row.gxi, digits) + '</td><td>' + fmt(row.error, digits) + '</td>';
    } else if (isN) {
      tr.innerHTML = '<td>' + row.iteration + '</td><td>' + fmt(row.xi, digits) + '</td><td>' + fmt(row.fxi, digits) + '</td><td>' + fmt(row.fpxi, digits) + '</td><td class="highlight">' + fmt(row.xiPlus1, digits) + '</td><td>' + fmt(row.error, digits) + '</td>';
    } else if (isSec) {
      tr.innerHTML = '<td>' + row.iteration + '</td><td>' + fmt(row.xi_1, digits) + '</td><td>' + fmt(row.f_xi_1, digits) + '</td><td>' + fmt(row.xi, digits) + '</td><td>' + fmt(row.f_xi, digits) + '</td><td class="highlight">' + fmt(row.xiPlus1, digits) + '</td><td>' + fmt(row.error, digits) + '</td>';
    } else if (isGolden) {
      tr.innerHTML = '<td>' + row.iteration + '</td><td>' + fmt(row.xl, digits) + '</td><td>' + fmt(row.f_xl, digits) + '</td><td class="highlight">' + fmt(row.x2, digits) + '</td><td>' + fmt(row.f_x2, digits) + '</td><td class="highlight">' + fmt(row.x1, digits) + '</td><td>' + fmt(row.f_x1, digits) + '</td><td>' + fmt(row.xu, digits) + '</td><td>' + fmt(row.f_xu, digits) + '</td><td>' + fmt(row.d, digits) + '</td>';
    }
    document.getElementById("tableBody").appendChild(tr);
  }
  function getXr(row) {
    if (isBracket) return row.xr;
    if (isFP) return row.gxi;
    if (isGolden) return row.x2; // For visual approx and final root
    return row.xiPlus1;
  }
  const blueAccent = "hsl(230, 100%, 65%)";
  const purpleAccent = "hsl(260, 100%, 70%)";
  const greenAccent = "hsl(142, 80%, 45%)";
  const redAccent = "hsl(0, 84%, 60%)";
  const tooltipOpts = {
    backgroundColor: "hsl(217, 33%, 17%)",
    borderColor: "hsl(217, 33%, 25%)",
    borderWidth: 1,
    titleColor: "hsl(210, 40%, 98%)",
    bodyColor: "hsl(210, 40%, 98%)",
  };
  const gridColor = "hsl(217, 33%, 25%)";
  const tickColor = "hsl(215, 20%, 65%)";
  function updateCharts() {
    const visible = iterations.slice(0, visibleCount);
    const labels = visible.map(function (r) { return r.iteration; });
    const xrData = visible.map(function (r) { return parseFloat(getXr(r).toFixed(digits)); });
    const errData = visible.map(function (r) { return r.error !== undefined ? parseFloat(r.error.toFixed(digits)) : 0; });
    if (!isFP && params.funcExpr) {
      var allX;
      if (isBracket) {
        allX = visible.flatMap(function (r) { return [r.xl, r.xu, r.xr]; });
      } else if (isSec) {
        allX = visible.flatMap(function (r) { return [r.xi_1, r.xi, r.xiPlus1]; });
      } else if (isGolden) {
        allX = visible.flatMap(function (r) { return [r.xl, r.xu, r.x1, r.x2]; });
      } else {
        allX = visible.flatMap(function (r) { return [r.xi, r.xiPlus1]; });
      }
      const minX = Math.min.apply(null, allX), maxX = Math.max.apply(null, allX);
      const pad = (maxX - minX) * 0.3 || 1;
      const lo = minX - pad, hi = maxX + pad, step = (hi - lo) / 200;
      const curve = [];
      for (let x = lo; x <= hi; x += step) {
        try { curve.push({ x: +x.toFixed(6), y: +fEval(params.funcExpr, x).toFixed(6) }); } catch (e) { }
      }
      const roots = visible.map(function (r) {
        var yVal;
        if (isBracket) yVal = r.f_xr;
        else if (isSec) yVal = r.f_xi;
        else if (isGolden) yVal = r.f_x2;
        else yVal = r.fxi;
        return {
          x: +getXr(r).toFixed(digits),
          y: +yVal.toFixed(digits),
        };
      });
      if (funcChartInst) funcChartInst.destroy();
      funcChartInst = new Chart(document.getElementById("functionChart"), {
        type: "scatter",
        data: {
          datasets: [
            { label: "f(x)", data: curve, showLine: true, borderColor: blueAccent, backgroundColor: "transparent", borderWidth: 2, pointRadius: 0, order: 2 },
            { label: "xr approx", data: roots, borderColor: redAccent, backgroundColor: redAccent, pointRadius: 5, showLine: false, order: 1 },
          ],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { tooltip: tooltipOpts },
          scales: { x: { grid: { color: gridColor }, ticks: { color: tickColor } }, y: { grid: { color: gridColor }, ticks: { color: tickColor } } },
        },
      });
    }
    if (convChartInst) convChartInst.destroy();
    convChartInst = new Chart(document.getElementById("convergenceChart"), {
      type: "line",
      data: {
        labels: labels,
        datasets: [{
          label: "Root approximation",
          data: xrData,
          borderColor: blueAccent,
          backgroundColor: blueAccent,
          borderWidth: 2,
          pointRadius: 4,
          tension: 0.2,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { tooltip: tooltipOpts },
        scales: {
          x: { title: { display: true, text: "Iteration", color: tickColor }, grid: { color: gridColor }, ticks: { color: tickColor } },
          y: { grid: { color: gridColor }, ticks: { color: tickColor } },
        },
      },
    });
    if (errChartInst) errChartInst.destroy();
    errChartInst = new Chart(document.getElementById("errorChart"), {
      type: "line",
      data: {
        labels: labels,
        datasets: [{
          label: "Error %",
          data: errData,
          borderColor: greenAccent,
          backgroundColor: greenAccent,
          borderWidth: 2,
          pointRadius: 4,
          tension: 0.2,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { tooltip: tooltipOpts },
        scales: {
          x: { title: { display: true, text: "Iteration", color: tickColor }, grid: { color: gridColor }, ticks: { color: tickColor } },
          y: { grid: { color: gridColor }, ticks: { color: tickColor } },
        },
      },
    });
  }
  visibleCount = iterations.length;
  updateCharts();
  finished = true;
  showResult();

  function showResult() {
    const root = getXr(iterations[iterations.length - 1]);
    var resultText = (isGolden ? (params.optType === "max" ? "Maximum" : "Minimum") + " ≈ " : "Root ≈ ") + fmt(root, digits);
    if (stopMode === "maxiter" || isGolden) {
      resultText += "  (stopped at " + maxIter + " iterations)";
    }
    document.getElementById("rootValue").textContent = resultText;
    if (isGolden) {
      const succ = document.querySelector(".success-text");
      if (succ) succ.textContent = "✅ Optimum Found Successfully";
      convChartInst.data.datasets[0].label = "Optimum approximation";
      convChartInst.update();
    }
    document.getElementById("resultBox").classList.remove("hidden");
  }

  const allStepsBtn = document.getElementById("allStepsBtn");
  if (allStepsBtn) {
    if (iterations.length <= 1) {
      allStepsBtn.classList.add("hidden");
    } else {
      allStepsBtn.addEventListener("click", function () {
        const tb = document.getElementById("tableBody");
        tb.innerHTML = "";
        for (let i = 0; i < iterations.length; i++) {
          renderRow(iterations[i]);
        }
        document.getElementById("tableCard").classList.remove("hidden");
        allStepsBtn.classList.add("hidden");
      });
    }
  }

  document.querySelectorAll(".tab-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.querySelectorAll(".tab-btn").forEach(function (b) { b.classList.remove("active"); });
      document.querySelectorAll(".tab-content").forEach(function (c) { c.classList.remove("active"); });
      this.classList.add("active");
      document.getElementById(this.dataset.tab).classList.add("active");
    });
  });
}
// Section switching
const sectionButtons = document.querySelectorAll(".section-btn");
const sections = document.querySelectorAll(".section");

sectionButtons.forEach(button => {
  button.addEventListener("click", () => {

    const targetSection = button.dataset.section;

    // hide all sections
    sections.forEach(sec => sec.classList.add("hidden"));

    // show selected section
    document.getElementById(targetSection).classList.remove("hidden");

    // reset polynomial method selection
    const methodSelect = document.getElementById("methodSelect");
    const inputSection = document.getElementById("inputSection");
    const methodBadge = document.getElementById("methodBadge");

    if (methodSelect) methodSelect.value = "";
    if (inputSection) inputSection.classList.add("hidden");
    if (methodBadge) methodBadge.classList.add("hidden");

    // reset linear method selection
    const linearMethodSelect = document.getElementById("linearMethodSelect");
    const linearInputSection = document.getElementById("linearInputSection");
    const linearMethodBadge = document.getElementById("linearMethodBadge");
    const gaussOutputCard = document.getElementById("gaussOutputCard");
    const linearMethodError = document.getElementById("linearMethodError");

    if (linearMethodSelect) linearMethodSelect.value = "";
    if (linearInputSection) linearInputSection.classList.add("hidden");
    if (linearMethodBadge) linearMethodBadge.classList.add("hidden");
    if (gaussOutputCard) gaussOutputCard.classList.add("hidden");
    if (linearMethodError) linearMethodError.classList.add("hidden");

    // reset unconstrained method selection
    const unconMethodSelect = document.getElementById("unconMethodSelect");
    const unconInputSection = document.getElementById("unconInputSection");
    const unconMethodBadge = document.getElementById("unconMethodBadge");
    if (unconMethodSelect) unconMethodSelect.value = "";
    if (unconInputSection) unconInputSection.classList.add("hidden");
    if (unconMethodBadge) unconMethodBadge.classList.add("hidden");

  });
});

// Unconstrained Method Selection
const unconMethodSelect = document.getElementById("unconMethodSelect");
if (unconMethodSelect) {
  unconMethodSelect.addEventListener("change", function () {
    const m = this.value;
    const unconInputSection = document.getElementById("unconInputSection");
    const unconMethodBadge = document.getElementById("unconMethodBadge");
    const errorBox = document.getElementById("errorBox");
    errorBox.classList.add("hidden");
    if (!m) {
      unconInputSection.classList.add("hidden");
      unconMethodBadge.classList.add("hidden");
      return;
    }
    unconInputSection.classList.remove("hidden");
    unconMethodBadge.textContent = "Golden Section Method";
    unconMethodBadge.classList.remove("hidden");
  });

  document.getElementById("unconLoadExampleBtn").addEventListener("click", function () {
    document.getElementById("unconOptType").value = "max";
    document.getElementById("unconFuncExpr").value = "2 * sin(x) - (x^2 / 10)";
    document.getElementById("unconXlInput").value = "0";
    document.getElementById("unconXuInput").value = "4";
    document.getElementById("unconMaxIterInput").value = "8";
    document.getElementById("unconDigitsInput").value = "4";
    document.getElementById("errorBox").classList.add("hidden");
  });

  document.getElementById("unconSolveBtn").addEventListener("click", function () {
    const m = unconMethodSelect.value;
    if (!m) return;
    const optType = document.getElementById("unconOptType").value;
    const funcExpr = document.getElementById("unconFuncExpr").value.trim();
    const xl = parseFloat(document.getElementById("unconXlInput").value);
    const xu = parseFloat(document.getElementById("unconXuInput").value);
    const maxIter = parseInt(document.getElementById("unconMaxIterInput").value) || 8;
    const digits = parseInt(document.getElementById("unconDigitsInput").value) || 4;
    const errorBox = document.getElementById("errorBox");

    if (!funcExpr || isNaN(xl) || isNaN(xu)) {
      errorBox.textContent = "Please fill all required fields correctly.";
      errorBox.classList.remove("hidden");
      return;
    }

    try {
      fEval(funcExpr, 1);
      const params = { section: "unconstrained", method: m, optType, funcExpr, xl, xu, maxIter, digits };
      sessionStorage.setItem("nmvParams", JSON.stringify(params));
      window.location.href = "output.html";
    } catch (e) {
      errorBox.textContent = "Invalid expression. Use math.js syntax.";
      errorBox.classList.remove("hidden");
    }
  });
}

// Linear Method Selection
const linearMethodSelect = document.getElementById("linearMethodSelect");
if (linearMethodSelect) {
  linearMethodSelect.addEventListener("change", function () {
    const m = this.value;
    const linearInputSection = document.getElementById("linearInputSection");
    const linearMethodBadge = document.getElementById("linearMethodBadge");
    const linearActiveMethodBadge = document.getElementById("linearActiveMethodBadge");
    const gaussOutputCard = document.getElementById("gaussOutputCard");
    const gaussErrorEl = document.getElementById('gaussError');
    const linearMethodError = document.getElementById('linearMethodError');

    if (gaussOutputCard) gaussOutputCard.classList.add("hidden");
    if (gaussErrorEl) gaussErrorEl.classList.add("hidden");
    if (linearMethodError) linearMethodError.classList.add("hidden");

    if (!m) {
      linearInputSection.classList.add("hidden");
      linearMethodBadge.classList.add("hidden");
      return;
    }

    const linearMethodNames = {
      gauss: "Gaussian Elimination",
      lu: "The LU Factorization",
      gaussjordan: "Gauss - Jordan",
      cramer: "Cramer's Rule"
    };

    if (m !== "gauss" && m !== "lu" && m !== "gaussjordan" && m !== "cramer") {
      linearInputSection.classList.add("hidden");
      linearMethodBadge.textContent = linearMethodNames[m] || "";
      linearMethodBadge.classList.remove("hidden");
      if (linearMethodError) {
        linearMethodError.textContent = "This method is currently under development!";
        linearMethodError.classList.remove("hidden");
      }
      return;
    }

    if (m === "gaussjordan") {
      document.getElementById("pivotingGroup").classList.remove("hidden");
    } else {
      document.getElementById("pivotingGroup").classList.add("hidden");
    }

    linearInputSection.classList.remove("hidden");
    linearMethodBadge.textContent = linearMethodNames[m] || "";
    linearMethodBadge.classList.remove("hidden");
    if (linearActiveMethodBadge) {
      linearActiveMethodBadge.textContent = linearMethodNames[m] || "";
    }
  });
}

// ═══════════════════════════════════════════
// GAUSSIAN ELIMINATION — LINEAR SECTION
// ═══════════════════════════════════════════
(function () {
  const gaussSizeEl = document.getElementById('gaussSize');
  const gaussDigitsEl = document.getElementById('gaussDigits');
  const gaussGridEl = document.getElementById('gaussEquationsList');
  const gaussSolveBtn = document.getElementById('gaussSolveBtn');
  const gaussExBtn = document.getElementById('gaussLoadExampleBtn');
  const gaussErrorEl = document.getElementById('gaussError');
  const gaussOutputCard = document.getElementById('gaussOutputCard');
  const gaussOutputEl = document.getElementById('gaussOutput');

  // ── subscript helpers ──────────────────────────────────────────
  const SUB = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'];
  function sub(n) { return String(n).split('').map(c => SUB[+c] ?? c).join(''); }

  // ── Build n text inputs for equations ──────────────────────────────────
  function buildGrid(n) {
    gaussGridEl.innerHTML = '';
    for (let i = 0; i < n; i++) {
      var inp = document.createElement('input');
      inp.type = 'text';
      inp.id = 'eq_' + i;
      inp.placeholder = 'Equation ' + (i + 1) + ' (e.g. x + y = 5)';
      inp.className = 'gauss-equation-input';
      gaussGridEl.appendChild(inp);
    }
  }

  if (gaussSizeEl) {
    gaussSizeEl.addEventListener('change', function () { buildGrid(+gaussSizeEl.value); });
    buildGrid(+gaussSizeEl.value);

    // ── Load textbook example (3×3) ───────────────────────────────
    gaussExBtn.addEventListener('click', function () {
      gaussSizeEl.value = '3';
      buildGrid(3);
      var eqs = [
        '2x + 1y + 1z = 8',
        '4x + 1y + 0z = 11',
        '-2x + 2y + 1z = 3'
      ];
      for (var i = 0; i < 3; i++) {
        document.getElementById('eq_' + i).value = eqs[i];
      }
      if (gaussOutputCard) gaussOutputCard.classList.add('hidden');
      if (gaussErrorEl) gaussErrorEl.classList.add('hidden');
    });
  }

  // ── Read matrix from equation inputs ───────────────────────────────────
  function readMatrix(n) {
    try {
      var equations = [];
      for (var i = 0; i < n; i++) {
        var eqText = document.getElementById('eq_' + i).value.trim();
        if (!eqText) {
          gaussErrorEl.textContent = 'Please fill in all equations.';
          return null;
        }
        equations.push(eqText);
      }

      var allVars = new Set();
      var parsedExprs = [];

      for (var i = 0; i < n; i++) {
        var parts = equations[i].split('=');
        var left = parts[0] || '0';
        var right = parts[1] || '0';
        var exprStr = '(' + left + ') - (' + right + ')';
        var node = math.parse(exprStr);
        var varsInNode = node.filter(function (n) { return n.isSymbolNode; });
        varsInNode.forEach(function (v) { allVars.add(v.name); });
        parsedExprs.push(node);
      }

      var varArray = Array.from(allVars).sort();

      if (varArray.length > n) {
        gaussErrorEl.textContent = 'Found ' + varArray.length + ' variables (' + varArray.join(', ') + '), but system size is ' + n + '.';
        return null;
      }

      var A = [];
      for (var i = 0; i < n; i++) {
        var row = [];
        var compiled = parsedExprs[i].compile();

        var zeroScope = {};
        varArray.forEach(function (v) { zeroScope[v] = 0; });
        var C = compiled.evaluate(zeroScope);
        var bVal = -C;

        for (var j = 0; j < n; j++) {
          if (j < varArray.length) {
            var scope = {};
            varArray.forEach(function (v) { scope[v] = 0; });
            scope[varArray[j]] = 1;
            var coef = compiled.evaluate(scope) - C;
            row.push(coef);
          } else {
            row.push(0);
          }
        }
        row.push(bVal);
        A.push(row);
      }

      // Update SUB globals for variables display? The script hardcodes x1, x2, x3.
      // We will store varArray to gaussState so we can show x, y, z instead of x1, x2, x3!
      gaussState.varArray = varArray.length > 0 ? varArray : null;

      return A;
    } catch (e) {
      gaussErrorEl.textContent = 'Error parsing equations. Use proper math syntax (e.g. 2x + 3y = 5).';
      return null;
    }
  }

  // ── Pretty-print number ───────────────────────────────────────
  function pn(v, d) {
    var r = parseFloat(v.toFixed(d));
    return Object.is(r, -0) ? '0' : String(r);
  }

  // ── Build augmented-matrix HTML table ─────────────────────────
  function matrixHTML(M, n, d) {
    var html = '<div class="gauss-mat-wrap"><table class="gauss-mat">';
    for (var i = 0; i < n; i++) {
      html += '<tr>';
      html += '<td class="mat-brk-l">[</td>';
      for (var j = 0; j < n; j++) {
        html += '<td class="mat-cell">' + pn(M[i][j], d) + '</td>';
      }
      html += '<td class="mat-pipe"> | </td>';
      html += '<td class="mat-cell mat-b">' + pn(M[i][n], d) + '</td>';
      html += '<td class="mat-brk-r">]</td>';
      html += '</tr>';
    }
    html += '</table></div>';
    return html;
  }

  function squareMatrixHTML(M, n, d) {
    var html = '<div class="gauss-mat-wrap"><table class="gauss-mat">';
    for (var i = 0; i < n; i++) {
      html += '<tr>';
      html += '<td class="mat-brk-l">[</td>';
      for (var j = 0; j < n; j++) {
        html += '<td class="mat-cell">' + pn(M[i][j], d) + '</td>';
      }
      html += '<td class="mat-brk-r">]</td>';
      html += '</tr>';
    }
    html += '</table></div>';
    return html;
  }

  // ── Gaussian Elimination with step recording ───────────────────
  function gaussEliminate(M0, n, d) {
    var M = M0.map(function (r) { return r.slice(); });
    var steps = [];

    var L = [];
    for (var i = 0; i < n; i++) {
      var row = new Array(n).fill(0);
      row[i] = 1;
      L.push(row);
    }

    function push(type, payload) { steps.push({ type: type, payload: payload }); }

    push('header', 'Initial Augmented Matrix');
    push('matrix', M.map(function (r) { return r.slice(); }));
    push('header', 'Forward Elimination');

    for (var j = 0; j < n - 1; j++) {
      push('pivot-col', j);
      for (var i = j + 1; i < n; i++) {
        if (Math.abs(M[i][j]) < 1e-14) {
          L[i][j] = 0;
          continue;
        }

        var pivot = M[j][j];
        var entry = M[i][j];
        var mij = entry / pivot;

        L[i][j] = mij;

        push('multiplier', {
          label: 'm' + sub(i + 1) + sub(j + 1),
          top: 'a' + sub(i + 1) + sub(j + 1),
          bot: 'a' + sub(j + 1) + sub(j + 1),
          topVal: pn(entry, d),
          botVal: pn(pivot, d),
          mVal: pn(mij, d)
        });

        push('row-op', { i: i + 1, j: j + 1, m: pn(mij, d) });

        for (var k = j; k <= n; k++) {
          M[i][k] = M[i][k] - mij * M[j][k];
          if (Math.abs(M[i][k]) < 1e-10) M[i][k] = 0;
        }

        push('matrix', M.map(function (r) { return r.slice(); }));
      }
    }

    push('header', 'Upper Triangular Matrix');
    push('matrix', M.map(function (r) { return r.slice(); }));
    push('header', 'Back Substitution');

    var x = new Array(n).fill(0);
    for (var ii = n - 1; ii >= 0; ii--) {
      var sum = M[ii][n];
      var terms = [];
      for (var kk = ii + 1; kk < n; kk++) {
        sum -= M[ii][kk] * x[kk];
        terms.push({ coef: pn(M[ii][kk], d), xk: kk + 1, val: pn(x[kk], d) });
      }
      x[ii] = sum / M[ii][ii];
      push('back-sub', {
        xi: ii + 1,
        bVal: pn(M[ii][n], d),
        a_ii: pn(M[ii][ii], d),
        terms: terms,
        result: pn(x[ii], d)
      });
    }

    var U = M.map(function (r) { return r.slice(0, n); });
    var origB = M0.map(function (r) { return r[n]; });

    push('solution', x.map(function (v, idx) { return { xi: idx + 1, val: pn(v, d) }; }));
    return { steps: steps, solution: x, L: L, U: U, origB: origB };
  }

  // ── Gauss-Jordan Elimination with step recording ───────────────────
  function gaussJordanEliminate(M0, n, d, usePivoting) {
    var M = M0.map(function (r) { return r.slice(); });
    var steps = [];

    function push(type, payload) { steps.push({ type: type, payload: payload }); }

    push('header', 'Initial Augmented Matrix');
    push('matrix', M.map(function (r) { return r.slice(); }));

    for (var j = 0; j < n; j++) {
      push('header', 'Column ' + (j + 1) + ' Elimination');
      push('pivot-col', j);

      if (usePivoting) {
        var maxRow = j;
        var maxVal = Math.abs(M[j][j]);
        for (var i = j + 1; i < n; i++) {
          if (Math.abs(M[i][j]) > maxVal) {
            maxVal = Math.abs(M[i][j]);
            maxRow = i;
          }
        }
        if (maxRow !== j) {
          push('header', 'Partial Pivoting: Swapped Row ' + (j + 1) + ' and Row ' + (maxRow + 1));
          var temp = M[j];
          M[j] = M[maxRow];
          M[maxRow] = temp;
          push('matrix', M.map(function (r) { return r.slice(); }));
        }
      }

      var pivot = M[j][j];
      if (Math.abs(pivot) < 1e-14) {
        push('header', 'Error: Pivot is 0. Cannot proceed.');
        break;
      }

      // Make pivot 1
      if (Math.abs(pivot - 1.0) > 1e-14) {
        var multiplier = 1.0 / pivot;
        for (var k = j; k <= n; k++) {
          M[j][k] = M[j][k] * multiplier;
          if (Math.abs(M[j][k]) < 1e-10) M[j][k] = 0;
        }
        push('row-op', { i: j + 1, j: j + 1, m: '(' + pn(pivot, d) + ')', isDiv: true });
        push('matrix', M.map(function (r) { return r.slice(); }));
      }

      // Eliminate all other entries in column j
      var eliminatedAny = false;
      for (var i = 0; i < n; i++) {
        if (i !== j) {
          var factor = M[i][j];
          if (Math.abs(factor) > 1e-14) {
            eliminatedAny = true;
            for (var k = j; k <= n; k++) {
              M[i][k] = M[i][k] - factor * M[j][k];
              if (Math.abs(M[i][k]) < 1e-10) M[i][k] = 0;
            }
            push('row-op', { i: i + 1, j: j + 1, m: pn(factor, d) });
          }
        }
      }
      if (eliminatedAny) {
        push('matrix', M.map(function (r) { return r.slice(); }));
      }
    }

    push('header', 'Final Reduced Row Echelon Form (Identity Matrix)');
    var x = new Array(n).fill(0);
    for (var i = 0; i < n; i++) {
      x[i] = M[i][n];
    }

    push('solution', x.map(function (v, idx) { return { xi: idx + 1, val: pn(v, d) }; }));
    return { steps: steps, solution: x };
  }

  // ── Cramer's Rule with step recording ─────────────────────────────
  function cramerSolve(M0, n, d) {
    var M = M0.map(function (r) { return r.slice(); });
    var steps = [];
    var x = new Array(n).fill(0);

    function push(type, payload) { steps.push({ type: type, payload: payload }); }

    push('header', 'Initial Augmented Matrix');
    push('matrix', M.map(function (r) { return r.slice(); }));

    // Extract A and b
    var A = M.map(function (r) { return r.slice(0, n); });
    var b = M.map(function (r) { return r[n]; });

    var D = math.det(A);
    push('cramer-det', { label: 'D (Main Determinant)', mat: A.map(function (r) { return r.slice(); }), det: pn(D, d) });

    if (Math.abs(D) < 1e-14) {
      push('header', '<span style="color:red">Error: Main Determinant D is 0. The system has no unique solution.</span>');
      return { steps: steps, solution: null, error: true };
    }

    push('header', 'Calculating Variable Determinants');

    for (var i = 0; i < n; i++) {
      var Ai = A.map(function (r) { return r.slice(); });
      for (var r = 0; r < n; r++) {
        Ai[r][i] = b[r];
      }
      var Di = math.det(Ai);
      x[i] = Di / D;

      push('cramer-sub', {
        label: 'D' + (i + 1),
        varName: getVarName(i + 1),
        mat: Ai.map(function (r) { return r.slice(); }),
        det: pn(Di, d),
        xi: pn(x[i], d),
        D: pn(D, d)
      });
    }

    push('solution', x.map(function (v, idx) { return { xi: idx + 1, val: pn(v, d) }; }));
    return { steps: steps, solution: x, error: false };
  }

  // ── Render steps to HTML ──────────────────────────────────────
  function renderSteps(steps, n, d) {
    var html = '';
    for (var s = 0; s < steps.length; s++) {
      var st = steps[s];
      switch (st.type) {
        case 'header':
          html += '<div class="gs-header">' + st.payload + '</div>';
          break;

        case 'pivot-col':
          var jj = st.payload;
          html += '<div class="gs-pivot">Pivot column: <strong>j = ' + (jj + 1) + '</strong>' +
            '&nbsp;&nbsp;(pivot element = a' + sub(jj + 1) + sub(jj + 1) + ')</div>';
          break;

        case 'multiplier':
          var p = st.payload;
          html += '<div class="gs-line gs-multiplier">' +
            '<span class="gs-lbl">' + p.label + '</span>' +
            '<span class="gs-eq">= ' + p.top + ' / ' + p.bot +
            ' = ' + p.topVal + ' / ' + p.botVal +
            ' = <strong>' + p.mVal + '</strong></span>' +
            '</div>';
          break;

        case 'row-op':
          var ro = st.payload;
          html += '<div class="gs-line gs-rowop">' +
            'E' + sub(ro.i) + ' &minus; (<strong>' + ro.m + '</strong>) &middot; E' + sub(ro.j) +
            ' &rarr; E' + sub(ro.i) +
            '</div>';
          break;

        case 'matrix':
          html += matrixHTML(st.payload, n, d);
          break;

        case 'back-sub':
          var bs = st.payload;
          // Formula line
          var formula = 'x' + sub(bs.xi) + ' = (' + bs.bVal;
          for (var t = 0; t < bs.terms.length; t++) {
            formula += ' &minus; (' + bs.terms[t].coef + ')&middot;x' + sub(bs.terms[t].xk);
          }
          formula += ') / ' + bs.a_ii + ' = <strong>' + bs.result + '</strong>';
          // Substituted values line
          var subst = 'x' + sub(bs.xi) + ' = (' + bs.bVal;
          for (var t2 = 0; t2 < bs.terms.length; t2++) {
            subst += ' &minus; (' + bs.terms[t2].coef + ')&middot;(' + bs.terms[t2].val + ')';
          }
          subst += ') / ' + bs.a_ii + ' = <strong>' + bs.result + '</strong>';

          html += '<div class="gs-line gs-backsub">' +
            '<div>' + formula + '</div>' +
            (bs.terms.length > 0 ? '<div class="gs-sub-detail">' + subst + '</div>' : '') +
            '</div>';
          break;

        case 'solution':
          html += '<div class="gs-header">Final Solution</div>';
          html += '<div class="gs-solution">';
          for (var sv = 0; sv < st.payload.length; sv++) {
            html += '<div class="gs-sol-row">x' + sub(st.payload[sv].xi) +
              ' = <span>' + st.payload[sv].val ... (15 KB left)
