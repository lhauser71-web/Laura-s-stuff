// Prepared first passes for the built-in sample deals.
// Shown when a sample deal is run unedited, so the results page works without a live AI call.
// Every figure quoted here comes from the app's own calculation for that sample (see lib/finance.js).

export const SAMPLE_BRIEFS = {
  aus: `### VERDICT: Pass — At $78.0M the value-add only reaches a 9.7% levered IRR if 6.5% NOI growth lands on schedule, into a submarket with 2,900 new units arriving.

### The three numbers that matter
- **-236 bps leverage spread.** The 5.10% going-in cap sits well below the 7.47% loan constant, so every dollar of debt dilutes returns until the renovation premium is earned.
- **1.14x DSCR.** Thin cover from day one; with breakeven occupancy at 85% against 91% in place, a few points of slippage during renovations puts debt service at risk.
- **9.7% levered IRR on 6.5% NOI growth.** At 4.5% growth the IRR falls to 5.7%; the whole return depends on the plan landing.

### Red flags
- **New supply** — 2,900 units delivering within 3 miles in 18 months competes directly with renovated units at a $185 premium. Check: lease-up schedules and asking rents for each new scheme.
- **Concessions already at 4 weeks free** — effective rents are below headline before supply arrives. Check: rent roll net of concessions, by unit type.
- **Renovation premium not yet proven** — the business plan assumes $185 on ~218 units. Check: rents achieved on any units already renovated.
- **Tax reassessment on sale** — would cut NOI from year 1. Check: current assessed value against the $78.0M price.
- **Exit cap +40 bps** — reasonable, but leaves no room if the vintage trades wider at exit.

### Questions for the broker
1. How many units have already been renovated, and what premium have they achieved?
2. What concessions are on offer by unit type today, and for how long?
3. What is the seller's estimate of the post-sale tax bill?
4. Why is occupancy at 91%, and what is the trend over 12 months?
5. Is the seller open to pricing that reflects the incoming supply?

### Data room request
- 12-month rent roll with concessions and lease start dates
- T-12 and T-3 operating statements
- Renovation scope, unit-by-unit cost and premium tracker
- Property tax history and any appeal correspondence
- Capex history and a recent property condition report

### What would change my mind
Evidence that renovated units are already leasing at $185+ net of concessions, and a price that brings the going-in cap closer to the loan constant.`,

  sgp: `### VERDICT: Pursue with conditions — Debt cover is strong, but a 6.1% levered IRR on a single-tenant leasehold with a year-3 break needs the renewal secured before it is worth the time.

### The three numbers that matter
- **6.1% levered IRR, 1.29x multiple.** Modest for the risk of one tenant on a shortening lease; at -0.5% NOI growth it falls to 2.8%.
- **+280 bps leverage spread, 4.44x DSCR.** Debt is cheap and comfortably covered; the financing is not the risk here.
- **Exit cap 7.0% (+60 bps vs entry).** The leasehold will have 16 years left at exit, which may justify a wider cap than this.

### Red flags
- **Tenant break in year 3** — 100% of income sits with one 3PL. Check: break notice terms, penalties, and the tenant's renewal intentions.
- **Leasehold decay** — 21 years remaining today, 16 at exit. Check: how buyers price short JTC leaseholds and whether a renewal is feasible.
- **Land premium on any plot ratio increase** — limits upside from intensification. Check: the current plot ratio and the likely premium.
- **WALE of 4.2 years** — shorter than the 5-year hold. Check: lease expiry date against the hold period.

### Questions for the broker
1. Has the tenant indicated whether it will exercise the year-3 break?
2. What would it cost to waive or extend the break?
3. Has JTC indicated whether a lease extension is available?
4. What are the current plot ratio and the permitted maximum?
5. What drove the 6.6–7.2% range on the comparable Tuas sales?

### Data room request
- The full lease, including break and reinstatement clauses
- JTC head lease and any extension correspondence
- Tenant financials and credit information
- Solar and loading bay upgrade scope and costings
- Building condition report and capex history

### What would change my mind
A signed break waiver or lease extension past the hold period would make this a pursue; a confirmed break would make it a pass.`,

  nyc: `### VERDICT: Pass — The recap returns a -13.1% levered IRR and 0.53x equity multiple at $210.0M, with refinancing and lease-up risk arriving at the same time.

### The three numbers that matter
- **-13.1% levered IRR, 0.53x multiple.** Equity loses close to half its value at the base case; even at 3% NOI growth the IRR is -7.7%.
- **Exit cap 7.25% (+187 bps vs entry).** The 5.38% going-in cap prices in a recovery the exit assumption does not.
- **-172 bps leverage spread.** The 7.1% interest-only loan costs more than the asset yields, before $18.0M of capex.

### Red flags
- **Loan matures in 9 months** — the seller needs this deal. Check: maturity date, extension options and the lender's position.
- **22% of NRA expiring within 24 months** — lease-up to 88% must outrun these expiries. Check: tenant renewal intentions.
- **Occupancy at 78%** — breakeven is 67%, so further losses quickly threaten cover. Check: leasing pipeline and recent tours.
- **$18.0M capex for TI/LC and amenities** — may not be enough to re-let a Class B building. Check: TI/LC per sq ft on recent deals.
- **Preferred equity in the stack** — sits ahead of new equity. Check: pref terms, rate and control rights.

### Questions for the broker
1. What happens if the loan is not refinanced at maturity?
2. Which tenants make up the 22% expiring, and have renewal talks started?
3. What TI/LC packages have recent leases in the building required?
4. What terms is the sponsor offering on the preferred equity?
5. Would the seller consider a price that reflects a 7%+ going-in yield?

### Data room request
- Rent roll with expiry schedule and renewal options
- Existing loan agreement and any extension terms
- Leasing pipeline and broker tour activity
- Capex budget split between TI/LC and base building
- T-12 operating statement and 2-year budget

### What would change my mind
A price reset that brings the going-in yield close to the exit cap, plus signed renewals on the 22% expiring.`,

  ldn: `### VERDICT: Pursue with conditions — The financing works and cover is strong, but a 7.8% levered IRR depends on keeping the largest tenant past its 2028 break and funding the EPC upgrade.

### The three numbers that matter
- **7.8% levered IRR, 1.40x multiple.** Acceptable for core-plus only if income is secured; at 1% NOI growth it falls to 4.2%.
- **+61 bps leverage spread, 2.22x DSCR.** Positive leverage and strong cover; debt is not the constraint.
- **Exit cap 6.25% (+4 bps vs entry).** Little cushion if City office yields move out by exit.

### Red flags
- **18% of income on a 2028 break** — falls inside the hold. Check: break terms, notice dates and tenant intentions.
- **EPC C, B required by 2030 under MEES** — unfunded compliance capex would hit returns. Check: whether the £6.0M budget covers it.
- **Two vacant floors to re-let at Grade A** — leasing risk on top of the refurbishment. Check: refurbishment cost per sq ft and target rents.
- **Rent reviews on three leases in 2027** — could add or disappoint. Check: passing rents against evidence of market rent.

### Questions for the broker
1. Has the largest tenant signalled whether it will break in 2028?
2. What would it take to remove the break or extend the lease?
3. What is the estimated cost to reach EPC B?
4. What are passing rents on the three 2027 reviews?
5. Has any pre-letting interest been shown in the two vacant floors?

### Data room request
- Tenancy schedule with breaks, reviews and expiries
- Current EPCs and an EPC B upgrade cost plan
- Refurbishment scope and quantity surveyor estimate for the vacant floors
- Service charge budget and reconciliations
- Leases for the two largest tenants

### What would change my mind
A signed extension removing the 2028 break, with the EPC B works covered by the £6.0M budget, would make this a straightforward pursue.`,
};
