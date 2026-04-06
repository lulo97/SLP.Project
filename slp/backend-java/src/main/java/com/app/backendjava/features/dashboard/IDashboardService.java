package com.app.backendjava.features.dashboard;

import java.util.List;

public interface IDashboardService {
    WordOfTheDayDto getWordOfTheDay();
    List<TopQuizDto> getTopQuizzes(int limit);
    UserStatsDto getUserStats(int userId);
}