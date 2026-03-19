using backend_dotnet.Data;
using Microsoft.EntityFrameworkCore;

namespace backend_dotnet.Features.Dashboard;

public class DbWordOfTheDayProvider : IWordOfTheDayProvider
{
    private readonly AppDbContext _db;

    public DbWordOfTheDayProvider(AppDbContext db)
    {
        _db = db;
    }

    public async Task<WordOfTheDayDto> GetWordOfTheDayAsync()
    {
        var today = DateTime.UtcNow.Date;

        // Try to get today's word
        var wordEntity = await _db.DailyWords
            .FirstOrDefaultAsync(w => w.TargetDate == today);

        // If none exists for today, fallback to the most recent past word
        if (wordEntity == null)
        {
            wordEntity = await _db.DailyWords
                .Where(w => w.TargetDate <= today)
                .OrderByDescending(w => w.TargetDate)
                .FirstOrDefaultAsync();
        }

        // If still null (table empty), return a friendly placeholder
        if (wordEntity == null)
        {
            return new WordOfTheDayDto
            {
                Word = "Welcome!",
                PartOfSpeech = "",
                VietnameseTranslation = "Chào mừng",
                Example = "No word of the day yet. Please add some entries to the daily_word table.",
                Origin = null,
                FunFact = null
            };
        }

        return new WordOfTheDayDto
        {
            Word = wordEntity.Word,
            PartOfSpeech = wordEntity.PartOfSpeech ?? string.Empty,
            VietnameseTranslation = wordEntity.VietnameseTranslation ?? string.Empty,
            Example = wordEntity.Example ?? string.Empty,
            Origin = wordEntity.Origin,
            FunFact = wordEntity.FunFact
        };
    }
}