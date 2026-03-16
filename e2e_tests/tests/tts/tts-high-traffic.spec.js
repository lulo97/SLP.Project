// tests/tts/tts-high-traffic.spec.js
const { test, expect } = require("@playwright/test");

const BASE_URL              = "http://localhost:8000";
const TEXT                  = "Hello, this is a spike test.";
const TOTAL_REQUESTS        = 300;
const CONCURRENCY           = 100;
const PER_REQUEST_TIMEOUT_MS = 15_000;
const SUCCESS_THRESHOLD     = 5;

test.setTimeout(120_000);

function classifyFailure(status, errorMsg) {
  const msg = (errorMsg || "").toLowerCase();

  if (status === 503)                          return "503_queue_full_or_timeout";
  if (status === 500)                          return "500_internal_error";
  if (status >= 400 && status < 500)           return `4xx_client_error_${status}`;
  if (!status && msg.includes("timeout"))      return "client_timeout";
  if (!status && msg.includes("econnrefused")) return "connection_refused";
  if (!status && msg.includes("econnreset"))   return "connection_reset";
  if (!status && msg.includes("socket hang up")) return "socket_hangup";
  if (!status)                                 return "network_error";
  return `unknown_${status}`;
}

test.describe("TTS Redis queue spike test", () => {
  test("overwhelm Piper and observe Redis queue failures", async ({ request }) => {
    const results    = [];
    let successCount = 0;
    let failCount    = 0;
    const startTime  = Date.now();

    const elapsed  = () => ((Date.now() - startTime) / 1000).toFixed(2);
    const logStats = (prefix = "") => {
      const total       = successCount + failCount;
      const successRate = total > 0 ? ((successCount / total) * 100).toFixed(2) : "0.00";
      console.log(
        `[${elapsed()}s] ${prefix} ` +
        `Total: ${total}, ` +
        `Success: ${successCount} (${successRate}%), ` +
        `Fail: ${failCount}`
      );
    };

    const progressInterval = setInterval(() => logStats("Progress:"), 1000);

    const runRequest = async (requestId) => {
      const url      = `${BASE_URL}/tts?text=${encodeURIComponent(TEXT)}`;
      const reqStart = Date.now();

      try {
        const response = await request.get(url, { timeout: PER_REQUEST_TIMEOUT_MS });
        const status   = response.status();
        const duration = Date.now() - reqStart;

        if (!response.ok()) {
          failCount++;
          results.push({ success: false, status, reason: classifyFailure(status, null), time: duration, requestId });
          return;
        }

        await response.body();
        successCount++;
        results.push({ success: true, status, time: duration, requestId });

      } catch (error) {
        failCount++;
        const duration = Date.now() - reqStart;
        results.push({
          success: false,
          status : null,
          reason : classifyFailure(null, error.message),
          error  : error.message,
          time   : duration,
          requestId,
        });
      }
    };

    for (let i = 0; i < TOTAL_REQUESTS; i += CONCURRENCY) {
      const batchSize   = Math.min(CONCURRENCY, TOTAL_REQUESTS - i);
      const batchNumber = i / CONCURRENCY + 1;
      console.log(`\n--- Batch ${batchNumber}: requests ${i + 1}–${i + batchSize} starting at ${elapsed()}s ---`);

      await Promise.all(
        Array.from({ length: batchSize }, (_, j) => runRequest(i + j + 1))
      );
      logStats(`Batch ${batchNumber} completed.`);
    }

    clearInterval(progressInterval);

    const totalTime  = (Date.now() - startTime) / 1000;
    const finalTotal = successCount + failCount;
    const finalRate  = (successCount / finalTotal) * 100;
    const avgTime    = results.reduce((a, r) => a + r.time, 0) / results.length;

    const reasonCounts = {};
    results
      .filter(r => !r.success)
      .forEach(r => { reasonCounts[r.reason] = (reasonCounts[r.reason] || 0) + 1; });

    const timeouts = reasonCounts["client_timeout"]           || 0;
    const fast503s = reasonCounts["503_queue_full_or_timeout"] || 0;

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
          console.log(`  ${reason.padEnd(35)} ${count} (${pct}% of failures)`);
        });

      console.log("\n── First 10 failures ──");
      results
        .filter(r => !r.success)
        .slice(0, 10)
        .forEach((f, idx) => {
          console.log(
            `  ${idx + 1}. req#${f.requestId}: reason=${f.reason}, ` +
            `status=${f.status ?? "none"}, time=${f.time}ms`
          );
        });
    }

    // ── Assertions ────────────────────────────────────────────────────────────
    // 1. Piper is alive — some requests got through
    expect(successCount).toBeGreaterThan(0);

    // 2. Under spike, failures must exist
    expect(failCount).toBeGreaterThan(0);

    // 3. Redis queue must produce fast 503s (not silent hangs)
    expect(fast503s).toBeGreaterThan(0);

    // 4. KEY: with Redis queue, client timeouts should be rare or zero
    //    because the server rejects overload fast instead of silently hanging
    expect(timeouts).toBeLessThan(fast503s);

    // 5. Overall floor — some traffic must succeed
    expect(finalRate).toBeGreaterThanOrEqual(SUCCESS_THRESHOLD);
  });
});