# Numerical Methods Visualizer

An interactive web-based tool for solving and visualizing numerical root-finding methods.

## Features

- Bisection Method
- False Position (Regula Falsi)
- Simple Fixed Point Iteration
- Newton-Raphson Method
- Secant Method

### Visualization
- Function graph f(x)
- Convergence chart
- Error percentage chart

### Stopping Criteria
- Epsilon (tolerance %)
- Maximum iterations

### Other Features
- Step-by-step iteration reveal (Press Enter)
- Automatic conversion from f(x) to g(x) for Fixed Point
- Configurable decimal precision
- Responsive design

## Project Structure

```
project
│
├── index.html
├── output.html
├── style.css
├── script.js
├── README.md
│
├── input-page.png
├── iterations.png
├── graph.png
└── convergence.png
```
## Input Page
![Input Page](input-page.png)

## Iteration Results
![Iterations Table](iterations.png)

## Function Graph
![Function Graph](graph.png)

## Convergence Chart
![Convergence Chart](convergence.png)

## Technologies Used

- HTML
- CSS
- JavaScript
- math.js
- Chart.js

## How to Run

1. Download the project
2. Open `index.html` in your browser
3. Enter the function and parameters
4. Click **Solve**
5. View the iterations and graphs

## Example
Function:

```
4x^3 - 6x^2 + 7x - 2.3
```

Using Bisection Method:

```
xl = 0
xu = 1
epsilon = 0.7%
```
