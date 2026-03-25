using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;

namespace backend_dotnet.Features.Question;

/// <summary>
/// Validates a question snapshot against the canonical schema.
/// No legacy field aliases are accepted — all field names are strict.
/// See QUESTION_SCHEMA.md for the full specification.
/// </summary>
public static class QuestionValidationHelper
{
    private static readonly HashSet<string> SupportedTypes = new()
    {
        "multiple_choice",
        "single_choice",
        "true_false",
        "fill_blank",
        "ordering",
        "matching",
        "flashcard",
    };

    /// <summary>
    /// Validates the full snapshot JSON string.
    /// Throws <see cref="ArgumentException"/> with a descriptive message on any violation.
    /// </summary>
    public static void ValidateSnapshot(string snapshotJson)
    {
        JsonElement root;
        try
        {
            root = JsonDocument.Parse(snapshotJson).RootElement;
        }
        catch (JsonException ex)
        {
            throw new ArgumentException("Question snapshot is not valid JSON.", ex);
        }

        // ── type ────────────────────────────────────────────────────────────
        if (!root.TryGetProperty("type", out var typeEl) || typeEl.ValueKind != JsonValueKind.String)
            throw new ArgumentException("Question snapshot must contain a string 'type' field.");

        var type = typeEl.GetString()!;
        if (!SupportedTypes.Contains(type))
            throw new ArgumentException(
                $"Unsupported question type: '{type}'. " +
                $"Supported types: {string.Join(", ", SupportedTypes)}.");

        // ── content ─────────────────────────────────────────────────────────
        if (!root.TryGetProperty("content", out var contentEl) || contentEl.ValueKind != JsonValueKind.String)
            throw new ArgumentException("Question snapshot must contain a string 'content' field.");

        var content = contentEl.GetString()!;
        if (string.IsNullOrWhiteSpace(content))
            throw new ArgumentException("Question snapshot 'content' must not be empty.");

        // ── metadata ────────────────────────────────────────────────────────
        if (!root.TryGetProperty("metadata", out var metaEl) || metaEl.ValueKind != JsonValueKind.Object)
            throw new ArgumentException("Question snapshot must contain a 'metadata' object.");

        // ── type-specific validation ─────────────────────────────────────────
        switch (type)
        {
            case "multiple_choice": ValidateMultipleChoice(metaEl); break;
            case "single_choice": ValidateSingleChoice(metaEl); break;
            case "true_false": ValidateTrueFalse(metaEl); break;
            case "fill_blank": ValidateFillBlank(metaEl, content); break;
            case "ordering": ValidateOrdering(metaEl); break;
            case "matching": ValidateMatching(metaEl); break;
            case "flashcard": ValidateFlashcard(metaEl); break;
        }
    }

    // Kept for backward-compat call sites that pass type+content+metadataJson separately.
    public static void ValidateQuestionMetadata(string type, string content, string? metadataJson)
    {
        // Re-assemble a minimal snapshot and delegate to the unified validator.
        var assembled = metadataJson == null || metadataJson == "null"
            ? $@"{{""type"":""{type}"",""content"":""{EscapeJson(content)}"",""metadata"":""{{}}""}}"
            : $@"{{""type"":""{type}"",""content"":""{EscapeJson(content)}"",""metadata"":{metadataJson}}}";

        ValidateSnapshot(assembled);
    }

    // ── Validators ────────────────────────────────────────────────────────────

    private static void ValidateMultipleChoice(JsonElement meta)
    {
        var options = RequireNonEmptyArray(meta, "options", "Multiple choice");
        var optionIds = ValidateOptions(options, "Multiple choice");

        var correctAnswers = RequireNonEmptyArray(meta, "correctAnswers", "Multiple choice");
        ValidateAnswerIdsExist(correctAnswers, optionIds, "correctAnswers", "Multiple choice");
    }

