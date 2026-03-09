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
    xiPrev = xi;
    xi = xiPlus1;
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
      errorBox.textContent = "أدخل دالة f(x) أولاً ثم اضغط تحويل.";
      errorBox.classList.remove("hidden");
      return;
    }
    const gExpr = convertFxToGx(fxStr);
    if (gExpr) {
      document.getElementById("gExpr").value = gExpr;
      errorBox.classList.add("hidden");
    } else {
      errorBox.textContent = "تعذر التحويل. تأكد أن f(x) كثيرة حدود بصيغة x (مثل: x^3 - 4*x - 9).";
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
        if (!gExpr || isNaN(x0)) { errorBox.textContent = "أدخل g(x) و x₀، أو أدخل f(x) واضغط «تحويل» ثم x₀."; errorBox.classList.remove("hidden"); return; }
        params.gExpr = gExpr;
        params.x0 = x0;
      } else if (m === "newton") {
        const funcExpr = document.getElementById("funcExpr").value.trim();
        const dfExpr = document.getElementById("dfExpr").value.trim();
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
}
// ═══════════════════════════════════════════
// OUTPUT PAGE LOGIC
// ═══════════════════════════════════════════
if (isOutputPage) {
  const params = JSON.parse(sessionStorage.getItem("nmvParams") || "null");
  if (!params) { window.location.href = "index.html"; }
  const { method, epsilon, digits, maxIter, stopMode } = params;
  const methodNames = { bisection: "Bisection", falseposition: "False Position", fixedpoint: "Simple Fixed Point", newton: "Newton-Raphson", secant: "Secant" };
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
  const tabFunc = document.getElementById("tabFunc");
  if (isFP) tabFunc.classList.add("hidden");
  const tableHead = document.getElementById("tableHead");
  if (isBracket) {
    tableHead.innerHTML = "<tr><th>Iter</th><th>xl</th><th>f(xl)</th><th>xu</th><th>f(xu)</th><th>xr</th><th>f(xr)</th><th>Error %</th></tr>";
  } else if (isFP) {
    tableHead.innerHTML = "<tr><th>Iter</th><th>xᵢ</th><th>g(xᵢ)</th><th>Error %</th></tr>";
  } else if (isN) {
    tableHead.innerHTML = "<tr><th>Iter</th><th>xᵢ</th><th>f(xᵢ)</th><th>f'(xᵢ)</th><th>xᵢ₊₁</th><th>Error %</th></tr>";
  } else if (isSec) {
    tableHead.innerHTML = "<tr><th>Iter</th><th>xᵢ₋₁</th><th>f(xᵢ₋₁)</th><th>xᵢ</th><th>f(xᵢ)</th><th>xᵢ₊₁</th><th>Error %</th></tr>";
  }
  if (isBracket) {
    iterations = solveBracket(method, params.funcExpr, params.xl, params.xu, epsilon, maxIter);
  } else if (isFP) {
    iterations = solveFixedPoint(params.gExpr, params.x0, epsilon, maxIter);
  } else if (isN) {
    iterations = solveNewton(params.funcExpr, params.dfExpr, params.x0, epsilon, maxIter);
  } else if (isSec) {
    iterations = solveSecant(params.funcExpr, params.x0, params.x1, epsilon, maxIter);
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
    }
    document.getElementById("tableBody").appendChild(tr);
  }
  renderRow(iterations[0]);
  visibleCount = 1;
  if (iterations.length === 1) { finished = true; showResult(); }
  function getXr(row) {
    if (isBracket) return row.xr;
    if (isFP) return row.gxi;
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
    const errData = visible.map(function (r) { return parseFloat(r.error.toFixed(digits)); });
    if (!isFP && params.funcExpr) {
      var allX;
      if (isBracket) {
        allX = visible.flatMap(function (r) { return [r.xl, r.xu, r.xr]; });
      } else if (isSec) {
        allX = visible.flatMap(function (r) { return [r.xi_1, r.xi, r.xiPlus1]; });
      } else {
        allX = visible.flatMap(function (r) { return [r.xi, r.xiPlus1]; });
      }
      const minX = Math.min.apply(null, allX), maxX = Math.max.apply(null, allX);
      const pad = (maxX - minX) * 0.3 || 1;
      const lo = minX - pad, hi = maxX + pad, step = (hi - lo) / 200;
      const curve = [];
      for (let x = lo; x <= hi; x += step) {
        try { curve.push({ x: +x.toFixed(6), y: +fEval(params.funcExpr, x).toFixed(6) }); } catch (e) {}
      }
      const roots = visible.map(function (r) {
        var yVal;
        if (isBracket) yVal = r.f_xr;
        else if (isSec) yVal = r.f_xi;
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
  updateCharts();
  function showResult() {
    document.getElementById("enterHint").classList.add("hidden");
    const root = getXr(iterations[iterations.length - 1]);
    var resultText = "Root ≈ " + fmt(root, digits);
    if (stopMode === "maxiter") {
      resultText += "  (stopped at " + maxIter + " iterations)";
    }
    document.getElementById("rootValue").textContent = resultText;
    document.getElementById("resultBox").classList.remove("hidden");
  }
  document.querySelectorAll(".tab-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.querySelectorAll(".tab-btn").forEach(function (b) { b.classList.remove("active"); });
      document.querySelectorAll(".tab-content").forEach(function (c) { c.classList.remove("active"); });
      this.classList.add("active");
      document.getElementById(this.dataset.tab).classList.add("active");
    });
  });
  window.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !finished) {
      e.preventDefault();
      if (visibleCount < iterations.length) {
        renderRow(iterations[visibleCount]);
        visibleCount++;
        updateCharts();
        if (visibleCount >= iterations.length) {
          finished = true;
          showResult();
        }
      }
    }
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

    // reset method selection
    const methodSelect = document.getElementById("methodSelect");
    const inputSection = document.getElementById("inputSection");
    const methodBadge = document.getElementById("methodBadge");

    if (methodSelect) methodSelect.value = "";
    if (inputSection) inputSection.classList.add("hidden");
    if (methodBadge) methodBadge.classList.add("hidden");

  });
});
