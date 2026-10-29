# Decision context and analytical limits

This is a historical pilot for delivery on 1 January–1 February 2026, with the
cutoff on the day before delivery. Inputs remain Elexon WINDFOR and FUELHH `WIND`
only. Research sources below explain the domain; they are not additional
application input data.

## Cutoff times

The default cutoff is 10:00 GMT. It is an illustrative planning point, **not an
exchange requirement or an approved client workflow**. For reference, normal
morning GB hourly orderbook closes are 09:20 GMT (EPEX) and 09:50 (Nord Pool), so
a real workflow may need an earlier cutoff. Confirm the venue and allow for
receiving data and submitting orders. The app offers every whole hour so analysts
can compare vintages without exchange-specific presets.

Primary sources checked 29 October 2026:

- [EPEX February 2025 trading brochure](https://www.epexspot.com/sites/default/files/2025-02/EPEX%20SPOT%20Trading%20Brochure%202025%20February.pdf), p. 5: GB hourly orderbook close 09:20 GMT; results publication is later and is not the bidding deadline.
- [Nord Pool GB product specifications](https://www.nordpoolgroup.com/4ab576/globalassets/download-center/rules-and-regulations/product-specifications-gb-market.pdf), effective 10 July 2023, sections 1.2 and 3.1: UK times, hourly orderbook close 09:50.

## Publication-aware selection

Select the single publication with the greatest `publishTime` at or before the
cutoff, and plot its values for the delivery day. Hours that publication lacks
stay as gaps rather than being filled from older publications. In this snapshot
WINDFOR is published around 02:30, 04:30, 07:30, 09:30, 11:30, 15:30, 18:30 and
22:30 UTC, so neighbouring cutoffs often select the same publication. Cutoffs of
00:00–02:00 select the previous evening's 22:30 publication, which covers only 22
hours of the delivery day. Never fetch an eventual latest forecast and describe it
as a decision-time forecast. Publication timestamps approximate source
availability, not desk receipt.

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
defines average MW over half-hours. Rather than averaging them, each hourly
forecast is compared separately with both half-hours it covers, so intra-hour
variation counts as error. The [WINDFOR schema](https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/WINDFOR)
has hourly target timestamps in this snapshot but does not fully settle whether
these are interval-mean or timestamp-valid values. We treat each value as
applying to its whole starting hour; comparison scores are conditional on that. Publisher
confirmation is still needed, rather than silently introducing interpolation.

Output can reflect curtailment, availability and telemetry as well as weather.
[NESO's February 2026 incentive report](https://www.neso.energy/sites/neso.energy/files/documents/Incentives%20February%202026%20Report.pdf),
p. 33, describes a different, adjusted per-unit forecasting metric with operational
exclusions. This application does not reproduce it or attribute discrepancy causes
from the two aggregates.

## Retrospective scores, not calibrated confidence

### Monthly overview

The monthly page repeats the daily selection rule for each January delivery day
at one cutoff: the single latest publication at or before that time on the
previous day. 1 February is excluded so the month is complete. Month metrics pool
every matched half-hour (1,488 at most) rather than averaging daily figures; RMSE
is computed after pooling squared errors. Daily forecast and actual values on the
line chart are averages over that day's matched half-hours. The time-of-day chart
averages signed error per half-hour slot across the 31 days.

The cutoff comparison reruns the month at each whole-hour cutoff. Cutoffs of
00:00–02:00 select the previous evening's 22:30 publication, which covers only 22
delivery hours, so those points are scored on fewer half-hours. In January the
spread across all cutoffs is about two accuracy points. This is a retrospective
result, not a recommended trading deadline or evidence that one cutoff will
outperform in other months.

### Score definitions and limitations

- Error = forecast minus actual. Positive means overestimated wind, not a benefit.
- MAE is average absolute error in MW; RMSE pools squared half-hourly errors
  before taking the square root. Accuracy is 100% − WAPE: total absolute error
  divided by total actual output for the day. Actual output in this snapshot never
  falls below 1,695 MW, so percentage measures are well defined; WAPE still avoids
  weighting low-output half-hours more heavily than per-interval percentages would.
- Direction is shown by the signed error bars and the too-high/too-low counts,
  not by an average signed error, which can cancel.
- Only matched pairs enter scores. Forecast coverage, actual coverage and matched
  coverage are distinct. Missing values remain null, never zero.
- October-retrieved FUELHH is an operational-outturn snapshot, not a guaranteed
  settlement-final or as-known-in-January archive. Actual publication can be late;
  first-release/correction policy remains unresolved for this pairing.
- No bias correction, risk score, confidence band or prior-error calibration is
  claimed. All scores are hindsight, not information available at the cutoff. Forecast ± MAE is not a prediction interval.
- A later calibration must respect forecast vintages and actual publication/version
  availability at each historical origin, then be evaluated on later untouched
  days. Correlated hourly records are not hundreds of independent weather regimes.
- National wind alone cannot establish procurement quantities, financial exposure
  or savings without customer demand, contracts and other portfolio information.

Statistical reference: Hyndman and Athanasopoulos, [Forecasting: Principles and
Practice, chapter 5](https://otexts.com/fpp3/toolbox.html). Its conventional error
sign is opposite to this application's explicit forecast-minus-actual convention;
absolute and squared scores are unaffected.
