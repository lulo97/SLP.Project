using System;
using System.Collections.Generic;
using System.Text.Json;
using System.Linq;

namespace backend_dotnet.Helpers;

public static class QuestionValidationHelper
{
    public static void ValidateQuestionMetadata(string type, string content, string metadataJson)
    {
        if (string.IsNullOrWhiteSpace(metadataJson))
            throw new ArgumentException($"Metadata is required for question type '{type}'.");

        try
        {
            using JsonDocument doc = JsonDocument.Parse(metadataJson);
            JsonElement root = doc.RootElement;

            switch (type.ToLower())
            {
                case "multiple_choice":
                    ValidateMultipleChoice(root, content);
                    break;
                case "true_false":
                    ValidateTrueFalse(root, content);
                    break;
                case "fill_blank":
                    ValidateFillInBlank(root, content);
                    break;
                case "matching":
                    ValidateMatching(root);
                    break;
                case "ordering":
                    ValidateOrdering(root);
                    break;
                default:
                    throw new ArgumentException($"Unsupported question type: '{type}'.");
            }
        }
        catch (JsonException ex)
        {
            throw new ArgumentException("Invalid JSON format in metadata.", ex);
        }
    }

    // ------------------------------------------------------------------------
    // Private validation methods (copied from original QuestionService)
    // ------------------------------------------------------------------------
    private static void ValidateMultipleChoice(JsonElement root, string content)
    {
        if (string.IsNullOrWhiteSpace(content))
            throw new ArgumentException("Multiple choice question must have content.");

        if (!root.TryGetProperty("options", out JsonElement options) || options.ValueKind != JsonValueKind.Array)
            throw new ArgumentException("Multiple choice question must have an 'options' array.");

        if (options.GetArrayLength() < 2)
            throw new ArgumentException("Multiple choice question must have at least 2 options.");

        var optionIds = new HashSet<string>();
        foreach (JsonElement opt in options.EnumerateArray())
        {
            if (!opt.TryGetProperty("id", out JsonElement idProp) || idProp.ValueKind != JsonValueKind.String)
                throw new ArgumentException("Each option must have a string 'id' field.");

            string id = idProp.GetString()!;
            if (string.IsNullOrWhiteSpace(id))
                throw new ArgumentException("Option 'id' cannot be empty.");

            if (!optionIds.Add(id))
                throw new ArgumentException($"Duplicate option id '{id}' found.");

            if (!opt.TryGetProperty("text", out JsonElement textProp) || textProp.ValueKind != JsonValueKind.String)
                throw new ArgumentException("Each option must have a string 'text' field.");

            if (string.IsNullOrWhiteSpace(textProp.GetString()))
                throw new ArgumentException("Option text cannot be empty.");
        }

        if (!root.TryGetProperty("correctAnswers", out JsonElement correctAnswers) || correctAnswers.ValueKind != JsonValueKind.Array)
            throw new ArgumentException("Multiple choice question must have a 'correctAnswers' array.");

        if (correctAnswers.GetArrayLength() < 1)
            throw new ArgumentException("Multiple choice question must have at least one correct answer.");

        foreach (JsonElement ans in correctAnswers.EnumerateArray())
        {
            if (ans.ValueKind != JsonValueKind.String)
                throw new ArgumentException("Each correct answer must be a string (option id).");

            string ansId = ans.GetString()!;
            if (!optionIds.Contains(ansId))
                throw new ArgumentException($"Correct answer id '{ansId}' does not match any option id.");
        }
    }

    private static void ValidateTrueFalse(JsonElement root, string content)
    {
        if (string.IsNullOrWhiteSpace(content))
            throw new ArgumentException("True/false question must have content.");

        if (!root.TryGetProperty("correctAnswer", out JsonElement ans) ||
            (ans.ValueKind != JsonValueKind.True && ans.ValueKind != JsonValueKind.False))
        {
            throw new ArgumentException("True/false question must have a 'correctAnswer' field with a boolean value (true or false).");
        }
    }

