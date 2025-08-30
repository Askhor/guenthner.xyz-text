const mathematical_fields = [
    ["algebra", false],
    ["analysis", false],
    ["number theory", false],
    ["analytic number theory", false],
    ["graph theory", false],
    ["logic", false],
    ["topology", false],
    ["combinatorics", false],
    ["geometry", false],
    ["collatz conjecture", false],
    ["category theory", false],
    ["lettuce", false],
    ["p-adic numbers", true],
    ["perfect numbers", true],
    ["prime numbers", true],
    ["twin primes", true],
    ["sphere packings", true],
    ["lattices", true],
    ["∞-categories", true],
    ["contact topology", false],
    ["Goldbach conjecture", false],
    ["LBA problem",false],
    ["P vs NP problem", false]]

function get_random_math_field(singular, plural) {
    const [random_math_field, is_random_math_field_plural] = mathematical_fields[Math.floor(Math.random() * mathematical_fields.length)]
    const template = is_random_math_field_plural ? plural : singular;

    const funny_text = template.replace("<FIELD>", random_math_field);
    console.log(`The funny text this time will be: ${funny_text}`);
    return funny_text;
}

document.querySelectorAll(".random-math-field").forEach(element => {
    const data = element.dataset;
    const singular = data["singular"];
    const plural = data["plural"];

    element.addEventListener("pointerdown", event => {
        event.preventDefault();
        element.textContent = get_random_math_field(singular, plural);
    });

    element.textContent = get_random_math_field(singular, plural);
})