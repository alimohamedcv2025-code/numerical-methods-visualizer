# Numerical Methods Visualizer

An interactive web-based tool for solving and visualizing numerical root-finding methods and systems of linear algebraic equations.

## Features

### 1. Polynomial Functions (Root-Finding)
- Bisection Method
- False Position (Regula Falsi)
- Simple Fixed Point Iteration
- Newton-Raphson Method
- Secant Method

### 2. Linear Algebraic Equations
- **Gaussian Elimination**:
  - Interactive Step-by-step solver (Press <kbd>Enter</kbd> to reveal the next step).
  - Shows row operations with exact fractional multipliers.
  - Generates the Upper Triangular Matrix automatically.
  - Performs Back Substitution step-by-step to reach the final solution variables.
- *(Upcoming Methods)*:
  - LU Factorization
  - PA = LU Factorization
  - Gauss-Jordan
  - Cramer's Rule

## Visualization & UI
- **Dynamic Workspaces**: Seamless switching between Polynomial and Linear Equation sections.
- **Function graphs f(x)** (Polynomials).
- **Convergence & Error Charts** (Polynomials).
- **Matrix Grid Input**: Easy-to-use grid for writing the augmented matrix `[A | b]`.

## Stopping Criteria (Polynomials)
- Epsilon (tolerance %)
- Maximum iterations

## Other Features
- Modern Dark Mode aesthetic with glowing highlights.
- Clear Active Method Badges.
- Automatic conversion from f(x) to g(x) for Fixed Point iteration.
- Configurable decimal precision and Matrix dimensions up to 6x6.
- Responsive design.

## Project Structure

```
project
│
├── index.html        (Main UI with separate sections)
├── style.css         (Fully responsive dark theme)
├── script.js         (Core computation and DOM logic)
├── README.md
│
├── (Images from UI):
│   ├── input-page.png (Old Root-Finding)
│   ├── iterations.png
│   ├── graph.png
│   ├── convergence.png
│   ├── linear-methods-selection.png (New Section Selection UI)
│   ├── gaussian-elimination-matrix.png (New Augment Matrix Grid)
│   └── gaussian-elimination-steps.png (New Step-by-Step Visualization)
```

## Preview Images

*Place your screenshots in the same directory using the filenames below to preview them correctly.*

### Section Selection & Matrix Input (Gaussian Elimination)
![Select Section & Matrix Input](linear-methods-selection.png)

### Step-by-Step Elimination (Forward Elimination)
![Gaussian Elimination Steps](gaussian-elimination-steps.png)

### Back Substitution & Final Solution
![Final Solution Extraction](gaussian-elimination-matrix.png)

*(You can replace these image links with the actual names of the pictures you sent inside your project directory!)*

## Technologies Used

- HTML5
- CSS3 (Vanilla)
- JavaScript (Vanilla)
- `math.js` (For exact mathematical parsing and matrix operations)
- `Chart.js` (For root-finding graphs)

## How to Run

1. Clone or download the project.
2. Open `index.html` in your browser.
3. Select your desired problem domain (e.g., **Linear Algebraic Equation**).
4. Choose the specific algorithm (e.g., **Gaussian Elimination**).
5. Enter your function constraints or fill the Augmented Matrix `[A | b]`.
6. Click **Solve**!
7. **For Gaussian Elimination**: Press the `Enter` key on your keyboard to advance through the actual calculation steps (Forward Elimination $\rightarrow$ Back Substitution $\rightarrow$ Solution) smoothly.

## Example
### Root-Finding:
Using Bisection Method for `4*x^3 - 6*x^2 + 7*x - 2.3` between `xl = 0` and `xu = 1`.

### Linear Algebra:
Solving a $3 \times 3$ system of equations using Gaussian Elimination. Load the built-in example matrix to see how multipliers and row replacements operate until reaching the $x_1, x_2, x_3$ solution vector.