    private static void ValidateFillInBlank(JsonElement root, string content)
    {
        if (string.IsNullOrWhiteSpace(content))
            throw new ArgumentException("Fill-in-the-blank question must have content.");

        if (!root.TryGetProperty("keywords", out JsonElement keywords) || keywords.ValueKind != JsonValueKind.Array)
            throw new ArgumentException("Fill-in-the-blank question must have a 'keywords' array.");

        if (keywords.GetArrayLength() != 1)
            throw new ArgumentException("Fill-in-the-blank question must have exactly one keyword (single word).");

        var keywordElem = keywords[0];
        if (keywordElem.ValueKind != JsonValueKind.String)
            throw new ArgumentException("Keyword must be a string.");

        string keyword = keywordElem.GetString()!;
        if (string.IsNullOrWhiteSpace(keyword))
            throw new ArgumentException("Keyword cannot be empty.");

        if (keyword.Contains(' '))
            throw new ArgumentException("Keyword must be a single word (no spaces).");

        if (!content.Contains(keyword, StringComparison.OrdinalIgnoreCase))
            throw new ArgumentException($"Keyword '{keyword}' must appear in the question content.");
    }

    private static void ValidateMatching(JsonElement root)
    {
        if (!root.TryGetProperty("pairs", out JsonElement pairs) || pairs.ValueKind != JsonValueKind.Array)
            throw new ArgumentException("Matching question must have a 'pairs' array.");

        if (pairs.GetArrayLength() < 2)
            throw new ArgumentException("Matching question must have at least 2 pairs.");

        var pairIds = new HashSet<int>();
        foreach (JsonElement pair in pairs.EnumerateArray())
        {
            if (!pair.TryGetProperty("id", out JsonElement idProp))
                throw new ArgumentException("Each matching pair must have an 'id' field.");

            int id;
            if (idProp.ValueKind == JsonValueKind.Number)
            {
                id = idProp.GetInt32();
            }
            else if (idProp.ValueKind == JsonValueKind.String)
            {
                if (!int.TryParse(idProp.GetString(), out id))
                    throw new ArgumentException("Pair id must be a valid integer.");
            }
            else
            {
                throw new ArgumentException("Pair id must be a number or a numeric string.");
            }

            if (!pairIds.Add(id))
                throw new ArgumentException($"Duplicate pair id '{id}' found.");

            if (!pair.TryGetProperty("left", out JsonElement leftProp) || leftProp.ValueKind != JsonValueKind.String)
                throw new ArgumentException("Each matching pair must have a string 'left' field.");

            if (string.IsNullOrWhiteSpace(leftProp.GetString()))
                throw new ArgumentException("Left side text cannot be empty.");

            if (!pair.TryGetProperty("right", out JsonElement rightProp) || rightProp.ValueKind != JsonValueKind.String)
                throw new ArgumentException("Each matching pair must have a string 'right' field.");

            if (string.IsNullOrWhiteSpace(rightProp.GetString()))
                throw new ArgumentException("Right side text cannot be empty.");
        }
    }

    private static void ValidateOrdering(JsonElement root)
    {
        if (!root.TryGetProperty("items", out JsonElement items) || items.ValueKind != JsonValueKind.Array)
            throw new ArgumentException("Ordering question must have an 'items' array.");

        int count = items.GetArrayLength();
        if (count < 3)
            throw new ArgumentException("Ordering question must have at least 3 items.");

        var orderIds = new HashSet<int>();
        for (int i = 0; i < count; i++)
        {
            JsonElement item = items[i];

            if (!item.TryGetProperty("order_id", out JsonElement orderProp))
                throw new ArgumentException("Each ordering item must have an 'order_id' field.");

            int orderId;
            if (orderProp.ValueKind == JsonValueKind.Number)
            {
                orderId = orderProp.GetInt32();
            }
            else if (orderProp.ValueKind == JsonValueKind.String)
            {
                if (!int.TryParse(orderProp.GetString(), out orderId))
                    throw new ArgumentException("order_id must be a valid integer.");
            }
            else
            {
                throw new ArgumentException("order_id must be a number or a numeric string.");
            }

            if (orderId < 1 || orderId > count)
                throw new ArgumentException($"Order_id must be between 1 and {count}.");

            if (!orderIds.Add(orderId))
                throw new ArgumentException($"Duplicate order_id '{orderId}' found.");

            if (!item.TryGetProperty("text", out JsonElement textProp) || textProp.ValueKind != JsonValueKind.String)
                throw new ArgumentException("Each ordering item must have a string 'text' field.");

            if (string.IsNullOrWhiteSpace(textProp.GetString()))
                throw new ArgumentException("Item text cannot be empty.");
        }

        for (int i = 1; i <= count; i++)
        {
            if (!orderIds.Contains(i))
                throw new ArgumentException($"Missing order_id {i}. Order_ids must be consecutive starting from 1.");
        }
    }
}