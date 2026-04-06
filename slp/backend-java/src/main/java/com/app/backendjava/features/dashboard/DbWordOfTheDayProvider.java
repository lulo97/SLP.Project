package com.app.backendjava.features.dashboard;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;
import java.time.LocalDate;

@Component
@Primary
@RequiredArgsConstructor
public class DbWordOfTheDayProvider implements IWordOfTheDayProvider {

    @PersistenceContext
    private final EntityManager entityManager;

    @Override
    public WordOfTheDayDto getWordOfTheDay() {
        var todayStart = LocalDate.now().atStartOfDay();

        // Try exact match for today
        var query = "SELECT d FROM DailyWord d WHERE d.targetDate = :today";
        DailyWord entity = entityManager.createQuery(query, DailyWord.class)
                .setParameter("today", todayStart)
                .getResultList()
                .stream().findFirst().orElse(null);

        // Fallback to most recent past word
        if (entity == null) {
            query = "SELECT d FROM DailyWord d WHERE d.targetDate <= :today ORDER BY d.targetDate DESC";
            entity = entityManager.createQuery(query, DailyWord.class)
                    .setParameter("today", todayStart)
                    .setMaxResults(1)
                    .getResultList()
                    .stream().findFirst().orElse(null);
        }

        if (entity == null) {
            return WordOfTheDayDto.builder()
                    .word("Welcome!")
                    .vietnameseTranslation("Chào mừng")
                    .example("No word of the day yet. Please add some entries.")
                    .build();
        }

        return WordOfTheDayDto.builder()
                .word(entity.getWord())
                .partOfSpeech(entity.getPartOfSpeech() != null ? entity.getPartOfSpeech() : "")
                .vietnameseTranslation(entity.getVietnameseTranslation() != null ? entity.getVietnameseTranslation() : "")
                .example(entity.getExample() != null ? entity.getExample() : "")
                .origin(entity.getOrigin())
                .funFact(entity.getFunFact())
                .build();
    }
}