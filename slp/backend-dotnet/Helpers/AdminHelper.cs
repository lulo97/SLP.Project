namespace backend_dotnet.Helpers;

public static class AdminHelper
{
    public static bool IsAdmin(int userId)
    {
        return userId == 1; // Hardcoded admin ID
    }
}