    private static void ValidateSingleChoice(JsonElement meta)
    {
        var options = RequireNonEmptyArray(meta, "options", "Single choice");
        var optionIds = ValidateOptions(options, "Single choice");

        var correctAnswers = RequireNonEmptyArray(meta, "correctAnswers", "Single choice");
        if (correctAnswers.Count != 1)
            throw new ArgumentException("Single choice question 'correctAnswers' must contain exactly one id.");

        ValidateAnswerIdsExist(correctAnswers, optionIds, "correctAnswers", "Single choice");
    }

    private static void ValidateTrueFalse(JsonElement meta)
    {
        if (!meta.TryGetProperty("correctAnswer", out var el) ||
            (el.ValueKind != JsonValueKind.True && el.ValueKind != JsonValueKind.False))
            throw new ArgumentException(
                "True/false question must have a boolean 'correctAnswer' field.");
    }

    private static void ValidateFillBlank(JsonElement meta, string content)
    {
        // keywords — words to blank out in display; must appear in content
        var keywords = RequireNonEmptyStringArray(meta, "keywords", "Fill blank");
        foreach (var kw in keywords)
        {
            if (!content.Contains(kw, StringComparison.OrdinalIgnoreCase))
                throw new ArgumentException(
                    $"Fill blank 'keywords' entry \"{kw}\" was not found in the question content.");
        }

        // answers — grading values; must be a non-empty string array
        //RequireNonEmptyStringArray(meta, "answers", "Fill blank");
    }

    private static void ValidateOrdering(JsonElement meta)
    {
        if (!meta.TryGetProperty("items", out var itemsEl) || itemsEl.ValueKind != JsonValueKind.Array)
            throw new ArgumentException("Ordering question must have an 'items' array.");

        var items = itemsEl.EnumerateArray().ToList();
        if (items.Count == 0)
            throw new ArgumentException("Ordering question 'items' must not be empty.");

        var orderIds = new HashSet<int>();
        foreach (var (item, idx) in items.Select((x, i) => (x, i)))
        {
            if (item.ValueKind != JsonValueKind.Object)
                throw new ArgumentException($"Ordering 'items[{idx}]' must be an object.");

            if (!item.TryGetProperty("order_id", out var orderIdEl) ||
                orderIdEl.ValueKind != JsonValueKind.Number ||
                !orderIdEl.TryGetInt32(out var orderId) || orderId < 1)
                throw new ArgumentException(
                    $"Ordering 'items[{idx}]' must have an integer 'order_id' ≥ 1.");

            if (!orderIds.Add(orderId))
                throw new ArgumentException(
                    $"Ordering 'items' contains duplicate order_id: {orderId}.");

            if (!item.TryGetProperty("text", out var textEl) || textEl.ValueKind != JsonValueKind.String ||
                string.IsNullOrWhiteSpace(textEl.GetString()))
                throw new ArgumentException($"Ordering 'items[{idx}]' must have a non-empty string 'text'.");
        }
    }

    private static void ValidateMatching(JsonElement meta)
    {
        if (!meta.TryGetProperty("pairs", out var pairsEl) || pairsEl.ValueKind != JsonValueKind.Array)
            throw new ArgumentException("Matching question must have a 'pairs' array.");

        var pairs = pairsEl.EnumerateArray().ToList();
        if (pairs.Count == 0)
            throw new ArgumentException("Matching question 'pairs' must not be empty.");

        var ids = new HashSet<int>();
        foreach (var (pair, idx) in pairs.Select((x, i) => (x, i)))
        {
            if (pair.ValueKind != JsonValueKind.Object)
                throw new ArgumentException($"Matching 'pairs[{idx}]' must be an object.");

            if (!pair.TryGetProperty("id", out var idEl) ||
                idEl.ValueKind != JsonValueKind.Number ||
                !idEl.TryGetInt32(out var id) || id < 1)
                throw new ArgumentException(
                    $"Matching 'pairs[{idx}]' must have an integer 'id' ≥ 1.");

            if (!ids.Add(id))
                throw new ArgumentException(
                    $"Matching 'pairs' contains duplicate id: {id}.");

            foreach (var field in new[] { "left", "right" })
            {
                if (!pair.TryGetProperty(field, out var fieldEl) ||
                    fieldEl.ValueKind != JsonValueKind.String ||
                    string.IsNullOrWhiteSpace(fieldEl.GetString()))
                    throw new ArgumentException(
                        $"Matching 'pairs[{idx}]' must have a non-empty string '{field}'.");
            }
        }
    }

