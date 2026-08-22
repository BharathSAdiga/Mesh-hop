# RescuENet Behavioral AI & Collective Consensus Methodology

---

## 1. Why Behavioral AI?

During acute disaster events (earthquakes, structural collapses, explosions, mass panics):
- Victims may be unconscious, pinned under rubble, or experiencing shock, rendering manual button pressing impossible.
- Commodity smartphone inertial sensors (accelerometer, gyroscope) and acoustic microphones exhibit unmistakable, extreme kinematic signatures when subjected to violent seismic shock, free-fall rubble collapse, or crowd surges.
- By processing these kinematics **on-device in real time**, RescuENet can flag candidate anomalies autonomously without requiring constant internet access.

---

## 2. Why Collective Behavior? (The Multi-Node Imperative)

**A single device anomaly must NEVER automatically declare a confirmed disaster.**

- Dropping a phone on concrete, running down stairs, or slamming a car door generates high-G acceleration spikes identical to an isolated impact.
- RescuENet solves this fundamental false-positive challenge through **Collective Behavioral Consensus**:
  - A disaster affects an entire geographic sector simultaneously.
  - Multiple independent devices within close spatial and temporal proximity must observe correlated anomalies before an event is elevated from `CANDIDATE` to `CONFIRMED`.

---

## 3. Mathematical Feature Extraction (Edge Only)

To protect user privacy and minimize bandwidth, raw sensor streams are never uploaded. Only mathematical summary statistics (`FeatureSummary`) are extracted locally:

- **Peak Acceleration Magnitude ($g_{\text{max}}$):** Maximum resultant Euclidean norm of $(a_x, a_y, a_z)$.
- **Kinematic Variance ($\sigma^2$):** Motion energy dispersion over the sliding window.
- **Jerk Rate ($\frac{da}{dt}$):** Rate of change of acceleration indicating violent shockwaves.
- **Spectral Peak Frequency ($f_{\text{peak}}$):** Dominant oscillation frequency (e.g., low-frequency seismic vs high-frequency impact).
- **Acoustic Decibel Peak ($\text{dB}_{\text{peak}}$):** Maximum ambient noise level.

---

## 4. Anomaly Scoring Model

The edge anomaly detector computes deviation scores against a sliding baseline:
$$Z = \frac{|x_{\text{observed}} - \mu_{\text{baseline}}|}{\sigma_{\text{baseline}}}$$
$$\text{Anomaly Score} = \min\left(1.0, \; \frac{1}{1 + e^{-k(Z - Z_0)}}\right)$$

- Threshold: Observations with $\text{Anomaly Score} \ge 0.70$ enter the consensus pipeline as `CANDIDATE` events.

---

## 5. Collective Consensus Formula

When multiple candidate observations arrive within a sliding window ($\Delta t \le 30\,\text{s}$, $\Delta d \le 500\,\text{m}$), the consensus engine computes:

$$\text{Consensus Score} = 0.30 \cdot S_{\text{beh}} + 0.25 \cdot S_{\text{temp}} + 0.25 \cdot S_{\text{spat}} + 0.20 \cdot S_{\text{event}}$$

Where:
- $S_{\text{beh}}$ = Similarity of mathematical feature summaries across observing nodes.
- $S_{\text{temp}}$ = Temporal correlation ($\Delta t$ proximity).
- $S_{\text{spat}}$ = Spatial proximity based on GPS distance or mesh relay hops.
- $S_{\text{event}}$ = Agreement on classified event type.

### Consensus Status Progression
1. **`CANDIDATE`:** Single node observation ($\text{Score} \ge 0.70$).
2. **`CORRELATED`:** 2 nodes corroborated ($\text{Consensus Score} \ge 0.75$).
3. **`CONFIRMED`:** $\ge 3$ nodes corroborated ($\text{Consensus Score} \ge 0.85$).

---

## 6. Critical Disclaimer: NOT A Medical Diagnosis Tool

> [!WARNING]
> **RescuENet is exclusively a disaster-management behavioral anomaly detection platform.**
> - It does **NOT** monitor, detect, or claim to diagnose medical conditions, heart attacks, cardiac arrest, strokes, or illnesses.
> - It is designed solely to detect physical kinetic shocks and crowd motion patterns associated with structural hazards and natural catastrophes.
> - Manual SOS always bypasses consensus and triggers immediate emergency broadcasts.
