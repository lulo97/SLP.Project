using backend_dotnet.Features.Dashboard;

public class StaticWordOfTheDayProvider : IWordOfTheDayProvider
{
    private static readonly List<WordOfTheDayDto> _words = new()
    {
        new() {
            Word = "perspicacious",
            PartOfSpeech = "adjective",
            VietnameseTranslation = "sắc sảo",
            Example = "She is a perspicacious student.",
            Origin = "From Latin perspicax, from perspicere 'look closely'.",
            FunFact = "First used in English in the 1630s."
        },
        new() {
            Word = "ephemeral",
            PartOfSpeech = "adjective",
            VietnameseTranslation = "phù du, ngắn ngủi",
            Example = "Social media fame is often ephemeral.",
            Origin = "From Greek ephēmeros 'lasting only a day'.",
            FunFact = "Mayflies are called ephemeroptera because of their short lifespan."
        },
        // Add more words as needed...
    };

    public Task<WordOfTheDayDto> GetWordOfTheDayAsync()
    {
        var dayOfYear = DateTime.UtcNow.DayOfYear;
        var index = (dayOfYear - 1) % _words.Count;
        return Task.FromResult(_words[index]);
    }
}