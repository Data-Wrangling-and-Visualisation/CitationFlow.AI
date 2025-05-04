export const BASE_URL = "http://localhost";
export const COLOR_SCHEMES = {
    pastel: ["#BFB2F3", "#96CAF7", "#9CDCAA", "#E5E1AB", "#F3C6A5", "#F8A3A8"],
    blues: d3.schemeBlues[5],
    plasma: d3.quantize(d3.interpolatePlasma, 5),
    greens: ["#EDF1D6", "#9DC08B", "#609966", "#40513B"]
};
export let colorScheme = 'pastel';
