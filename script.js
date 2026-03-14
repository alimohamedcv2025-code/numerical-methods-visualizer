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
        try { curve.push({ x: +x.toFixed(6), y: +fEval(params.funcExpr, x).toFixed(6) }); } catch (e) { }
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

  });
});

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
      palu: "The PA = LU Factorization",
      gaussjordan: "Gauss - Jordan",
      cramer: "Cramer's Rule"
    };

    if (m !== "gauss") {
      linearInputSection.classList.add("hidden");
      linearMethodBadge.textContent = linearMethodNames[m] || "";
      linearMethodBadge.classList.remove("hidden");
      if (linearMethodError) {
        linearMethodError.textContent = "هذه الطريقة تحت التطوير حالياً! يرجى اختيار Gaussian Elimination.";
        linearMethodError.classList.remove("hidden");
      }
      return;
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
  const gaussGridEl = document.getElementById('gaussMatrixGrid');
  const gaussSolveBtn = document.getElementById('gaussSolveBtn');
  const gaussExBtn = document.getElementById('gaussLoadExampleBtn');
  const gaussErrorEl = document.getElementById('gaussError');
  const gaussOutputCard = document.getElementById('gaussOutputCard');
  const gaussOutputEl = document.getElementById('gaussOutput');

  if (!gaussSizeEl) return; // only runs when the element exists

  // ── subscript helpers ──────────────────────────────────────────
  const SUB = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'];
  function sub(n) { return String(n).split('').map(c => SUB[+c] ?? c).join(''); }

  // ── Build n×n augmented-matrix input grid ──────────────────────
  function buildGrid(n) {
    gaussGridEl.innerHTML = '';
    // n columns for A, 1 thin separator, 1 column for b
    gaussGridEl.style.gridTemplateColumns =
      'repeat(' + n + ', 1fr) 4px 1fr';

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        var inp = document.createElement('input');
        inp.type = 'number';
        inp.step = 'any';
        inp.id = 'g_' + i + '_' + j;
        inp.placeholder = 'a' + (i + 1) + (j + 1);
        inp.className = 'gauss-cell';
        gaussGridEl.appendChild(inp);
      }
      var sep = document.createElement('div');
      sep.className = 'gauss-sep';
      gaussGridEl.appendChild(sep);

      var bInp = document.createElement('input');
      bInp.type = 'number';
      bInp.step = 'any';
      bInp.id = 'g_' + i + '_b';
      bInp.placeholder = 'b' + (i + 1);
      bInp.className = 'gauss-cell gauss-b';
      gaussGridEl.appendChild(bInp);
    }
  }

  gaussSizeEl.addEventListener('change', function () { buildGrid(+gaussSizeEl.value); });
  buildGrid(+gaussSizeEl.value);

  // ── Load textbook example (3×3) ───────────────────────────────
  gaussExBtn.addEventListener('click', function () {
    gaussSizeEl.value = '3';
    buildGrid(3);
    var vals = [
      [2, 1, 1, 8],
      [4, 1, 0, 11],
      [-2, 2, 1, 3]
    ];
    for (var i = 0; i < 3; i++) {
      for (var j = 0; j < 3; j++) {
        document.getElementById('g_' + i + '_' + j).value = vals[i][j];
      }
      document.getElementById('g_' + i + '_b').value = vals[i][3];
    }
    gaussOutputCard.classList.add('hidden');
    gaussErrorEl.classList.add('hidden');
  });

  // ── Read matrix from inputs ───────────────────────────────────
  function readMatrix(n) {
    var A = [];
    for (var i = 0; i < n; i++) {
      var row = [];
      for (var j = 0; j < n; j++) {
        var v = parseFloat(document.getElementById('g_' + i + '_' + j).value);
        if (isNaN(v)) return null;
        row.push(v);
      }
      var b = parseFloat(document.getElementById('g_' + i + '_b').value);
      if (isNaN(b)) return null;
      row.push(b);
      A.push(row);
    }
    return A;
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

  // ── Gaussian Elimination with step recording ───────────────────
  function gaussEliminate(M0, n, d) {
    var M = M0.map(function (r) { return r.slice(); });
    var steps = [];

    function push(type, payload) { steps.push({ type: type, payload: payload }); }

    push('header', 'Initial Augmented Matrix');
    push('matrix', M.map(function (r) { return r.slice(); }));
    push('header', 'Forward Elimination');

    for (var j = 0; j < n - 1; j++) {
      push('pivot-col', j);
      for (var i = j + 1; i < n; i++) {
        if (Math.abs(M[i][j]) < 1e-14) continue;

        var pivot = M[j][j];
        var entry = M[i][j];
        var mij = entry / pivot;

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

    push('solution', x.map(function (v, idx) { return { xi: idx + 1, val: pn(v, d) }; }));
    return { steps: steps, solution: x };
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
              ' = <span>' + st.payload[sv].val + '</span></div>';
          }
          html += '</div>';
          break;
      }
    }
    return html;
  }

  // ── Step-by-step state ────────────────────────────────────────
  var gaussState = {
    steps: [],
    visible: 0,
    n: 3,
    d: 4,
    finished: false,
    active: false       // true when a Gauss solve is in progress
  };

  // Renders one step block and appends it to the output container
  function renderOneStep(st) {
    var n = gaussState.n, d = gaussState.d;
    var html = '';
    switch (st.type) {
      case 'header':
        html = '<div class="gs-header">' + st.payload + '</div>';
        break;
      case 'pivot-col':
        var jj = st.payload;
        html = '<div class="gs-pivot">Pivot column: <strong>j = ' + (jj + 1) + '</strong>' +
          '&nbsp;&nbsp;(pivot element = a' + sub(jj + 1) + sub(jj + 1) + ')</div>';
        break;
      case 'multiplier':
        var p = st.payload;
        html = '<div class="gs-line gs-multiplier">' +
          '<span class="gs-lbl">' + p.label + '</span>' +
          '<span class="gs-eq">= ' + p.top + ' / ' + p.bot +
          ' = ' + p.topVal + ' / ' + p.botVal +
          ' = <strong>' + p.mVal + '</strong></span>' +
          '</div>';
        break;
      case 'row-op':
        var ro = st.payload;
        html = '<div class="gs-line gs-rowop">' +
          'E' + sub(ro.i) + ' &minus; (<strong>' + ro.m + '</strong>) &middot; E' + sub(ro.j) +
          ' &rarr; E' + sub(ro.i) +
          '</div>';
        break;
      case 'matrix':
        html = matrixHTML(st.payload, n, d);
        break;
      case 'back-sub':
        var bs = st.payload;
        var formula = 'x' + sub(bs.xi) + ' = (' + bs.bVal;
        for (var t = 0; t < bs.terms.length; t++) {
          formula += ' &minus; (' + bs.terms[t].coef + ')&middot;x' + sub(bs.terms[t].xk);
        }
        formula += ') / ' + bs.a_ii + ' = <strong>' + bs.result + '</strong>';
        var subst = 'x' + sub(bs.xi) + ' = (' + bs.bVal;
        for (var t2 = 0; t2 < bs.terms.length; t2++) {
          subst += ' &minus; (' + bs.terms[t2].coef + ')&middot;(' + bs.terms[t2].val + ')';
        }
        subst += ') / ' + bs.a_ii + ' = <strong>' + bs.result + '</strong>';
        html = '<div class="gs-line gs-backsub">' +
          '<div>' + formula + '</div>' +
          (bs.terms.length > 0 ? '<div class="gs-sub-detail">' + subst + '</div>' : '') +
          '</div>';
        break;
      case 'solution':
        html = '<div><div class="gs-header">Final Solution</div>' +
          '<div class="gs-solution">';
        for (var sv = 0; sv < st.payload.length; sv++) {
          html += '<div class="gs-sol-row">x' + sub(st.payload[sv].xi) +
            ' = <span>' + st.payload[sv].val + '</span></div>';
        }
        html += '</div></div>';
        break;
    }
    var el = document.createElement('div');
    el.innerHTML = html;
    gaussOutputEl.appendChild(el.firstElementChild || el);
  }

  function gaussShowNext() {
    if (gaussState.finished || !gaussState.active) return;
    if (gaussState.visible < gaussState.steps.length) {
      renderOneStep(gaussState.steps[gaussState.visible]);
      gaussState.visible++;
      // Scroll the new step into view
      gaussOutputEl.lastElementChild &&
        gaussOutputEl.lastElementChild.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    if (gaussState.visible >= gaussState.steps.length) {
      gaussState.finished = true;
      document.getElementById('gaussEnterHint').classList.add('hidden');
    }
  }

  // ── Solve button click ────────────────────────────────────────
  gaussSolveBtn.addEventListener('click', function () {
    gaussErrorEl.classList.add('hidden');
    gaussOutputCard.classList.add('hidden');
    gaussOutputEl.innerHTML = '';

    var n = +gaussSizeEl.value;
    var d = parseInt(gaussDigitsEl.value);
    if (isNaN(d) || d < 0) d = 4;

    var M = readMatrix(n);
    if (!M) {
      gaussErrorEl.textContent = 'Please fill in all matrix entries with valid numbers.';
      gaussErrorEl.classList.remove('hidden');
      return;
    }

    // Check for zero pivot
    var tempM = M.map(function (r) { return r.slice(); });
    for (var j = 0; j < n; j++) {
      if (Math.abs(tempM[j][j]) < 1e-14) {
        gaussErrorEl.textContent =
          'Pivot a' + (j + 1) + (j + 1) + ' = 0. The matrix may be singular or requires partial pivoting.';
        gaussErrorEl.classList.remove('hidden');
        return;
      }
    }

    var result = gaussEliminate(M, n, d);
    gaussState.steps = result.steps;
    gaussState.visible = 0;
    gaussState.n = n;
    gaussState.d = d;
    gaussState.finished = false;
    gaussState.active = true;

    gaussOutputCard.classList.remove('hidden');
    document.getElementById('gaussEnterHint').classList.remove('hidden');
    gaussOutputCard.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Show the very first step automatically
    gaussShowNext();
  });

  // ── Enter key advances steps ──────────────────────────────────
  window.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && gaussState.active && !gaussState.finished) {
      e.preventDefault();
      gaussShowNext();
    }
  });
}());

