// Get the display element
const display = document.getElementById("display");


// Add value to display
function appendValue(value) {
    display.value += value;
}


// Clear the display
function clearDisplay() {
    display.value = "";
}


// Delete the last character
function deleteLast() {
    display.value = display.value.slice(0, -1);
}


// Calculate the result
function calculate() {

    try {

        // Get the expression
        let expression = display.value;

        // Calculate the expression
        let result = eval(expression);

        // Display the result
        display.value = result;

    } catch (error) {

        // Show error if calculation is invalid
        display.value = "Error";

    }
}