package com.app.backendjava.features.dashboard;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/Dashboard")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class DashboardController {

    private final IDashboardService dashboardService;

    @GetMapping("/word-of-the-day")
    public ResponseEntity<WordOfTheDayDto> getWordOfTheDay() {
        return ResponseEntity.ok(dashboardService.getWordOfTheDay());
    }

    @GetMapping("/top-quizzes")
    public ResponseEntity<List<TopQuizDto>> getTopQuizzes(@RequestParam(defaultValue = "5") int limit) {
        int finalLimit = (limit < 1 || limit > 20) ? 5 : limit;
        return ResponseEntity.ok(dashboardService.getTopQuizzes(finalLimit));
    }

    @GetMapping("/user-stats")
    public ResponseEntity<UserStatsDto> getUserStats(Authentication authentication) {
        try {
            int userId = Integer.parseInt(authentication.getName());
            return ResponseEntity.ok(dashboardService.getUserStats(userId));
        } catch (NumberFormatException e) {
            return ResponseEntity.status(401).build();
        }
    }
}