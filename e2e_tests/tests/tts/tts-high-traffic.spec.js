// tests/tts/tts-high-traffic.spec.js
const { test, expect } = require("@playwright/test");

const BASE_URL       = "http://localhost:8000";
const TEXT           = "Hello, this is a spike test.";
const TOTAL_REQUESTS = 300;
const CONCURRENCY    = 100;   // hammer all at once to overwhelm Piper
const PER_REQUEST_TIMEOUT_MS = 15_000; // realistic TTS deadline

// What counts as "naturally failing under load" — we EXPECT most to fail
const SUCCESS_THRESHOLD = 5;   // just prove some got through; most should fail

test.setTimeout(120_000);

// ─── Classify why a request failed ──────────────────────────────────────────
function classifyFailure(status, errorMsg) {
  const msg = (errorMsg || "").toLowerCase(); // ← normalise case once

  if (status === 503)                    return "503_service_unavailable";
  if (status === 500)                    return "500_internal_error";
  if (status >= 400 && status < 500)     return `4xx_client_error_${status}`;
  if (!status && msg.includes("timeout"))         return "client_timeout";        // ← was missing capital T
  if (!status && msg.includes("econnrefused"))    return "connection_refused";
  if (!status && msg.includes("econnreset"))      return "connection_reset";
  if (!status && msg.includes("socket hang up"))  return "socket_hangup";        // ← new: uvicorn drops socket
  if (!status)                           return "network_error";
  return `unknown_${status}`;
}

test.describe("TTS natural spike test (no queue, no retry)", () => {
  test("overwhelm Piper and observe natural failures", async ({ request }) => {
    const results    = [];
    let successCount = 0;
    let failCount    = 0;
    const startTime  = Date.now();

    const elapsed   = () => ((Date.now() - startTime) / 1000).toFixed(2);
    const logStats  = (prefix = "") => {
      const total       = successCount + failCount;
      const successRate = total > 0 ? ((successCount / total) * 100).toFixed(2) : "0.00";
      console.log(
        `[${elapsed()}s] ${prefix} ` +
        `Total: ${total}, Success: ${successCount} (${successRate}%), Fail: ${failCount}`
      );
    };

    const progressInterval = setInterval(() => logStats("Progress:"), 1000);

    // ─── Single request — no retry, no mercy ────────────────────────────────
    const runRequest = async (requestId) => {
      const url      = `${BASE_URL}/tts?text=${encodeURIComponent(TEXT)}`;
      const reqStart = Date.now();

      try {
        const response = await request.get(url, { timeout: PER_REQUEST_TIMEOUT_MS });
        const status   = response.status();
        const duration = Date.now() - reqStart;

        if (!response.ok()) {
          failCount++;
          const result = {
            success : false,
            status,
            reason  : classifyFailure(status, null),
            time    : duration,
            requestId,
          };
          results.push(result);
          return result;
        }

        await response.body(); // fully consume stream
        successCount++;
        const result = { success: true, status, time: duration, requestId };
        results.push(result);
        return result;

      } catch (error) {
        failCount++;
        const duration = Date.now() - reqStart;
        const result   = {
          success : false,
          status  : null,
          reason  : classifyFailure(null, error.message),
          error   : error.message,
          time    : duration,
          requestId,
        };
        results.push(result);
        return result;
      }
    };

    // ─── Fire in batches ─────────────────────────────────────────────────────
    for (let i = 0; i < TOTAL_REQUESTS; i += CONCURRENCY) {
      const batchSize   = Math.min(CONCURRENCY, TOTAL_REQUESTS - i);
      const batchNumber = i / CONCURRENCY + 1;
      console.log(
        `\n--- Batch ${batchNumber}: requests ${i + 1}–${i + batchSize} ` +
        `starting at ${elapsed()}s ---`
      );

      const batch = [];
      for (let j = 0; j < batchSize; j++) {
        batch.push(runRequest(i + j + 1));
      }
      await Promise.all(batch);
      logStats(`Batch ${batchNumber} completed.`);
    }

    clearInterval(progressInterval);

    // ─── Summary ─────────────────────────────────────────────────────────────
    const totalTime      = (Date.now() - startTime) / 1000;
    const finalTotal     = successCount + failCount;
    const finalRate      = (successCount / finalTotal) * 100;
    const avgTime        = results.reduce((a, r) => a + r.time, 0) / results.length;

    // Tally failure reasons
    const reasonCounts = {};
    results
      .filter(r => !r.success)
      .forEach(r => {
        reasonCounts[r.reason] = (reasonCounts[r.reason] || 0) + 1;
      });

    console.log("\n=== SPIKE TEST SUMMARY ===");
    console.log(`Total requests   : ${finalTotal}`);
    console.log(`Succeeded        : ${successCount} (${finalRate.toFixed(2)}%)`);
    console.log(`Failed           : ${failCount} (${(100 - finalRate).toFixed(2)}%)`);
    console.log(`Total time       : ${totalTime.toFixed(2)} s`);
    console.log(`Avg response time: ${avgTime.toFixed(0)} ms`);

    if (failCount > 0) {
      console.log("\n── Failure breakdown ──");
      Object.entries(reasonCounts)
        .sort((a, b) => b[1] - a[1])
        .forEach(([reason, count]) => {
          const pct = ((count / failCount) * 100).toFixed(1);
          console.log(`  ${reason.padEnd(30)} ${count} (${pct}% of failures)`);
        });

      console.log("\n── First 10 failures ──");
      results
        .filter(r => !r.success)
        .slice(0, 10)
        .forEach((f, idx) => {
          console.log(
            `  ${idx + 1}. req#${f.requestId}: ` +
            `reason=${f.reason}, status=${f.status ?? "none"}, ` +
            `time=${f.time}ms` +
            (f.error ? `, err="${f.error.slice(0, 80)}"` : "")
          );
        });
    }

    // ─── Assertions ──────────────────────────────────────────────────────────
    // 1. At least SOME requests succeeded (Piper is alive)
    expect(successCount).toBeGreaterThan(0);

    // 2. Under spike, MOST requests should fail (proves no hidden queue)
    expect(failCount).toBeGreaterThan(successCount);

    // 3. Overall success rate stays within the expected low band
    expect(finalRate).toBeGreaterThanOrEqual(SUCCESS_THRESHOLD);

    // 4. All failures must be classifiable (no silent hangs swallowed as success)
    const unclassified = results.filter(r => !r.success && !r.reason);
    expect(unclassified.length).toBe(0);
  });
});