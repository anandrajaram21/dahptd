# Decision context and analytical limits

This is a historical pilot for decisions dated 1–31 January 2026, for delivery on
2 January–1 February. Inputs remain Elexon WINDFOR and FUELHH `WIND` only. Research
sources below explain the domain; they are not additional application input data.

## Example planning scenarios

| Scenario | Illustrative planning time | Normal morning orderbook close |
| --- | --- | --- |
| Nord Pool GB hourly | 09:45 GMT | 09:50 GMT |
| EPEX GB hourly | 09:15 GMT | 09:20 GMT |

The five-minute buffers are product examples, **not exchange requirements or an
approved client workflow**. Confirm the venue and allow for receiving data and
submitting orders. These normal schedules are supported by dated product rules;
we have not audited every exceptional reopening during January. Afternoon
half-hourly products have different deadlines and are not implied by these presets.
Custom research times need not be pre-auction times.

Primary sources checked 29 October 2026:

- [EPEX February 2025 trading brochure](https://www.epexspot.com/sites/default/files/2025-02/EPEX%20SPOT%20Trading%20Brochure%202025%20February.pdf), p. 5: GB hourly orderbook close 09:20 GMT; results publication is later and is not the bidding deadline.
- [Nord Pool GB product specifications](https://www.nordpoolgroup.com/4ab576/globalassets/download-center/rules-and-regulations/product-specifications-gb-market.pdf), effective 10 July 2023, sections 1.2 and 3.1: UK times, hourly orderbook close 09:50.

The original 10:00 illustrative cutoff falls after both morning closes. In this
snapshot, all 744 delivery hours select a 07:30 publication with the EPEX planning
preset, and a 09:30 publication with the Nord Pool preset. The backend tests assert
this observed historical distinction; it is not a guarantee of future schedules.

## Publication-aware selection

For each target, select the greatest source `publishTime` at or before the chosen
decision time, independently per target. Keep gaps and mixed vintages explicit.
Never fetch an eventual latest forecast and describe it as a January decision-time
forecast. Publication timestamps approximate source availability, not desk receipt.

Elexon's current advertised update schedule conflicts with observed January UTC
timestamps. Preserve original timestamps rather than adding an assumed one-hour
correction. For example, the original January 15 messages confirm 07:30 and 09:30:

- [Original 07:30 WINDFOR message](https://archive.data.elexon.co.uk/iris-archive/data/WINDFOR/WINDFOR_202601150730_29608.json)
- [Original 09:30 WINDFOR message](https://archive.data.elexon.co.uk/iris-archive/data/WINDFOR/WINDFOR_202601150930_29609.json)
- [Elexon platform/timeliness guidance](https://github.com/elexon-data/insights-docs/blob/main/docs/insights_data_platform.md)
- [Original-message archive documentation](https://github.com/elexon-data/insights-docs/blob/main/docs/iris_archive.md)

## Population and interval assumptions

[Elexon's wind overview](https://bmrs.elexon.co.uk/wind-generation) describes
operational-metered wind visible to the system operator and intentionally compares
the forecast with fuel-type outturn. [Its generation report](https://bmrs.elexon.co.uk/generation-by-fuel-type)
excludes embedded generation and wind without operational meters. Neither series
should be called all UK wind or a utility's own portfolio. Exact January unit
membership equivalence remains unverified; do not assume a mismatch explains bias.

The [FUELHH specification](https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/FUELHH)
defines average MW over half-hours. Averaging the two complete half-hours gives
hourly mean actual MW, not interpolation. The [WINDFOR schema](https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/WINDFOR)
has hourly target timestamps in this snapshot but does not fully settle whether
these are interval-mean or timestamp-valid values. We retain the explicit
starting-hour mean assumption; comparison scores are conditional on it. Publisher
confirmation is still needed, rather than silently introducing interpolation.

Output can reflect curtailment, availability and telemetry as well as weather.
[NESO's February 2026 incentive report](https://www.neso.energy/sites/neso.energy/files/documents/Incentives%20February%202026%20Report.pdf),
p. 33, describes a different, adjusted per-unit forecasting metric with operational
exclusions. This application does not reproduce it or attribute discrepancy causes
from the two aggregates.

## Retrospective scores, not calibrated confidence

- Error = forecast minus actual. Positive means overestimated wind, not a benefit.
- MAE is average absolute error in MW; bias is average signed error; RMSE pools
  squared hourly errors before taking the square root. Bias can cancel.
- Only matched pairs enter scores. Forecast coverage, actual coverage and matched
  coverage are distinct. Missing values remain null, never zero.
- October-retrieved FUELHH is an operational-outturn snapshot, not a guaranteed
  settlement-final or as-known-in-January archive. Actual publication can be late;
  first-release/correction policy remains unresolved for this pairing.
- No bias correction, risk score, confidence band or prior-error calibration is
  claimed. Full-January scores are hindsight, not information available on early
  January decision dates. Forecast ± MAE is not a prediction interval.
- A later calibration must respect forecast vintages and actual publication/version
  availability at each historical origin, then be evaluated on later untouched
  days. Correlated hourly records are not hundreds of independent weather regimes.
- National wind alone cannot establish procurement quantities, financial exposure
  or savings without customer demand, contracts and other portfolio information.

Statistical reference: Hyndman and Athanasopoulos, [Forecasting: Principles and
Practice, chapter 5](https://otexts.com/fpp3/toolbox.html). Its conventional error
sign is opposite to this application's explicit forecast-minus-actual convention;
absolute and squared scores are unaffected.