    private static void ValidateFlashcard(JsonElement meta)
    {
        foreach (var field in new[] { "front", "back" })
        {
            if (!meta.TryGetProperty(field, out var el) ||
                el.ValueKind != JsonValueKind.String ||
                string.IsNullOrWhiteSpace(el.GetString()))
                throw new ArgumentException(
                    $"Flashcard must have a non-empty string '{field}' in metadata.");
        }
    }

    // ── Shared helpers ────────────────────────────────────────────────────────

    private static List<JsonElement> RequireNonEmptyArray(JsonElement meta, string field, string label)
    {
        if (!meta.TryGetProperty(field, out var el) || el.ValueKind != JsonValueKind.Array)
            throw new ArgumentException($"{label} question must have a '{field}' array.");

        var list = el.EnumerateArray().ToList();
        if (list.Count == 0)
            throw new ArgumentException($"{label} question '{field}' must not be empty.");

        return list;
    }

    /// <summary>Validates options shape and returns the set of option ids.</summary>
    private static HashSet<string> ValidateOptions(List<JsonElement> options, string label)
    {
        var ids = new HashSet<string>();
        foreach (var (opt, idx) in options.Select((x, i) => (x, i)))
        {
            if (opt.ValueKind != JsonValueKind.Object)
                throw new ArgumentException($"{label} 'options[{idx}]' must be an object.");

            if (!opt.TryGetProperty("id", out var idEl) || idEl.ValueKind != JsonValueKind.String ||
                string.IsNullOrWhiteSpace(idEl.GetString()))
                throw new ArgumentException(
                    $"{label} 'options[{idx}]' must have a non-empty string 'id' field.");

            var id = idEl.GetString()!;
            if (!ids.Add(id))
                throw new ArgumentException($"{label} 'options' contains duplicate id: \"{id}\".");

            if (!opt.TryGetProperty("text", out var textEl) || textEl.ValueKind != JsonValueKind.String ||
                string.IsNullOrWhiteSpace(textEl.GetString()))
                throw new ArgumentException(
                    $"{label} 'options[{idx}]' must have a non-empty string 'text' field.");
        }
        return ids;
    }

    private static void ValidateAnswerIdsExist(
        List<JsonElement> correctAnswers,
        HashSet<string> optionIds,
        string field,
        string label)
    {
        foreach (var (el, idx) in correctAnswers.Select((x, i) => (x, i)))
        {
            if (el.ValueKind != JsonValueKind.String || string.IsNullOrWhiteSpace(el.GetString()))
                throw new ArgumentException(
                    $"{label} '{field}[{idx}]' must be a non-empty string.");

            var id = el.GetString()!;
            if (!optionIds.Contains(id))
                throw new ArgumentException(
                    $"{label} '{field}' references id \"{id}\" which does not exist in 'options'.");
        }
    }

    private static List<string> RequireNonEmptyStringArray(JsonElement meta, string field, string label)
    {
        if (!meta.TryGetProperty(field, out var el) || el.ValueKind != JsonValueKind.Array)
            throw new ArgumentException($"{label} question must have a '{field}' array.");

        var list = el.EnumerateArray().ToList();
        if (list.Count == 0)
            throw new ArgumentException($"{label} question '{field}' must not be empty.");

        var result = new List<string>();
        foreach (var (item, idx) in list.Select((x, i) => (x, i)))
        {
            if (item.ValueKind != JsonValueKind.String || string.IsNullOrWhiteSpace(item.GetString()))
                throw new ArgumentException(
                    $"{label} '{field}[{idx}]' must be a non-empty string.");
            result.Add(item.GetString()!);
        }
        return result;
    }

    private static string EscapeJson(string s) =>
        s.Replace("\\", "\\\\").Replace("\"", "\\\"");
}