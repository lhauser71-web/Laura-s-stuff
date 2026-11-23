export const EXAMPLES = {
  aus: {
    name: "The Mercer · 312-unit garden multifamily", asset: "Multifamily", market: "Austin, TX (Round Rock)", ccy: "USD",
    size: 312, unit: "units", price: 78000000, noi: 3980000, occ: 91, opex: 42, capex: 4700000, ltv: 60, rate: 6.35, amort: 30, hold: 5, growth: 6.5, exitcap: 5.5,
    plan: "2008 vintage. Value-add: interior renovations on 70% of units (~$15k/unit), $185 average rent premium on renovated units, bring occupancy back to 95%. The 6.5% NOI growth assumes the renovation premium lands on schedule.",
    om: "Broker notes 2,900 units delivering within 3 miles over the next 18 months. Concessions currently 4 weeks free on 1-beds. Property tax reassessment risk on sale.",
  },
  sgp: {
    name: "Tuas logistics · single-tenant warehouse", asset: "Industrial / logistics", market: "Singapore (Tuas)", ccy: "SGD",
    size: 410000, unit: "sq ft", price: 118000000, noi: 7550000, occ: 100, opex: 12, capex: 2000000, ltv: 40, rate: 3.6, amort: 0, hold: 5, growth: 1.5, exitcap: 7.0,
    plan: "Core-plus. Single 3PL tenant, WALE 4.2 years. JTC leasehold with 21 years remaining. Upgrade solar and loading bays to support renewal.",
    om: "Tenant has a break option in year 3. Land premium payable on any plot ratio increase. Comparable Tuas sales traded at 6.6–7.2% over the past year.",
  },
  nyc: {
    name: "26-storey Class B office · recapitalisation", asset: "Office", market: "Midtown Manhattan, NY", ccy: "USD",
    size: 540000, unit: "sq ft", price: 210000000, noi: 11300000, occ: 78, opex: 48, capex: 18000000, ltv: 55, rate: 7.1, amort: 0, hold: 5, growth: 1.0, exitcap: 7.25,
    plan: "Recap the existing sponsor's position, fund a lobby and amenity floor refresh, lease up to 88% with TI/LC funded from the capex budget.",
    om: "Two tenants totalling 22% of NRA expire within 24 months. Existing loan matures in 9 months. Sponsor is seeking preferred equity alongside a new senior loan.",
  },
  ldn: {
    name: "City of London office · multi-let", asset: "Office", market: "London (City)", ccy: "GBP",
    size: 120000, unit: "sq ft", price: 95000000, noi: 5900000, occ: 89, opex: 22, capex: 6000000, ltv: 50, rate: 5.6, amort: 0, hold: 5, growth: 3.0, exitcap: 6.25,
    plan: "Core-plus. Refurbish two vacant floors to Grade A and re-let, extend the two largest tenants ahead of their breaks.",
    om: "Largest tenant (18% of income) has a break clause in 2028. Rent reviews on three leases in 2027. EPC B needed by 2030 under MEES; current rating C.",
  },
  blank: {
    name: "", asset: "Multifamily", market: "", ccy: "USD", size: "", unit: "units", price: "", noi: "", occ: "", opex: 40, capex: 0,
    ltv: 60, rate: 6.5, amort: 30, hold: 5, growth: 2.5, exitcap: "", plan: "", om: "",
  },
};

export const EXAMPLE_OPTIONS = [
  ["aus", "Austin multifamily · value-add · $78M"],
  ["sgp", "Singapore Tuas logistics · leasehold · S$118M"],
  ["nyc", "Midtown office · recap · $210M"],
  ["ldn", "City of London office · multi-let · £95M"],
  ["blank", "Blank"],
];

export const FIELDS = ["name", "asset", "market", "ccy", "size", "unit", "price", "noi", "occ", "opex", "capex", "ltv", "rate", "amort", "hold", "growth", "exitcap", "plan", "om"];
export const NUMERIC = new Set(["size", "price", "noi", "occ", "opex", "capex", "ltv", "rate", "amort", "hold", "growth", "exitcap"]);
export const ASSETS = ["Multifamily", "Industrial / logistics", "Office", "Retail", "Hotel", "Self storage", "Data centre", "Student housing", "Mixed use"];
export const CCYS = ["USD", "GBP", "SGD"];
export const UNITS = ["units", "sq ft", "keys", "MW"];

export const SAMPLE_TZ = `FOR SALE | THE MERCER
312-unit garden-style multifamily community | Round Rock, Austin MSA, Texas
Built 2008 · 91% occupied
Offering price: $78,000,000 ($250,000 per unit)
In-place NOI (T-12): $3,980,000
Value-add opportunity: roughly 70% of units remain in original condition. Renovate interiors (~$15k per unit) and capture premiums of up to $185 per month already achieved on renovated units.
Submarket: 2,900 units under construction within 3 miles, delivering over the next 18 months. Current concessions: 4 weeks free on one-bedroom units.
Offered free and clear of existing debt. Do not contact on-site management.`;

export const SOLO_URL = "https://access.5dai.io/ui/sign-in?redirect=%2Fui";
