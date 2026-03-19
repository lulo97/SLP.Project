namespace backend_dotnet.Features.Dashboard;

public interface IWordOfTheDayProvider
{
    Task<WordOfTheDayDto> GetWordOfTheDayAsync();
}