package com.app.backendjava.features.dashboard;

import com.app.backendjava.features.quiz.QuizRepository; // Assumed existing
import com.app.backendjava.features.user.UserRepository; // Assumed existing
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
@RequiredArgsConstructor
public class DashboardService implements IDashboardService {

    private final QuizRepository quizRepository;
    private final UserRepository userRepository;
    private final IWordOfTheDayProvider wordProvider;

    @Override
    public WordOfTheDayDto getWordOfTheDay() {
        return wordProvider.getWordOfTheDay();
    }

    @Override
    public List<TopQuizDto> getTopQuizzes(int limit) {
        return quizRepository.getTopQuizzesByAttemptsAsync(limit);
    }

    @Override
    public UserStatsDto getUserStats(int userId) {
        return userRepository.getUserStatsAsync(userId);
    }
}